import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AnswerMatchingProcessor } from './answer-matching.processor';
import { AnswerMatchingService } from './answer-matching.service';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { ExamPaperRepository } from '../model/repositories/exam-paper.repository';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { STANDARD_JOB_OPTIONS } from '../shared/queues/queue-defaults';
import { RedisModule } from '../shared/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forFeature([ExamQuestion, ExamPaper]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.ANSWER_MATCHING,
      defaultJobOptions: STANDARD_JOB_OPTIONS,
    }),
  ],
  providers: [
    AnswerMatchingProcessor,
    AnswerMatchingService,
    ExamQuestionRepository,
    ExamPaperRepository,
  ],
  exports: [AnswerMatchingService],
})
export class AnswerMatchingModule {}
