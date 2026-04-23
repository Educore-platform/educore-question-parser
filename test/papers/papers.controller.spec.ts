import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PapersController } from '../../src/papers/papers.controller';
import { PapersService } from '../../src/papers/papers.service';
import { ExamPaperStatus } from '../../src/model/entities/enums';

describe('PapersController', () => {
  let controller: PapersController;
  let papersService: jest.Mocked<
    Pick<
      PapersService,
      | 'createPaper'
      | 'findOne'
      | 'getPaperStatus'
      | 'getPaperQuestions'
    >
  >;

  const examTypeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const subjectId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  beforeEach(async () => {
    papersService = {
      createPaper: jest.fn(),
      findOne: jest.fn(),
      getPaperStatus: jest.fn(),
      getPaperQuestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PapersController],
      providers: [{ provide: PapersService, useValue: papersService }],
    }).compile();

    controller = module.get<PapersController>(PapersController);
  });

  function mockFile(
    path: string,
    originalname = 'a.pdf',
  ): Express.Multer.File {
    return {
      fieldname: 'files',
      originalname,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 100,
      destination: '/tmp',
      filename: 'f.pdf',
      path,
      buffer: Buffer.alloc(0),
      stream: undefined as unknown as Express.Multer.File['stream'],
    };
  }

  describe('upload', () => {
    it('throws when no files uploaded', async () => {
      await expect(
        controller.upload(undefined as unknown as Express.Multer.File[], {
          items: [{ examTypeId, subjectId }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.upload(undefined as unknown as Express.Multer.File[], {
          items: [{ examTypeId, subjectId }],
        }),
      ).rejects.toThrow('No files uploaded');

      await expect(controller.upload([], { items: [{ examTypeId, subjectId }] }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws when items length does not match files length', async () => {
      const files = [mockFile('/tmp/a.pdf'), mockFile('/tmp/b.pdf')];

      await expect(
        controller.upload(files, {
          items: [{ examTypeId, subjectId }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.upload(files, {
          items: [{ examTypeId, subjectId }],
        }),
      ).rejects.toThrow(/items length \(1\) must match files length \(2\)/);

      expect(papersService.createPaper).not.toHaveBeenCalled();
    });

    it('calls createPaper per file with matching item index', async () => {
      const dto1 = { examTypeId, subjectId };
      const dto2 = {
        examTypeId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        subjectId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      };

      papersService.createPaper.mockImplementation(async (file, dto) => ({
        paperId: `${file.path}:${dto.examTypeId}`,
        status: ExamPaperStatus.PENDING,
      }));

      const f1 = mockFile('/tmp/one.pdf');
      const f2 = mockFile('/tmp/two.pdf');

      const results = await controller.upload([f1, f2], {
        items: [dto1, dto2],
      });

      expect(papersService.createPaper).toHaveBeenCalledTimes(2);
      expect(papersService.createPaper).toHaveBeenNthCalledWith(1, f1, dto1);
      expect(papersService.createPaper).toHaveBeenNthCalledWith(2, f2, dto2);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        paperId: '/tmp/one.pdf:' + examTypeId,
      });
    });
  });

  describe('findOne (GET /:id)', () => {
    it('delegates to papersService.findOne', async () => {
      const paper = { id: 'p1' };
      papersService.findOne.mockResolvedValue(paper as never);

      await expect(controller.findOne({ id: 'p1' })).resolves.toBe(paper);
      expect(papersService.findOne).toHaveBeenCalledWith('p1');
    });
  });

  describe('getPaperStatus', () => {
    it('delegates to papersService.getPaperStatus', async () => {
      papersService.getPaperStatus.mockResolvedValue({
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      });

      await expect(controller.getPaperStatus('p2')).resolves.toEqual({
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      });
      expect(papersService.getPaperStatus).toHaveBeenCalledWith('p2');
    });
  });

  describe('getPaperQuestions', () => {
    it('delegates without year', async () => {
      const qs = [{ id: 'q1' }];
      papersService.getPaperQuestions.mockResolvedValue(qs as never);

      const query = { page: 1, pageSize: 20 } as never;
      await expect(controller.getPaperQuestions('p3', query)).resolves.toBe(qs);
      expect(papersService.getPaperQuestions).toHaveBeenCalledWith('p3', query);
    });

    it('delegates with year query', async () => {
      papersService.getPaperQuestions.mockResolvedValue([] as never);

      const query = { page: 1, pageSize: 20, year: '2023' } as never;
      await expect(
        controller.getPaperQuestions('p4', query),
      ).resolves.toEqual([]);
      expect(papersService.getPaperQuestions).toHaveBeenCalledWith('p4', query);
    });
  });
});
