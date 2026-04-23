import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvalidExamQuestion } from '../model/entities/invalid-exam-question.entity';
import { PaginatedResponseDto } from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { InvalidQuestionFilterDto } from './dto/invalid-question-filter.dto';
import { InvalidQuestionListItemDto } from './dto/invalid-question-list-item.dto';

@Injectable()
export class InvalidExamQuestionsService {
  constructor(
    @InjectRepository(InvalidExamQuestion)
    private readonly repo: Repository<InvalidExamQuestion>,
  ) {}

  async findAll(
    filter: InvalidQuestionFilterDto,
  ): Promise<PaginatedResponseDto<InvalidQuestionListItemDto>> {
    const qb = this.repo
      .createQueryBuilder('iq')
      .select([
        'iq.id',
        'iq.paperId',
        'iq.pageNumber',
        'iq.rawText',
        'iq.errors',
        'iq.createdAt',
      ]);

    if (filter.examPaperId) {
      qb.andWhere('iq.paperId = :paperId', { paperId: filter.examPaperId });
    }

    const { skip, take } = paginationOptions(filter);
    qb.skip(skip).take(take).orderBy('iq.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return PaginatedResponseDto.of(items as InvalidQuestionListItemDto[], total, filter);
  }

  async findOne(id: string): Promise<InvalidExamQuestion> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Invalid exam question not found');
    return record;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete(id);
  }
}
