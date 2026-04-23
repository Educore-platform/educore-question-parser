import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../model/entities/subject.entity';
import {
  PaginatedResponseDto,
  PaginationQueryDto,
} from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectListItemDto } from './dto/subject-list-item.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SubjectListItemDto>> {
    const [items, total] = await this.subjectRepo.findAndCount({
      select: ['id', 'name', 'createdAt'],
      order: { name: 'ASC' },
      ...paginationOptions(query),
    });
    return PaginatedResponseDto.of(items as SubjectListItemDto[], total, query);
  }

  async findOne(id: string): Promise<Subject> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const subject = this.subjectRepo.create(dto);
    return this.subjectRepo.save(subject);
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findOne(id);
    Object.assign(subject, dto);
    return this.subjectRepo.save(subject);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.subjectRepo.softDelete(id);
  }
}
