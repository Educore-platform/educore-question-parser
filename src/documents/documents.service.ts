import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { Document } from '../model/entities/document.entity';
import { DocumentSource, DocumentType } from '../model/entities/enums';
import { RedisService } from '../shared/redis/redis.service';
import { PaginatedResponseDto } from '../shared/dto/pagination.dto';
import { paginationOptions } from '../shared/utils/paginate.util';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { DocumentListItemDto } from './dto/document-list-item.dto';

export const PDF_SHA256_REDIS_PREFIX = 'pdf:sha256:';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly redisService: RedisService,
  ) {}

  async hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    await pipeline(createReadStream(filePath), hash);
    return hash.digest('hex');
  }

  async isDuplicate(
    hash: string,
  ): Promise<{ duplicate: boolean; existingPaperId?: string }> {
    const key = `${PDF_SHA256_REDIS_PREFIX}${hash}`;

    try {
      const cached = await this.redisService.getClient().get(key);
      if (cached) return { duplicate: true, existingPaperId: cached };
    } catch (err) {
      this.logger.warn(
        'Redis unavailable for duplicate check, falling back to DB',
        err,
      );
    }

    const doc = await this.documentRepo.findOne({
      where: { contentSha256: hash },
      select: ['examPaperId'],
    });

    if (!doc?.examPaperId) return { duplicate: false };

    try {
      await this.redisService.getClient().set(key, doc.examPaperId);
    } catch (err) {
      this.logger.warn(
        `Failed to cache pdf hash for paper ${doc.examPaperId}`,
        err,
      );
    }

    return { duplicate: true, existingPaperId: doc.examPaperId };
  }

  async rememberHash(hash: string, paperId: string): Promise<void> {
    try {
      await this.redisService
        .getClient()
        .set(`${PDF_SHA256_REDIS_PREFIX}${hash}`, paperId);
    } catch (err) {
      this.logger.warn(`Failed to cache pdf hash for paper ${paperId}`, err);
    }
  }

  async deleteHash(paperId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({
      where: {
        examPaperId: paperId,
        type: DocumentType.PDF,
        source: DocumentSource.UPLOADED,
        contentSha256: Not(IsNull()),
      },
      select: ['contentSha256'],
    });

    if (!doc?.contentSha256) return;

    try {
      await this.redisService
        .getClient()
        .del(`${PDF_SHA256_REDIS_PREFIX}${doc.contentSha256}`);
    } catch (err) {
      this.logger.warn(
        `Failed to delete pdf hash cache for paper ${paperId}`,
        err,
      );
    }
  }

  async findAll(
    filter: DocumentFilterDto,
  ): Promise<PaginatedResponseDto<DocumentListItemDto>> {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .select([
        'doc.id',
        'doc.type',
        'doc.source',
        'doc.cloudinaryStatus',
        'doc.examPaperId',
        'doc.createdAt',
      ]);

    if (filter.examPaperId) {
      qb.andWhere('doc.examPaperId = :examPaperId', {
        examPaperId: filter.examPaperId,
      });
    }
    if (filter.questionId) {
      qb.andWhere('doc.questionId = :questionId', {
        questionId: filter.questionId,
      });
    }
    if (filter.type) {
      qb.andWhere('doc.type = :type', { type: filter.type });
    }

    const { skip, take } = paginationOptions(filter);
    qb.skip(skip).take(take).orderBy('doc.createdAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return PaginatedResponseDto.of(
      items as DocumentListItemDto[],
      total,
      filter,
    );
  }

  async findOne(id: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
