import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Subject } from '../entities/subject.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SubjectRepository extends BaseRepository<Subject> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Subject, dataSource.manager);
  }
}
