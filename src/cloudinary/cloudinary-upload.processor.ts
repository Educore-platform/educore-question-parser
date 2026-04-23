import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'fs/promises';
import { Repository } from 'typeorm';
import pLimit from 'p-limit';
import { ConfigService } from '@nestjs/config';
import { Document } from '../model/entities/document.entity';
import { CloudinaryStatus } from '../model/entities/enums';
import { QUEUE_NAMES, CloudinaryImageBatchPayload, CloudinaryPdfUploadPayload } from '../shared/queues/queue-names';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service';

function isImageBatchPayload(
  data: CloudinaryImageBatchPayload | CloudinaryPdfUploadPayload,
): data is CloudinaryImageBatchPayload {
  return Array.isArray((data as CloudinaryImageBatchPayload).items);
}

/** Top-level Cloudinary folder for all Educore assets. */
const CLOUDINARY_ROOT = 'educore';

function cloudinaryPaperMediaFolder(paperId: string): string {
  return `${CLOUDINARY_ROOT}/papers/${paperId}/media`;
}

function cloudinaryPaperPdfFolder(paperId: string): string {
  return `${CLOUDINARY_ROOT}/papers/${paperId}/pdf`;
}

@Injectable()
@Processor(QUEUE_NAMES.CLOUDINARY_UPLOAD)
export class CloudinaryUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(CloudinaryUploadProcessor.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {
    super();
  }

  async process(
    job: Job<CloudinaryImageBatchPayload | CloudinaryPdfUploadPayload>,
  ): Promise<void> {
    if (isImageBatchPayload(job.data)) {
      await this.processImageBatch(job.data);
      return;
    }
    await this.processPdf(job.data);
  }

  private async processImageBatch(payload: CloudinaryImageBatchPayload): Promise<void> {
    const concurrency = this.configService.get<number>('cloudinary.uploadConcurrency', 5);
    const limit = pLimit(concurrency);
    await Promise.all(
      payload.items.map((item) =>
        limit(() => this.processImageItem(payload.paperId, item.documentId, item.localPath)),
      ),
    );
  }

  private async processImageItem(
    paperId: string,
    documentId: string,
    localPath: string,
  ): Promise<void> {
    const folder = cloudinaryPaperMediaFolder(paperId);
    try {
      const { secureUrl, publicId } = await this.cloudinaryService.uploadFile(
        localPath,
        folder,
        documentId,
      );
      await this.documentRepo.update(documentId, {
        cloudinaryUrl: secureUrl,
        cloudinaryPublicId: publicId,
        cloudinaryStatus: CloudinaryStatus.UPLOADED,
        storagePath: null,
      });
      await unlink(localPath);
    } catch (err) {
      this.logger.error(`Cloudinary upload failed for document ${documentId}`, err);
      await this.documentRepo.update(documentId, {
        cloudinaryStatus: CloudinaryStatus.FAILED,
      });
    }
  }

  private async processPdf(payload: CloudinaryPdfUploadPayload): Promise<void> {
    const folder = cloudinaryPaperPdfFolder(payload.paperId);
    try {
      const { secureUrl, publicId } = await this.cloudinaryService.uploadFile(
        payload.localPath,
        folder,
        payload.documentId,
      );
      await this.documentRepo.update(payload.documentId, {
        cloudinaryUrl: secureUrl,
        cloudinaryPublicId: publicId,
        cloudinaryStatus: CloudinaryStatus.UPLOADED,
        storagePath: null,
      });
      await unlink(payload.localPath);
    } catch (err) {
      this.logger.error(`Cloudinary PDF upload failed for paper ${payload.paperId}`, err);
      await this.documentRepo.update(payload.documentId, {
        cloudinaryStatus: CloudinaryStatus.FAILED,
      });
    }
  }
}
