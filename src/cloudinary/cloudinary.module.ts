import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../model/entities/document.entity';
import { CloudinaryUploadProcessor } from './cloudinary-upload.processor';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service';
import { QUEUE_NAMES } from '../shared/queues/queue-names';
import { CLOUDINARY_UPLOAD_JOB_OPTIONS } from '../shared/queues/queue-defaults';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.CLOUDINARY_UPLOAD,
      defaultJobOptions: CLOUDINARY_UPLOAD_JOB_OPTIONS,
    }),
  ],
  providers: [CloudinaryService, CloudinaryUploadProcessor],
  exports: [BullModule, CloudinaryService],
})
export class CloudinaryModule {}
