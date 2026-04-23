import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamType } from '../model/entities/exam-type.entity';
import {
  PaginatedResponseDto,
  PaginationQueryDto,
} from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { CreateExamTypeDto } from './dto/create-exam-type.dto';
import { UpdateExamTypeDto } from './dto/update-exam-type.dto';
import { ExamTypeListItemDto } from './dto/exam-type-list-item.dto';

@Injectable()
export class ExamTypesService {
  constructor(
    @InjectRepository(ExamType)
    private readonly examTypeRepo: Repository<ExamType>,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ExamTypeListItemDto>> {
    const [items, total] = await this.examTypeRepo.findAndCount({
      select: ['id', 'name', 'createdAt'],
      order: { name: 'ASC' },
      ...paginationOptions(query),
    });
    return PaginatedResponseDto.of(
      items as ExamTypeListItemDto[],
      total,
      query,
    );
  }

  async findOne(id: string): Promise<ExamType> {
    const examType = await this.examTypeRepo.findOne({ where: { id } });
    if (!examType) throw new NotFoundException('Exam type not found');
    return examType;
  }

  async create(dto: CreateExamTypeDto): Promise<ExamType> {
    const examType = this.examTypeRepo.create(dto);
    return this.examTypeRepo.save(examType);
  }

  async update(id: string, dto: UpdateExamTypeDto): Promise<ExamType> {
    const examType = await this.findOne(id);
    Object.assign(examType, dto);
    return this.examTypeRepo.save(examType);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.examTypeRepo.softDelete(id);
  }
}
