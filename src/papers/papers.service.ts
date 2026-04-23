import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { unlink } from 'node:fs/promises';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { Document } from '../model/entities/document.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { ExamType } from '../model/entities/exam-type.entity';
import { Subject } from '../model/entities/subject.entity';
import { CreatePaperDto } from './dto/create-paper.dto';
import { GetPaperQuestionsQueryDto } from './dto/pagination-query.dto';
import { ExamPaperFilterDto } from './dto/exam-paper-filter.dto';
import { UpdateExamPaperDto } from './dto/update-exam-paper.dto';
import { ExamPaperListItemDto } from './dto/exam-paper-list-item.dto';
import { PaginatedResponseDto } from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import {
  CloudinaryStatus,
  DocumentType,
  DocumentSource,
  ExamPaperStatus,
} from '../model/entities/enums';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { DocumentsService } from '../documents/documents.service';
import { isPostgresUniqueViolation } from '../shared/utils/pg-error.util';

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ExamPaper)
    private readonly paperRepo: Repository<ExamPaper>,
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
    @InjectQueue(QUEUE_NAMES.PDF_EXTRACTION)
    private readonly extractionQueue: Queue,
    @InjectRepository(ExamType)
    private readonly examTypeRepo: Repository<ExamType>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly documentsService: DocumentsService,
  ) {}


  private async unlinkQuiet(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch {
      this.logger.error(`Failed to unlink file ${path}`);
    }
  }

  private async assertExamTypeExists(examTypeId: string): Promise<void> {
    const exists = await this.examTypeRepo.existsBy({ id: examTypeId });
    if (!exists) throw new BadRequestException('Exam type not found');
  }

  private async assertSubjectExists(subjectId: string): Promise<void> {
    const exists = await this.subjectRepo.existsBy({ id: subjectId });
    if (!exists) throw new BadRequestException('Subject not found');
  }


  async createPaper(
    file: Express.Multer.File,
    dto: CreatePaperDto,
  ): Promise<{ paperId: string; status: ExamPaperStatus }> {
    await this.assertExamTypeExists(dto.examTypeId);
    await this.assertSubjectExists(dto.subjectId);

    const hash = await this.documentsService.hashFile(file.path);

    const dupCheck = await this.documentsService.isDuplicate(hash);
    if (dupCheck.duplicate) {
      await this.unlinkQuiet(file.path);
      throw new BadRequestException({
        message: 'Duplicate PDF',
        existingPaperId: dupCheck.existingPaperId,
      });
    }

    let paper: ExamPaper;
    try {
      paper = await this.dataSource.transaction(async (em) => {
        const p = await em.save(ExamPaper, {
          examTypeId: dto.examTypeId,
          subjectId: dto.subjectId,
          status: ExamPaperStatus.PENDING,
        });

        await em.save(Document, {
          examPaperId: p.id,
          type: DocumentType.PDF,
          source: DocumentSource.UPLOADED,
          storagePath: file.path,
          contentSha256: hash,
          cloudinaryStatus: CloudinaryStatus.PENDING,
          meta: {
            original_filename: file.originalname,
            file_size_bytes: file.size,
          },
        });

        return p;
      });
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        await this.unlinkQuiet(file.path);
        throw new BadRequestException({ message: 'Duplicate PDF' });
      }
      throw err;
    }

    await this.documentsService.rememberHash(hash, paper.id);
    await this.extractionQueue.add('extract', {
      paperId: paper.id,
      filePath: file.path,
    });

    return { paperId: paper.id, status: paper.status };
  }

  async findAll(
    filter: ExamPaperFilterDto,
  ): Promise<PaginatedResponseDto<ExamPaperListItemDto>> {
    const qb = this.paperRepo
      .createQueryBuilder('paper')
      .select([
        'paper.id',
        'paper.status',
        'paper.failureReason',
        'paper.createdAt',
        'paper.examTypeId',
        'paper.subjectId',
        'paper.yearsDetected',
      ]);

    if (filter.examTypeId) {
      qb.andWhere('paper.examTypeId = :examTypeId', {
        examTypeId: filter.examTypeId,
      });
    }
    if (filter.subjectId) {
      qb.andWhere('paper.subjectId = :subjectId', {
        subjectId: filter.subjectId,
      });
    }
    if (filter.status) {
      qb.andWhere('paper.status = :status', { status: filter.status });
    }
    if (filter.year) {
      qb.andWhere(':year = ANY(paper.yearsDetected)', { year: filter.year });
    }

    const { skip, take } = paginationOptions(filter);
    qb.skip(skip).take(take).orderBy('paper.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return PaginatedResponseDto.of(items as ExamPaperListItemDto[], total, filter);
  }

  async findOne(id: string): Promise<ExamPaper> {
    const paper = await this.paperRepo.findOne({ where: { id } });
    if (!paper) throw new NotFoundException('Paper not found');
    return paper;
  }

  /** @deprecated Use findOne() — kept for backward compat with any older callers */
  async getPaper(id: string) {
    return this.findOne(id);
  }

  async getPaperStatus(
    id: string,
  ): Promise<{ status: ExamPaperStatus; failureReason: string | null }> {
    const paper = await this.paperRepo.findOne({
      where: { id },
      select: ['id', 'status', 'failureReason'],
    });
    if (!paper) throw new NotFoundException('Paper not found');
    return { status: paper.status, failureReason: paper.failureReason };
  }

  async getPaperQuestions(
    id: string,
    queryDto: GetPaperQuestionsQueryDto,
  ): Promise<PaginatedResponseDto<ExamQuestion>> {
    const { page, pageSize, year } = queryDto;

    const qb = this.questionRepo
      .createQueryBuilder('question')
      .where('question.examPaperId = :id', { id });

    if (year) {
      qb.andWhere('question.year = :year', { year });
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return PaginatedResponseDto.of(items, total, queryDto);
  }

  async update(id: string, dto: UpdateExamPaperDto): Promise<ExamPaper> {
    const paper = await this.findOne(id);
    const { examTypeId, subjectId, ...rest } = dto;

    if (examTypeId !== undefined) await this.assertExamTypeExists(examTypeId);
    if (subjectId !== undefined) await this.assertSubjectExists(subjectId);

    return this.paperRepo.save(
      this.paperRepo.merge(paper, { examTypeId, subjectId, ...rest }),
    );
  }

  async remove(id: string): Promise<void> {
    // Confirms paper exists before attempting delete
    await this.findOne(id);
    await this.paperRepo.softDelete(id);
  }
}