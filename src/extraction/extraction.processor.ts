import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  PdfExtractionJobPayload,
} from '../shared/queues/queue-names';
import { ExtractionOrchestrator } from './extraction.orchestrator';

@Processor(QUEUE_NAMES.PDF_EXTRACTION)
export class ExtractionProcessor extends WorkerHost {
  constructor(private readonly orchestrator: ExtractionOrchestrator) {
    super();
  }

  async process(job: Job<PdfExtractionJobPayload>): Promise<void> {
    const { paperId, filePath } = job.data;
    await this.orchestrator.processPaper(paperId, filePath);
  }
}
