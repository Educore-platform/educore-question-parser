import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';

const OCR_TIMEOUT_MS = 30_000;

@Injectable()
export class OcrService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);
  private worker: Worker | null = null;

  async onModuleInit(): Promise<void> {
    this.worker = await createWorker('eng');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.terminate();
    this.worker = null;
  }

  async recognise(imagePath: string): Promise<string | null> {
    if (!this.worker) {
      this.logger.error('Tesseract worker not available');
      return null;
    }

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT_MS),
      );
      const {
        data: { text },
      } = await Promise.race([this.worker.recognize(imagePath), timeout]);
      return text.trim() || null;
    } catch (error) {
      this.logger.error(`OCR failed for ${imagePath}: ${error.message}`);
      return null;
    }
  }
}
