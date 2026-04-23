import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../shared/redis/redis.module';
import { ExtractionOrchestrator } from './extraction.orchestrator';
import { ExtractionProcessor } from './extraction.processor';
import { PdfLoaderService } from './services/pdf-loader.service';
import { PageClassifierService } from './services/page-classifier.service';
import { YearDetectorService } from './services/year-detector.service';
import { MediaHandlerService } from './services/media-handler.service';
import { QuestionParserService } from './services/question-parser.service';
import { OptionParserService } from './services/option-parser.service';
import { LatexClassifierService } from './services/latex-classifier.service';
import { ValidatorService } from './services/validator.service';
import { QuestionPersistenceService } from './services/question-persistence.service';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { Document } from '../model/entities/document.entity';
import { AiProcessedExamQuestion } from '../model/entities/ai-processed-exam-question.entity';
import { ExamPaperRepository } from '../model/repositories/exam-paper.repository';
import { DocumentRepository } from '../model/repositories/document.repository';
import { AiProcessedExamQuestionRepository } from '../model/repositories/ai-processed-exam-question.repository';
import { InvalidExamQuestionRepository } from '../model/repositories/invalid-exam-question.repository';
import { AnswerParserService } from './services/answer-parser.service';
import { InvalidExamQuestion } from '../model/entities/invalid-exam-question.entity';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import {
  PDF_EXTRACTION_JOB_OPTIONS,
  CLOUDINARY_UPLOAD_JOB_OPTIONS,
} from '../shared/queues/queue-defaults';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    TypeOrmModule.forFeature([
      ExamPaper,
      ExamQuestion,
      Document,
      AiProcessedExamQuestion,
      InvalidExamQuestion,
    ]),
    RedisModule, // Required for ParserState in Redis
    // Own queue — this module processes pdf-extraction jobs
    BullModule.registerQueue({
      name: QUEUE_NAMES.PDF_EXTRACTION,
      defaultJobOptions: PDF_EXTRACTION_JOB_OPTIONS,
    }),
    // Next stage — enqueue ocr-scanning jobs for image documents
    BullModule.registerQueue({ name: QUEUE_NAMES.OCR_SCANNING }),
    // Stages for question classification flow
    BullModule.registerQueue({ name: QUEUE_NAMES.LATEX_IMPROVEMENT }),
    BullModule.registerQueue({ name: QUEUE_NAMES.ANSWER_MATCHING }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CLOUDINARY_UPLOAD,
      defaultJobOptions: CLOUDINARY_UPLOAD_JOB_OPTIONS,
    }),
  ],
  providers: [
    ExtractionOrchestrator,
    ExtractionProcessor,
    ExamPaperRepository,
    DocumentRepository,
    AiProcessedExamQuestionRepository,
    PdfLoaderService,
    PageClassifierService,
    YearDetectorService,
    MediaHandlerService,
    QuestionParserService,
    OptionParserService,
    LatexClassifierService,
    ValidatorService,
    QuestionPersistenceService,
    AnswerParserService,
    InvalidExamQuestionRepository,
  ],
  exports: [ExtractionOrchestrator],
})
export class ExtractionModule {}
