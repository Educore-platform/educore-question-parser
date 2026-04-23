import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { AiProcessedExamQuestion } from './ai-processed-exam-question.entity';
import { Document } from './document.entity';
import { ExamPaper } from './exam-paper.entity';
import { Subject } from './subject.entity';
import { QuestionIngestionSource, QuestionStatus } from './enums';
import { QuestionOption } from './interfaces';

@Entity('exam_questions')
@Index('IDX_exam_questions_paper_year', ['examPaperId', 'year'])
@Index('IDX_exam_questions_paper_status', ['examPaperId', 'status'])
@Index(['subjectId'])
export class ExamQuestion extends BaseEntity {
  // Null for manually entered questions
  @ManyToOne(() => ExamPaper, (examPaper) => examPaper.examQuestions, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'exam_paper_id' })
  examPaper: ExamPaper | null;

  @Column({
    name: 'exam_paper_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  examPaperId: string | null;

  @ManyToOne(() => Subject, (subject) => subject.examQuestions, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject | null;

  @Column({ name: 'subject_id', type: 'uuid', nullable: true, default: null })
  subjectId: string | null;

  @Column({ type: 'varchar', nullable: false })
  year: string; // e.g. "2023"

  @Column({ name: 'question_number', type: 'int', nullable: false })
  questionNumber: number;

  @Column({ name: 'question_text', type: 'text', nullable: false })
  questionText: string;

  // Raw best-effort LaTeX from extraction; null until latex step runs
  @Column({
    name: 'question_latex',
    type: 'text',
    nullable: true,
    default: null,
  })
  questionLatex: string | null;

  // [{ label, text, latex }]
  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  options: QuestionOption[];

  @Column({ type: 'varchar', nullable: true, default: null })
  answer: string | null;

  @Column({ name: 'has_media', type: 'boolean', default: false })
  hasMedia: boolean;

  // Null for manually entered questions
  @Column({ name: 'page_number', type: 'int', nullable: true, default: null })
  pageNumber: number | null;

  // left | right | full | null
  @Column({
    name: 'column_position',
    type: 'varchar',
    nullable: true,
    default: null,
  })
  columnPosition: string | null;

  @Column({ name: 'ingestion_source', type: 'varchar', nullable: false })
  ingestionSource: QuestionIngestionSource;

  @Column({ type: 'varchar', default: QuestionStatus.RAW })
  status: QuestionStatus;

  @Column({
    name: 'failure_reason',
    type: 'text',
    nullable: true,
    default: null,
  })
  failureReason: string | null;

  @OneToOne(
    () => AiProcessedExamQuestion,
    (aiProcessed) => aiProcessed.examQuestion,
  )
  aiProcessedQuestion: AiProcessedExamQuestion | null;

  @OneToMany(() => Document, (document) => document.question)
  documents: Document[];
}
