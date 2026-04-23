import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

// Load env before anything else (mirrors what the app does via @nestjs/config)
dotenv.config();

import { AiProcessedExamQuestion } from '../model/entities/ai-processed-exam-question.entity';
import { Document } from '../model/entities/document.entity';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { ExamType } from '../model/entities/exam-type.entity';
import { Subject } from '../model/entities/subject.entity';
import { InvalidExamQuestion } from '../model/entities/invalid-exam-question.entity';

/** Resolves .ts migrations for ts-node CLI; .js when this file runs from dist/ */
const migrationsGlob = path.join(
  __dirname,
  'migrations',
  /[/\\]dist[/\\]/.test(__dirname) ? '*.js' : '*.ts',
);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'educore',

  entities: [
    AiProcessedExamQuestion,
    Document,
    ExamPaper,
    ExamQuestion,
    ExamType,
    Subject,
    InvalidExamQuestion,
  ],

  migrations: [migrationsGlob],

  // NEVER synchronize in production; rely on migrations instead
  synchronize: false,
  logging: false,
});
