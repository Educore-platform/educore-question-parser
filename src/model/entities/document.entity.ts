import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExamPaper } from './exam-paper.entity';
import { ExamQuestion } from './exam-question.entity';
import { DocumentType, DocumentSource, CloudinaryStatus } from './enums';
import type { DocumentMeta } from './interfaces';


@Entity('documents')
@Index(['examPaperId'])
@Index(['questionId'])
export class Document extends BaseEntity {
  // Null for manually entered questions (no source PDF)
  @ManyToOne(() => ExamPaper, (examPaper) => examPaper.documents, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'exam_paper_id' })
  examPaper: ExamPaper | null;

  @Column({ name: 'exam_paper_id', type: 'uuid', nullable: true, default: null })
  examPaperId: string | null;

  // Null for the source PDF document itself
  @ManyToOne(() => ExamQuestion, (question) => question.documents, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'question_id' })
  question: ExamQuestion | null;

  @Column({ name: 'question_id', type: 'uuid', nullable: true, default: null })
  questionId: string | null;

  @Column({ type: 'varchar', nullable: false })
  type: DocumentType; // pdf | image | table

  @Column({ type: 'varchar', nullable: false })
  source: DocumentSource; // uploaded | extracted | ocr

  @Column({
    name: 'cloudinary_status',
    type: 'enum',
    enum: CloudinaryStatus,
    enumName: 'cloudinary_status_enum',
    nullable: true,
    default: null,
  })
  cloudinaryStatus: CloudinaryStatus | null;

  @Column({ name: 'cloudinary_url', type: 'varchar', nullable: true, default: null })
  cloudinaryUrl: string | null;

  @Column({ name: 'cloudinary_public_id', type: 'varchar', nullable: true, default: null })
  cloudinaryPublicId: string | null;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true, default: null })
  storagePath: string | null;

  @Column({
    name: 'content_sha256',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  contentSha256: string | null;

  // Typed at the application layer via the DocumentMeta union above
  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  meta: DocumentMeta;
}
