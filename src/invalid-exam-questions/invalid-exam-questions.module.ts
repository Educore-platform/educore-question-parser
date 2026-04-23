import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvalidExamQuestion } from '../model/entities/invalid-exam-question.entity';
import { InvalidExamQuestionsController } from './invalid-exam-questions.controller';
import { InvalidExamQuestionsService } from './invalid-exam-questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvalidExamQuestion])],
  controllers: [InvalidExamQuestionsController],
  providers: [InvalidExamQuestionsService],
  exports: [InvalidExamQuestionsService],
})
export class InvalidExamQuestionsModule {}
