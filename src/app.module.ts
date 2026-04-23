import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiEnrichmentModule } from './ai-enrichment/ai-enrichment.module';
import { AiProcessedQuestionsModule } from './ai-processed-questions/ai-processed-questions.module';
import { AnswerMatchingModule } from './answer-matching/answer-matching.module';
import { DocumentsModule } from './documents/documents.module';
import { ExamTypesModule } from './exam-types/exam-types.module';
import { ExtractionModule } from './extraction/extraction.module';
import { InvalidExamQuestionsModule } from './invalid-exam-questions/invalid-exam-questions.module';
import { LatexModule } from './latex/latex.module';
import { OcrModule } from './ocr/ocr.module';
import { PapersModule } from './papers/papers.module';
import { QuestionsModule } from './questions/questions.module';
import { RedisModule } from './shared/redis/redis.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './shared/config/configuration';

// Entities
import { AiProcessedExamQuestion } from './model/entities/ai-processed-exam-question.entity';
import { Document } from './model/entities/document.entity';
import { ExamPaper } from './model/entities/exam-paper.entity';
import { ExamQuestion } from './model/entities/exam-question.entity';
import { ExamType } from './model/entities/exam-type.entity';
import { Subject } from './model/entities/subject.entity';
import { InvalidExamQuestion } from './model/entities/invalid-exam-question.entity';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    ScheduleModule.forRoot(),

    // ── PostgreSQL (async) ──────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host', 'localhost'),
        port: config.get<number>('database.port', 5432),
        username: config.get<string>('database.username', 'postgres'),
        password: config.get<string>('database.password', 'password'),
        database: config.get<string>('database.database', 'educore'),
        entities: [
          AiProcessedExamQuestion,
          Document,
          ExamPaper,
          ExamQuestion,
          ExamType,
          Subject,
          InvalidExamQuestion,
        ],
        // synchronize: config.get<string>('nodeEnv') !== 'production',
        // logging: config.get<string>('nodeEnv') === 'development',
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun:
          config.get<string>('nodeEnv') === 'production' &&
          config.get<boolean>('typeorm.runMigrationsOnStartup'),
      }),
    }),

    // ── Redis (async) ───────────────────────────────────────────────────────
    RedisModule,

    // ── BullMQ ─────────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const username = config.get<string | undefined>('redis.username');
        const password = config.get<string | undefined>('redis.password');
        return {
          connection: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
            ...(username ? { username } : {}),
            ...(password ? { password } : {}),
          },
        };
      },
    }),

    // ── Feature modules ────────────────────────────────────────────────────
    PapersModule,
    QuestionsModule,
    ExtractionModule,
    OcrModule,
    LatexModule,
    AnswerMatchingModule,
    AiEnrichmentModule,
    DocumentsModule,
    SubjectsModule,
    ExamTypesModule,
    AiProcessedQuestionsModule,
    InvalidExamQuestionsModule,
  ],
})
export class AppModule {}
