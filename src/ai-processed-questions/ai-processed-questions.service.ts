import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProcessedExamQuestion } from '../model/entities/ai-processed-exam-question.entity';
import { PaginatedResponseDto } from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { AiProcessedQuestionFilterDto } from './dto/ai-processed-question-filter.dto';
import { AiProcessedQuestionListItemDto } from './dto/ai-processed-question-list-item.dto';
import { UpdateAiProcessedQuestionDto } from './dto/update-ai-processed-question.dto';

@Injectable()
export class AiProcessedQuestionsService {
  constructor(
    @InjectRepository(AiProcessedExamQuestion)
    private readonly repo: Repository<AiProcessedExamQuestion>,
  ) {}

  async findAll(
    filter: AiProcessedQuestionFilterDto,
  ): Promise<PaginatedResponseDto<AiProcessedQuestionListItemDto>> {
    const qb = this.repo
      .createQueryBuilder('apq')
      .select([
        'apq.id',
        'apq.examQuestionId',
        'apq.topic',
        'apq.relatedTopic',
        'apq.status',
        'apq.createdAt',
      ]);

    if (filter.examQuestionId) {
      qb.andWhere('apq.examQuestionId = :examQuestionId', {
        examQuestionId: filter.examQuestionId,
      });
    }
    if (filter.status) {
      qb.andWhere('apq.status = :status', { status: filter.status });
    }

    const { skip, take } = paginationOptions(filter);
    qb.skip(skip).take(take).orderBy('apq.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return PaginatedResponseDto.of(
      items as AiProcessedQuestionListItemDto[],
      total,
      filter,
    );
  }

  async findOne(id: string): Promise<AiProcessedExamQuestion> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('AI processed question not found');
    return record;
  }

  async update(
    id: string,
    dto: UpdateAiProcessedQuestionDto,
  ): Promise<AiProcessedExamQuestion> {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    return this.repo.save(record);
  }
}
