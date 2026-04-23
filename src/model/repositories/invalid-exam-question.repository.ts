import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvalidExamQuestion } from '../entities/invalid-exam-question.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class InvalidExamQuestionRepository extends BaseRepository<InvalidExamQuestion> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(InvalidExamQuestion, dataSource.manager);
  }
}
