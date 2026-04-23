import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { QuestionBulkAction, QuestionIngestionSource, QuestionStatus } from '../model/entities/enums';
import { PaginatedResponseDto } from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { QuestionListItemDto } from './dto/question-list-item.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
  ) {}

  async findAll(filter: QuestionFilterDto): Promise<PaginatedResponseDto<QuestionListItemDto>> {
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .select([
        'q.id',
        'q.questionNumber',
        'q.year',
        'q.status',
        'q.hasMedia',
        'q.createdAt',
      ]);

    if (filter.examPaperId) {
      qb.andWhere('q.examPaperId = :examPaperId', { examPaperId: filter.examPaperId });
    }
    if (filter.subjectId) {
      qb.andWhere('q.subjectId = :subjectId', { subjectId: filter.subjectId });
    }
    if (filter.year) {
      qb.andWhere('q.year = :year', { year: filter.year });
    }
    if (filter.status) {
      qb.andWhere('q.status = :status', { status: filter.status });
    }

    const { skip, take } = paginationOptions(filter);
    qb.skip(skip).take(take).orderBy('q.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return PaginatedResponseDto.of(items as QuestionListItemDto[], total, filter);
  }

  async findOne(id: string): Promise<ExamQuestion> {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async create(dto: CreateQuestionDto): Promise<ExamQuestion> {
    const question = this.questionRepo.create({
      ...dto,
      ingestionSource: QuestionIngestionSource.MANUAL,
      status: QuestionStatus.RAW,
      hasMedia: false,
    });
    return this.questionRepo.save(question);
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<ExamQuestion> {
    const question = await this.findOne(id);
    Object.assign(question, dto);
    return this.questionRepo.save(question);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.questionRepo.softDelete(id);
  }

  async bulkAction(dto: BulkActionDto): Promise<{ affected: number }> {
    const { action, questionIds } = dto;

    if (action === QuestionBulkAction.MARK_REVIEWED) {
      const result = await this.questionRepo
        .createQueryBuilder()
        .update(ExamQuestion)
        .set({ status: QuestionStatus.ENRICHED })
        .whereInIds(questionIds)
        .execute();
      return { affected: result.affected ?? 0 };
    }

    if (action === QuestionBulkAction.RE_ENRICH) {
      const result = await this.questionRepo
        .createQueryBuilder()
        .update(ExamQuestion)
        .set({ status: QuestionStatus.ANSWER_MATCHED })
        .whereInIds(questionIds)
        .execute();
      return { affected: result.affected ?? 0 };
    }

    return { affected: 0 };
  }
}
