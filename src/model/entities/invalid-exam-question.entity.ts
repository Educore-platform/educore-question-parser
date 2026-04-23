import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('invalid_exam_questions')
@Index('IDX_invalid_exam_questions_paper_id', ['paperId'])
export class InvalidExamQuestion extends BaseEntity {
  @Column({ name: 'paper_id', type: 'uuid', nullable: false })
  paperId: string;

  @Column({ name: 'page_number', type: 'int', nullable: false })
  pageNumber: number;

  @Column({ name: 'raw_text', type: 'text', nullable: false })
  rawText: string;

  @Column({ type: 'text', array: true, default: '{}' })
  errors: string[];
}
