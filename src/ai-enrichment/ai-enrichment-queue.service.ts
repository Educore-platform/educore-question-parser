import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'node:crypto';

import {
  AiEnrichmentJobPayload,
  QUEUE_NAMES,
} from '../shared/queues/queue-names';

@Injectable()
export class AiEnrichmentQueueService {
  private readonly logger = new Logger(AiEnrichmentQueueService.name);
  readonly batchSize: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.AI_ENRICHMENT)
    private readonly queue: Queue<AiEnrichmentJobPayload>,
  ) {
    this.batchSize = this.configService.getOrThrow<number>(
      'anthropic.batchSize',
    );
  }

  async enqueueBatches(questionIds: string[]): Promise<void> {
    if (!questionIds.length) return;

    const jobs = [];
    for (let i = 0; i < questionIds.length; i += this.batchSize) {
      jobs.push({
        name: QUEUE_NAMES.AI_ENRICHMENT,
        data: { questionIds: questionIds.slice(i, i + this.batchSize) },
        opts: {
          jobId: `enrich-${randomBytes(6).toString('hex')}`,
          removeOnComplete: true,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 60_000,
          },
        },
      });
    }

    await this.queue.addBulk(jobs);
    this.logger.log(
      `Enqueued ${jobs.length} enrichment batches for ${questionIds.length} questions`,
    );
  }
}
