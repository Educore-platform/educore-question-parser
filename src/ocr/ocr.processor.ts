import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OcrService } from './ocr.service';
import { Document } from '../model/entities/document.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import {
  OcrScanningJobPayload,
  QUEUE_NAMES,
} from '../shared/queues/queue-names';
import { DocumentMetaImage } from '../model/entities/interfaces';

@Processor(QUEUE_NAMES.OCR_SCANNING)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrService: OcrService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
  ) {
    super();
  }

  async process(job: Job<OcrScanningJobPayload>): Promise<void> {
    const { documentId, filePath } = job.data;

    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      this.logger.error(`Document ${documentId} not found`);
      return;
    }

    const ocrText = await this.ocrService.recognise(filePath);
    if (!ocrText) {
      this.logger.warn(`OCR returned no text for document ${documentId}`);
      return;
    }

    const meta = doc.meta as DocumentMetaImage;

    await this.documentRepo.update(documentId, {
      meta: { ...meta, ocr_text: ocrText },
    });

    if (meta.is_question_image && doc.questionId) {
      await this.questionRepo.update(doc.questionId, { questionText: ocrText });
      this.logger.log(`Updated question ${doc.questionId} with OCR text`);
    }

    this.logger.log(`OCR completed for document ${documentId}`);
  }
}
