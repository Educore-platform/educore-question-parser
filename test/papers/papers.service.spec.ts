jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { unlink } from 'fs/promises';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
  DataSource,
  QueryFailedError,
} from 'typeorm';
import { PapersService } from '../../src/papers/papers.service';
import { ExamPaper } from '../../src/model/entities/exam-paper.entity';
import { ExamQuestion } from '../../src/model/entities/exam-question.entity';
import { ExamType } from '../../src/model/entities/exam-type.entity';
import { Subject } from '../../src/model/entities/subject.entity';
import { DocumentsService } from '../../src/documents/documents.service';
import { ExamPaperStatus } from '../../src/model/entities/enums';
import { QUEUE_NAMES } from '../../src/shared/queues/queue-names';
import { GetPaperQuestionsQueryDto } from '../../src/papers/dto/pagination-query.dto';

describe('PapersService', () => {
  let service: PapersService;
  let paperRepo: jest.Mocked<Pick<Repository<ExamPaper>, 'save' | 'findOne'>>;
  let questionRepo: jest.Mocked<
    Pick<Repository<ExamQuestion>, 'createQueryBuilder'>
  >;
  let extractionQueue: { add: jest.Mock };
  let examTypeRepo: jest.Mocked<Pick<Repository<ExamType>, 'existsBy'>>;
  let subjectRepo: jest.Mocked<Pick<Repository<Subject>, 'existsBy'>>;
  let dataSource: { transaction: jest.Mock };
  let documentsService: jest.Mocked<
    Pick<DocumentsService, 'hashFile' | 'isDuplicate' | 'rememberHash'>
  >;

  const examTypeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const subjectId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const paperId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const contentHash = 'aa'.repeat(32);

  beforeEach(async () => {
    jest.mocked(unlink).mockClear();

    paperRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
    };
    questionRepo = {
      createQueryBuilder: jest.fn(),
    };
    extractionQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    examTypeRepo = {
      existsBy: jest.fn(),
    };
    subjectRepo = {
      existsBy: jest.fn(),
    };

    documentsService = {
      hashFile: jest.fn().mockResolvedValue(contentHash),
      isDuplicate: jest.fn().mockResolvedValue({ duplicate: false }),
      rememberHash: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(async (fn) => {
        const em = {
          save: jest.fn(
            async (_entity: unknown, row: Record<string, unknown>) => {
              if ('examTypeId' in row) {
                return {
                  ...row,
                  id: paperId,
                  status: ExamPaperStatus.PENDING,
                } as ExamPaper;
              }
              return {} as Document;
            },
          ),
        };
        return fn(em);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PapersService,
        { provide: DataSource, useValue: dataSource as unknown as DataSource },
        { provide: getRepositoryToken(ExamPaper), useValue: paperRepo },
        { provide: getRepositoryToken(ExamQuestion), useValue: questionRepo },
        {
          provide: getQueueToken(QUEUE_NAMES.PDF_EXTRACTION),
          useValue: extractionQueue,
        },
        { provide: getRepositoryToken(ExamType), useValue: examTypeRepo },
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
        { provide: DocumentsService, useValue: documentsService },
      ],
    }).compile();

    service = module.get<PapersService>(PapersService);
  });

  function mockMulterFile(
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File {
    return {
      fieldname: 'files',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      destination: '/tmp',
      filename: 'upload.pdf',
      path: '/tmp/upload.pdf',
      buffer: Buffer.alloc(0),
      stream: undefined as unknown as Express.Multer.File['stream'],
      ...overrides,
    };
  }

  const defaultQuery = Object.assign(new GetPaperQuestionsQueryDto(), {
    page: 1,
    pageSize: 20,
  });

  describe('createPaper', () => {
    it('throws BadRequestException when exam type does not exist', async () => {
      examTypeRepo.existsBy.mockResolvedValue(false);

      await expect(
        service.createPaper(mockMulterFile(), {
          examTypeId,
          subjectId,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPaper(mockMulterFile(), {
          examTypeId,
          subjectId,
        }),
      ).rejects.toThrow('Exam type not found');

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when subject does not exist', async () => {
      examTypeRepo.existsBy.mockResolvedValue(true);
      subjectRepo.existsBy.mockResolvedValue(false);

      await expect(
        service.createPaper(mockMulterFile(), {
          examTypeId,
          subjectId,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPaper(mockMulterFile(), {
          examTypeId,
          subjectId,
        }),
      ).rejects.toThrow('Subject not found');

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws when duplicate detected via Redis, unlinks temp file', async () => {
      examTypeRepo.existsBy.mockResolvedValue(true);
      subjectRepo.existsBy.mockResolvedValue(true);
      documentsService.isDuplicate.mockResolvedValue({
        duplicate: true,
        existingPaperId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      });

      const file = mockMulterFile();

      await expect(
        service.createPaper(file, { examTypeId, subjectId }),
      ).rejects.toThrow(BadRequestException);

      expect(documentsService.hashFile).toHaveBeenCalledWith(file.path);
      expect(documentsService.isDuplicate).toHaveBeenCalledWith(contentHash);
      expect(unlink).toHaveBeenCalledWith(file.path);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws when duplicate found in DB after Redis miss, unlinks temp file', async () => {
      examTypeRepo.existsBy.mockResolvedValue(true);
      subjectRepo.existsBy.mockResolvedValue(true);
      documentsService.isDuplicate.mockResolvedValue({
        duplicate: true,
        existingPaperId: paperId,
      });

      const file = mockMulterFile();

      await expect(
        service.createPaper(file, { examTypeId, subjectId }),
      ).rejects.toThrow(BadRequestException);

      expect(unlink).toHaveBeenCalledWith(file.path);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('creates paper and document in a transaction, caches hash, enqueues extraction', async () => {
      examTypeRepo.existsBy.mockResolvedValue(true);
      subjectRepo.existsBy.mockResolvedValue(true);

      const file = mockMulterFile();

      const result = await service.createPaper(file, {
        examTypeId,
        subjectId,
      });

      expect(documentsService.hashFile).toHaveBeenCalledWith(file.path);
      expect(documentsService.isDuplicate).toHaveBeenCalledWith(contentHash);
      expect(dataSource.transaction).toHaveBeenCalled();

      expect(documentsService.rememberHash).toHaveBeenCalledWith(
        contentHash,
        paperId,
      );

      expect(extractionQueue.add).toHaveBeenCalledWith('extract', {
        paperId,
        filePath: file.path,
      });

      expect(unlink).not.toHaveBeenCalled();

      expect(result).toEqual({
        paperId,
        status: ExamPaperStatus.PENDING,
      });
    });

    it('throws on unique constraint race, unlinks temp file', async () => {
      examTypeRepo.existsBy.mockResolvedValue(true);
      subjectRepo.existsBy.mockResolvedValue(true);

      const uniqueErr = new QueryFailedError('', [], {
        code: '23505',
      } as Error & { code: string });

      dataSource.transaction.mockRejectedValueOnce(uniqueErr);

      const file = mockMulterFile();

      await expect(
        service.createPaper(file, { examTypeId, subjectId }),
      ).rejects.toThrow(BadRequestException);

      expect(unlink).toHaveBeenCalledWith(file.path);
      expect(documentsService.rememberHash).not.toHaveBeenCalled();
      expect(extractionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getPaper', () => {
    it('throws NotFoundException when paper missing', async () => {
      paperRepo.findOne.mockResolvedValue(null);

      await expect(service.getPaper(paperId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPaper(paperId)).rejects.toThrow(
        'Paper not found',
      );
    });

    it('returns paper when found', async () => {
      const paper = { id: paperId } as ExamPaper;
      paperRepo.findOne.mockResolvedValue(paper);

      await expect(service.getPaper(paperId)).resolves.toBe(paper);
      expect(paperRepo.findOne).toHaveBeenCalledWith({
        where: { id: paperId },
      });
    });
  });

  describe('getPaperStatus', () => {
    it('throws NotFoundException when paper missing', async () => {
      paperRepo.findOne.mockResolvedValue(null);

      await expect(service.getPaperStatus(paperId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns status when paper found', async () => {
      paperRepo.findOne.mockResolvedValue({
        id: paperId,
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      } as ExamPaper);

      await expect(service.getPaperStatus(paperId)).resolves.toEqual({
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      });
      expect(paperRepo.findOne).toHaveBeenCalledWith({
        where: { id: paperId },
        select: ['id', 'status', 'failureReason'],
      });
    });
  });

  describe('getPaperQuestions', () => {
    function mockQueryBuilder(items: ExamQuestion[], total: number) {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([items, total]),
      } as unknown as SelectQueryBuilder<ExamQuestion>;
      questionRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('returns paginated questions without year filter', async () => {
      const rows = [{ id: 'q1' } as ExamQuestion];
      mockQueryBuilder(rows, 1);

      const result = await service.getPaperQuestions(paperId, defaultQuery);

      expect(result.items).toEqual(rows);
      expect(result.total).toBe(1);
      expect(questionRepo.createQueryBuilder).toHaveBeenCalledWith('question');
    });

    it('adds year filter when year provided', async () => {
      const rows: ExamQuestion[] = [];
      const qb = mockQueryBuilder(rows, 0);

      const query = { ...defaultQuery, year: '2024' };

      await service.getPaperQuestions(paperId, query);

      expect(qb.andWhere).toHaveBeenCalledWith('question.year = :year', {
        year: '2024',
      });
    });

    it('returns empty items when no questions match', async () => {
      mockQueryBuilder([], 0);

      const result = await service.getPaperQuestions(paperId, defaultQuery);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
