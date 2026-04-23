import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExamType } from '../entities/exam-type.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class ExamTypeRepository extends BaseRepository<ExamType> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(ExamType, dataSource.manager);
  }
}
