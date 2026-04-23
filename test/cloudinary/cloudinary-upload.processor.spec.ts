jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { unlink } from 'fs/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { CloudinaryUploadProcessor } from '../../src/cloudinary/cloudinary-upload.processor';
import { Document } from '../../src/model/entities/document.entity';
import { CloudinaryStatus } from '../../src/model/entities/enums';
import { CloudinaryService } from '../../src/shared/cloudinary/cloudinary.service';
import {
  CloudinaryImageBatchPayload,
  CloudinaryPdfUploadPayload,
} from '../../src/shared/queues/queue-names';

describe('CloudinaryUploadProcessor', () => {
  let processor: CloudinaryUploadProcessor;
  let cloudinaryService: { uploadFile: jest.Mock };
  let documentRepo: { update: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    jest.mocked(unlink).mockClear();

    cloudinaryService = {
      uploadFile: jest.fn().mockResolvedValue({
        secureUrl: 'https://example.com/x',
        publicId: 'folder/x',
      }),
    };

    documentRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    configService = {
      get: jest.fn((_k: string, def?: number) => def ?? 5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryUploadProcessor,
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepo,
        },
      ],
    }).compile();

    processor = module.get(CloudinaryUploadProcessor);
  });

  it('uploads each image in a batch, updates rows, and unlinks locals', async () => {
    const payload: CloudinaryImageBatchPayload = {
      paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      items: [
        {
          documentId: '11111111-1111-1111-1111-111111111111',
          localPath: '/tmp/a.png',
        },
        {
          documentId: '22222222-2222-2222-2222-222222222222',
          localPath: '/tmp/b.png',
        },
      ],
    };

    const job = { data: payload } as Job<CloudinaryImageBatchPayload>;

    await processor.process(job);

    expect(cloudinaryService.uploadFile).toHaveBeenCalledTimes(2);
    expect(cloudinaryService.uploadFile).toHaveBeenNthCalledWith(
      1,
      '/tmp/a.png',
      'educore/papers/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/media',
      '11111111-1111-1111-1111-111111111111',
    );
    expect(documentRepo.update).toHaveBeenCalledTimes(2);
    expect(documentRepo.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      {
        cloudinaryUrl: 'https://example.com/x',
        cloudinaryPublicId: 'folder/x',
        cloudinaryStatus: CloudinaryStatus.UPLOADED,
        storagePath: null,
      },
    );
    expect(unlink).toHaveBeenCalledWith('/tmp/a.png');
    expect(unlink).toHaveBeenCalledWith('/tmp/b.png');
  });

  it('marks FAILED and does not unlink when one upload throws', async () => {
    cloudinaryService.uploadFile
      .mockResolvedValueOnce({
        secureUrl: 'https://example.com/ok',
        publicId: 'ok',
      })
      .mockRejectedValueOnce(new Error('upload failed'));

    const payload: CloudinaryImageBatchPayload = {
      paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      items: [
        {
          documentId: '11111111-1111-1111-1111-111111111111',
          localPath: '/tmp/a.png',
        },
        {
          documentId: '22222222-2222-2222-2222-222222222222',
          localPath: '/tmp/b.png',
        },
      ],
    };

    await processor.process({
      data: payload,
    } as Job<CloudinaryImageBatchPayload>);

    expect(documentRepo.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      {
        cloudinaryUrl: 'https://example.com/ok',
        cloudinaryPublicId: 'ok',
        cloudinaryStatus: CloudinaryStatus.UPLOADED,
        storagePath: null,
      },
    );
    expect(documentRepo.update).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
      {
        cloudinaryStatus: CloudinaryStatus.FAILED,
      },
    );
    expect(unlink).toHaveBeenCalledWith('/tmp/a.png');
    expect(unlink).not.toHaveBeenCalledWith('/tmp/b.png');
  });

  it('handles PDF payload', async () => {
    const payload: CloudinaryPdfUploadPayload = {
      paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      documentId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      localPath: '/uploads/file.pdf',
    };

    await processor.process({
      data: payload,
    } as Job<CloudinaryPdfUploadPayload>);

    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(
      '/uploads/file.pdf',
      'educore/papers/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/pdf',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
    );
    expect(documentRepo.update).toHaveBeenCalledWith(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      {
        cloudinaryUrl: 'https://example.com/x',
        cloudinaryPublicId: 'folder/x',
        cloudinaryStatus: CloudinaryStatus.UPLOADED,
        storagePath: null,
      },
    );
    expect(unlink).toHaveBeenCalledWith('/uploads/file.pdf');
  });
});
