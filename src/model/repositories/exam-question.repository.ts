import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { ExamQuestion } from '../entities/exam-question.entity';
import { BaseRepository } from './base.repository';
import { QuestionStatus } from '../entities/enums';

@Injectable()
export class ExamQuestionRepository extends BaseRepository<ExamQuestion> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(ExamQuestion, dataSource.manager);
  }

  async claimQuestionsForEnrichment(limit: number): Promise<ExamQuestion[]> {
    return this.manager.transaction(async (em) => {
      const claimed = await em
        .createQueryBuilder(ExamQuestion, 'q')
        .select('q.id')
        .where('q.status IN (:...statuses)', {
          statuses: [QuestionStatus.ANSWER_MATCHED, QuestionStatus.LATEX_DONE],
        })
        .orderBy('q.createdAt', 'ASC')
        .take(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      if (!claimed.length) return [];

      const ids = claimed.map((q) => q.id);

      await em.update(
        ExamQuestion,
        { id: In(ids) },
        { status: QuestionStatus.ENRICHING },
      );

      return em.find(ExamQuestion, {
        where: { id: In(ids) },
        relations: ['subject', 'examPaper'],
      });
    });
  }
}
