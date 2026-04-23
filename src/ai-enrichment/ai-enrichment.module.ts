import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiEnrichmentProcessor } from './ai-enrichment.processor';
import { AiEnrichmentService } from './ai-enrichment.service';
import { AiEnrichmentScheduler } from './ai-enrichment.scheduler';
import { AiEnrichmentQueueService } from './ai-enrichment-queue.service';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { AiProcessedExamQuestion } from '../model/entities/ai-processed-exam-question.entity';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { AiProcessedExamQuestionRepository } from '../model/repositories/ai-processed-exam-question.repository';
import { ExamPaperRepository } from '../model/repositories/exam-paper.repository';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { AI_ENRICHMENT_JOB_OPTIONS } from '../shared/queues/queue-defaults';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ExamQuestion, AiProcessedExamQuestion, ExamPaper]),
    // Own queue — terminal stage, no next queue registered
    BullModule.registerQueue({
      name: QUEUE_NAMES.AI_ENRICHMENT,
      defaultJobOptions: AI_ENRICHMENT_JOB_OPTIONS,
    }),
  ],
  providers: [
    AiEnrichmentProcessor,
    AiEnrichmentService,
    AiEnrichmentScheduler,
    ExamQuestionRepository,
    AiProcessedExamQuestionRepository,
    ExamPaperRepository,
    AiEnrichmentQueueService,
  ],
  exports: [AiEnrichmentService, AiEnrichmentQueueService],
})
export class AiEnrichmentModule {}
