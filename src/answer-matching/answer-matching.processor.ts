import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { In } from 'typeorm';

import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { ExamPaperRepository } from '../model/repositories/exam-paper.repository';
import { RedisService } from '../shared/redis/redis.service';
import { QuestionStatus, ExamPaperStatus } from '../model/entities/enums';
import {
  AnswerMatchingJobPayload,
  QUEUE_NAMES,
} from '../shared/queues/queue-names';

@Processor(QUEUE_NAMES.ANSWER_MATCHING)
export class AnswerMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(AnswerMatchingProcessor.name);

  constructor(
    private readonly questionRepo: ExamQuestionRepository,
    private readonly paperRepo: ExamPaperRepository,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<AnswerMatchingJobPayload>): Promise<void> {
    const { paperId, year } = job.data;
    const redis = this.redisService.getClient();
    const redisKey = `answers:${paperId}:${year}`;

    const [answersMap, questions] = await Promise.all([
      redis.hgetall(redisKey),
      this.questionRepo.find({ where: { examPaperId: paperId, year } }),
    ]);

    if (!questions.length) {
      this.logger.warn(`No questions in DB for paper ${paperId}, year ${year}`);
      await redis.del(redisKey);
      return;
    }

    await this.paperRepo.update(paperId, {
      status: ExamPaperStatus.PROCESSING,
    });

    const hasAnswers = Object.keys(answersMap).length > 0;
    const matchedIds: string[] = [];
    const unmatchedIds: string[] = [];

    for (const question of questions) {
      if (hasAnswers && answersMap[String(question.questionNumber)]) {
        matchedIds.push(question.id);
      } else {
        unmatchedIds.push(question.id);
      }
    }

    const updates: Promise<unknown>[] = matchedIds.map((id) =>
      this.questionRepo.update(id, {
        answer:
          answersMap[
            String(
              questions.find((question) => question.id === id)!.questionNumber,
            )
          ],
        status: QuestionStatus.ANSWER_MATCHED,
      }),
    );

    if (unmatchedIds.length) {
      updates.push(
        this.questionRepo.update(
          { id: In(unmatchedIds) },
          { status: QuestionStatus.ANSWER_MATCHED },
        ),
      );
    }

    await Promise.all([...updates, redis.del(redisKey)]);

    this.logger.log(
      `paper ${paperId}, year ${year}: matched ${matchedIds.length}/${questions.length} answers`,
    );
  }
}
