import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LatexProcessor } from './latex.processor';
import { LatexImprovementService } from './latex-improvement.service';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { STANDARD_JOB_OPTIONS } from '../shared/queues/queue-defaults';
import { LatexClassifierService } from '../extraction/services/latex-classifier.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamQuestion]),
    // Own queue
    BullModule.registerQueue({
      name: QUEUE_NAMES.LATEX_IMPROVEMENT,
      defaultJobOptions: STANDARD_JOB_OPTIONS,
    }),
    // Next stage
    BullModule.registerQueue({ name: QUEUE_NAMES.ANSWER_MATCHING }),
  ],
  providers: [
    LatexProcessor,
    LatexImprovementService,
    ExamQuestionRepository,
    LatexClassifierService,
  ],
  exports: [LatexImprovementService],
})
export class LatexModule {}
