import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Document } from './document.entity';
import { ExamQuestion } from './exam-question.entity';
import { ExamType } from './exam-type.entity';
import { Subject } from './subject.entity';
import { ExamPaperStatus } from './enums';

@Entity('exam_papers')
@Index(['examTypeId', 'subjectId'])
@Index('IDX_exam_papers_status', ['status'])
export class ExamPaper extends BaseEntity {
  @ManyToOne(() => ExamType, (examType) => examType.examPapers, {
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: 'exam_type_id' })
  examType: ExamType;

  @Column({ name: 'exam_type_id', type: 'uuid', nullable: false })
  examTypeId: string;

  @ManyToOne(() => Subject, (subject) => subject.examPapers, {
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id', type: 'uuid', nullable: false })
  subjectId: string;

  // e.g. "JAMB Mathematics 2021–2025"
  @Column({ type: 'varchar', nullable: true, default: null })
  title: string | null;

  @Column({
    type: 'varchar',
    default: ExamPaperStatus.PENDING,
  })
  status: ExamPaperStatus;

  @Column({ name: 'failure_reason', type: 'text', nullable: true, default: null })
  failureReason: string | null;

  @Column({ name: 'total_pages', type: 'int', nullable: true, default: null })
  totalPages: number | null;

  // Populated after PDF extraction; e.g. ["2021","2022","2023"]
  @Column({
    name: 'years_detected',
    type: 'text',
    array: true,
    default: '{}',
  })
  yearsDetected: string[];

  @OneToMany(() => ExamQuestion, (examQuestion) => examQuestion.examPaper)
  examQuestions: ExamQuestion[];

  @OneToMany(() => Document, (document) => document.examPaper)
  documents: Document[];
}
