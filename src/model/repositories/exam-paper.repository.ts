import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExamPaper } from '../entities/exam-paper.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class ExamPaperRepository extends BaseRepository<ExamPaper> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(ExamPaper, dataSource.manager);
  }
}
