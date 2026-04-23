import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from '@anthropic-ai/sdk';
import { Job, UnrecoverableError } from 'bullmq';
import { In, Not } from 'typeorm';

import { AiEnrichmentService } from './ai-enrichment.service';
import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { AiProcessedExamQuestionRepository } from '../model/repositories/ai-processed-exam-question.repository';
import { ExamPaperRepository } from '../model/repositories/exam-paper.repository';
import { AiEnrichmentJobPayload } from '../shared/queues/queue-names';
import {
  AiProcessedStatus,
  ExamPaperStatus,
  QuestionStatus,
} from '../model/entities/enums';
import { EnrichedQuestion } from '../model/entities/interfaces';
import { formatErrorForStorage } from '../shared/utils/error-storage.util';

@Processor('ai-enrichment')
export class AiEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEnrichmentProcessor.name);

  constructor(
    private readonly aiEnrichmentService: AiEnrichmentService,
    private readonly examQuestionRepo: ExamQuestionRepository,
    private readonly aiProcessedRepo: AiProcessedExamQuestionRepository,
    private readonly examPaperRepo: ExamPaperRepository,
  ) {
    super();
  }

  async process(job: Job<AiEnrichmentJobPayload>): Promise<void> {
    const { questionIds } = job.data;

    const questions = await this.examQuestionRepo.find({
      where: { id: In(questionIds) },
      relations: ['subject', 'examPaper'],
    });

    if (!questions.length) {
      this.logger.warn(`No questions found for IDs: ${questionIds.join(', ')}`);
      return;
    }

    const paperIds = [
      ...new Set(questions.map((q) => q.examPaperId).filter(Boolean)),
    ] as string[];

    if (paperIds.length) {
      await this.examPaperRepo.update(
        { id: In(paperIds) },
        { status: ExamPaperStatus.PROCESSING },
      );
    }

    let enrichedResults: EnrichedQuestion[];

    try {
      enrichedResults =
        await this.aiEnrichmentService.enrichQuestions(questions);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        error instanceof AuthenticationError ||
        error instanceof PermissionDeniedError
      ) {
        this.logger.error(
          `Non-retryable Anthropic error for job ${job.id}: ${message}`,
        );
        await this.examQuestionRepo.update(
          { id: In(questionIds) },
          {
            status: QuestionStatus.FAILED,
            failureReason: formatErrorForStorage(error),
          },
        );
        throw new UnrecoverableError(message);
      }

      if (error instanceof RateLimitError) {
        const maxAttempts = job.opts.attempts ?? 1;
        this.logger.warn(
          `Rate limited on job ${job.id} (attempt ${job.attemptsMade + 1}/${maxAttempts})`,
        );

        if (job.attemptsMade >= maxAttempts - 1) {
          await this.examQuestionRepo.update(
            { id: In(questionIds) },
            {
              status: QuestionStatus.FAILED,
              failureReason: `Rate limit exceeded after ${job.attemptsMade + 1} attempt(s)`,
            },
          );
        }

        throw error;
      }

      this.logger.error(`AI enrichment failed for job ${job.id}: ${message}`);
      await this.examQuestionRepo.update(
        { id: In(questionIds) },
        {
          status: QuestionStatus.FAILED,
          failureReason: formatErrorForStorage(error),
        },
      );
      throw error;
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    await Promise.all(
      enrichedResults
        .filter((result) => questionMap.has(result.id))
        .flatMap((result) => [
          this.aiProcessedRepo.upsert(
            {
              examQuestionId: result.id,
              questionText: result.questionText,
              questionLatex: result.questionLatex,
              options: result.options,
              answer: result.answer,
              explanation: result.explanation,
              topic: result.topic,
              relatedTopic: result.relatedTopic,
              status: AiProcessedStatus.COMPLETED,
            },
            ['examQuestionId'],
          ),
          this.examQuestionRepo.update(result.id, {
            status: QuestionStatus.ENRICHED,
            failureReason: null,
          }),
        ]),
    );

    this.logger.log(
      `Enriched ${enrichedResults.length}/${questions.length} questions (job ${job.id})`,
    );

    await Promise.all(paperIds.map((id) => this.tryFinalisePaper(id)));
  }

  private async tryFinalisePaper(paperId: string): Promise<void> {
    const remaining = await this.examQuestionRepo.count({
      where: {
        examPaperId: paperId,
        status: Not(In([QuestionStatus.ENRICHED, QuestionStatus.FAILED])),
      },
    });

    if (remaining > 0) return;

    const failedCount = await this.examQuestionRepo.count({
      where: { examPaperId: paperId, status: QuestionStatus.FAILED },
    });

    const finalStatus =
      failedCount > 0
        ? ExamPaperStatus.PARTIALLY_ENRICHED
        : ExamPaperStatus.ENRICHED;

    await this.examPaperRepo.update(paperId, { status: finalStatus });
    this.logger.log(`Paper ${paperId} finalised with status ${finalStatus}`);
  }
}
