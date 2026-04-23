import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExamPaper } from './exam-paper.entity';

@Entity('exam_types')
export class ExamType extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string; // e.g. "JOINT MATRICULATION EXAMINATION",

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  code: string | null; // e.g. "JAMB", "WAEC", "NECO", "NABTEB"

  @OneToMany(() => ExamPaper, (examPaper) => examPaper.examType)
  examPapers: ExamPaper[];
}
