import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { toErrorMessage } from '../shared/utils/error-message.util';
import { AiEnrichmentQueueService } from './ai-enrichment-queue.service';

@Injectable()
export class AiEnrichmentScheduler {
  private readonly logger = new Logger(AiEnrichmentScheduler.name);
  private isRunning = false;

  constructor(
    private readonly examQuestionRepo: ExamQuestionRepository,
    private readonly aiEnrichmentQueueService: AiEnrichmentQueueService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEnrichmentSweeper(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const questions = await this.examQuestionRepo.claimQuestionsForEnrichment(
        this.aiEnrichmentQueueService.batchSize,
      );

      if (!questions.length) return;

      await this.aiEnrichmentQueueService.enqueueBatches(
        questions.map((q) => q.id),
      );

      this.logger.log(
        `Claimed and enqueued ${questions.length} questions for AI enrichment`,
      );
    } catch (error: unknown) {
      this.logger.error(`Enrichment sweeper failed: ${toErrorMessage(error)}`);
    } finally {
      this.isRunning = false;
    }
  }
}
