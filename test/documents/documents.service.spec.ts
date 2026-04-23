import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentsService,
  PDF_SHA256_REDIS_PREFIX,
} from '../../src/documents/documents.service';
import { Document } from '../../src/model/entities/document.entity';
import { DocumentSource, DocumentType } from '../../src/model/entities/enums';
import { RedisService } from '../../src/shared/redis/redis.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: jest.Mocked<Pick<Repository<Document>, 'findOne'>>;
  let redisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let redisService: Pick<RedisService, 'getClient'>;

  const paperId = 'cccccccc-dddd-eeee-ffff-000000000001';

  beforeEach(async () => {
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };
    redisService = {
      getClient: jest.fn().mockReturnValue(redisClient),
    };
    documentRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: RedisService, useValue: redisService },
        { provide: getRepositoryToken(Document), useValue: documentRepo },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  describe('deleteHash', () => {
    it('calls redis.del with the hashed key when an uploaded PDF has contentSha256', async () => {
      documentRepo.findOne.mockResolvedValue({
        contentSha256: 'ab'.repeat(32),
      } as Document);

      await service.deleteHash(paperId);

      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: {
          examPaperId: paperId,
          type: DocumentType.PDF,
          source: DocumentSource.UPLOADED,
          contentSha256: expect.anything(),
        },
        select: ['contentSha256'],
      });
      expect(redisClient.del).toHaveBeenCalledWith(
        `${PDF_SHA256_REDIS_PREFIX}${'ab'.repeat(32)}`,
      );
    });

    it('does not call redis.del when no hashed document exists', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await service.deleteHash(paperId);

      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});
