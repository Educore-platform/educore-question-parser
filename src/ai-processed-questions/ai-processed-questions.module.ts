import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProcessedExamQuestion } from '../model/entities/ai-processed-exam-question.entity';
import { AiProcessedQuestionsController } from './ai-processed-questions.controller';
import { AiProcessedQuestionsService } from './ai-processed-questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiProcessedExamQuestion])],
  controllers: [AiProcessedQuestionsController],
  providers: [AiProcessedQuestionsService],
  exports: [AiProcessedQuestionsService],
})
export class AiProcessedQuestionsModule {}
