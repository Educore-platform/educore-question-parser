import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExamPaper } from './exam-paper.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity('subjects')
@Index('IDX_subjects_name_department', ['name', 'department'])
export class Subject extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string; // e.g. "Mathematics", "Chemistry"

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  code: string | null; // e.g. "math", "chem"

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'text', array: true, default: [] })
  aliases: string[];

  @OneToMany(() => ExamPaper, (examPaper) => examPaper.subject)
  examPapers: ExamPaper[];

  @OneToMany(() => ExamQuestion, (question) => question.subject)
  examQuestions: ExamQuestion[];
}
