import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { QuestionPersistenceService } from '../../../src/extraction/services/question-persistence.service';
import { ExamQuestion } from '../../../src/model/entities/exam-question.entity';
import {
  QuestionIngestionSource,
  QuestionStatus,
} from '../../../src/model/entities/enums';

describe('QuestionPersistenceService', () => {
  let service: QuestionPersistenceService;
  let repo: jest.Mocked<
    Pick<Repository<ExamQuestion>, 'create' | 'save'>
  >;

  beforeEach(async () => {
    repo = {
      create: jest.fn((entity) => entity as ExamQuestion),
      save: jest.fn(async (entity: ExamQuestion) => ({
        ...entity,
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionPersistenceService,
        { provide: getRepositoryToken(ExamQuestion), useValue: repo },
      ],
    }).compile();

    service = module.get(QuestionPersistenceService);
  });

  describe('save', () => {
    const basePayload = {
      paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      year: '2024',
      pageNumber: 3,
      questionNumber: 5,
      questionText: 'Compute',
      questionLatex: null as string | null,
      options: [
        { label: 'A', text: 'one', latex: null as string | null },
        { label: 'B', text: 'two', latex: null as string | null },
      ],
    };

    it('persists RAW status when needsLatex is false', async () => {
      await service.save({ ...basePayload, needsLatex: false });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QuestionStatus.RAW,
          ingestionSource: QuestionIngestionSource.PDF,
          examPaperId: basePayload.paperId,
          year: basePayload.year,
          pageNumber: basePayload.pageNumber,
          questionNumber: basePayload.questionNumber,
          questionText: basePayload.questionText,
          questionLatex: null,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('persists LATEX_QUEUED when needsLatex is true', async () => {
      await service.save({
        ...basePayload,
        needsLatex: true,
        questionLatex: '$x$',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QuestionStatus.LATEX_QUEUED,
        }),
      );
    });

    it('stores options JSON from payload', async () => {
      const options = [
        { label: 'A', text: 'a', latex: '$1$' as string | null },
      ];
      await service.save({
        ...basePayload,
        options,
        needsLatex: true,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          options,
        }),
      );
    });

    it('handles edge case year string "Unknown"', async () => {
      await service.save({
        ...basePayload,
        year: 'Unknown',
        needsLatex: false,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ year: 'Unknown' }),
      );
    });
  });
});
