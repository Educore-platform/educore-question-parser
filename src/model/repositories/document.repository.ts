import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Document } from '../entities/document.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class DocumentRepository extends BaseRepository<Document> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Document, dataSource.manager);
  }
}
