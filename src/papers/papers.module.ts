import { Module, BadRequestException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { PapersController } from './papers.controller';
import { PapersService } from './papers.service';
import { DocumentsModule } from '../documents/documents.module';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { ExamType } from '../model/entities/exam-type.entity';
import { Subject } from '../model/entities/subject.entity';
import { QUEUE_NAMES } from '../shared/queues/queue-names';

@Module({
  imports: [
    DocumentsModule,
    TypeOrmModule.forFeature([ExamPaper, ExamQuestion, ExamType, Subject]),
    BullModule.registerQueue({ name: QUEUE_NAMES.PDF_EXTRACTION }),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dest: config.get<string>('upload.dir'),
        fileFilter: (req, file, cb) => {
          if (file.mimetype !== 'application/pdf') {
            return cb(new BadRequestException('Only PDF files are accepted'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: config.get<number>('upload.maxSizeMB', 50) * 1024 * 1024,
          files: config.get<number>('upload.maxFiles'),
        },
      }),
    }),
  ],
  controllers: [PapersController],
  providers: [PapersService],
  exports: [PapersService],
})
export class PapersModule {}
