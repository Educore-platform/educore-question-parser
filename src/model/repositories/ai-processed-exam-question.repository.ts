import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AiProcessedExamQuestion } from '../entities/ai-processed-exam-question.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class AiProcessedExamQuestionRepository extends BaseRepository<AiProcessedExamQuestion> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(AiProcessedExamQuestion, dataSource.manager);
  }
}
