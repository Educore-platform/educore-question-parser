import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcrProcessor } from './ocr.processor';
import { OcrService } from './ocr.service';
import { Document } from '../model/entities/document.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { DocumentRepository } from '../model/repositories/document.repository';
import { ExamQuestionRepository } from '../model/repositories/exam-question.repository';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { OCR_JOB_OPTIONS } from '../shared/queues/queue-defaults';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, ExamQuestion]),
    // Own queue
    BullModule.registerQueue({
      name: QUEUE_NAMES.OCR_SCANNING,
      defaultJobOptions: OCR_JOB_OPTIONS,
    }),
    // Next stage — enqueue latex-improvement after OCR
    BullModule.registerQueue({ name: QUEUE_NAMES.LATEX_IMPROVEMENT }),
  ],
  providers: [
    OcrProcessor,
    OcrService,
    DocumentRepository,
    ExamQuestionRepository,
  ],
  exports: [OcrService],
})
export class OcrModule {}
