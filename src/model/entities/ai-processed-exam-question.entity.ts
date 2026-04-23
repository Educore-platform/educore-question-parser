import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExamQuestion } from './exam-question.entity';
import { AiProcessedStatus } from './enums';
import { QuestionOption } from './interfaces';

@Entity('ai_processed_exam_questions')
@Index('IDX_ai_processed_exam_questions_status', ['status'])
export class AiProcessedExamQuestion extends BaseEntity {
  @OneToOne(() => ExamQuestion, (question) => question.aiProcessedQuestion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exam_question_id' })
  examQuestion: ExamQuestion;

  @Column({ name: 'exam_question_id', type: 'uuid' })
  examQuestionId: string;

  @Column({ name: 'question_text', type: 'text', nullable: true })
  questionText: string | null;

  @Column({ name: 'question_latex', type: 'text', nullable: true })
  questionLatex: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options: QuestionOption[] | null;

  @Column({ type: 'varchar', nullable: true })
  answer: string | null;

  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({ type: 'varchar', nullable: true })
  topic: string | null;

  @Column({ name: 'related_topic', type: 'varchar', nullable: true })
  relatedTopic: string | null;

  @Column({
    type: 'enum',
    enum: AiProcessedStatus,
    default: AiProcessedStatus.PENDING,
  })
  status: AiProcessedStatus;
}
