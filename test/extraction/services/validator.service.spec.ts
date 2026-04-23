import { ValidatorService } from '../../../src/extraction/services/validator.service';
import { InvalidExamQuestionRepository } from '../../../src/model/repositories/invalid-exam-question.repository';
import type { QuestionValidationDraft } from '../../../src/extraction/interfaces/extraction.interfaces';

function validDraft(
  overrides: Partial<QuestionValidationDraft> = {},
): QuestionValidationDraft {
  return {
    paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    year: '2024',
    questionNumber: 1,
    questionText: 'Enough text here for validation',
    options: [
      { label: 'A', text: 'a' },
      { label: 'B', text: 'b' },
      { label: 'C', text: 'c' },
      { label: 'D', text: 'd' },
      { label: 'E', text: 'e' },
    ],
    ...overrides,
  };
}

describe('ValidatorService', () => {
  let service: ValidatorService;
  let invalidExamRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    invalidExamRepo = {
      create: jest.fn((payload: object) => payload),
      save: jest.fn().mockResolvedValue(undefined),
    };

    service = new ValidatorService(
      invalidExamRepo as unknown as InvalidExamQuestionRepository,
    );
  });

  describe('validate', () => {
    it('returns valid and does not persist when draft passes all checks', async () => {
      const draft = validDraft();

      await expect(service.validate(draft, 3)).resolves.toEqual({
        valid: true,
        errors: [],
      });

      expect(invalidExamRepo.save).not.toHaveBeenCalled();
    });

    it('aggregates errors and saves an invalid-exam row when validation fails', async () => {
      const draft = validDraft({
        questionNumber: 0,
        questionText: 'hi',
        year: null,
        options: [
          { label: 'A', text: 'a' },
          { label: 'C', text: 'c' },
        ],
      });

      const result = await service.validate(draft, 9);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Invalid question number',
          'Question text too short or empty',
          'No year context',
          expect.stringMatching(/Non-sequential option labels/),
        ]),
      );

      expect(invalidExamRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paperId: draft.paperId,
          pageNumber: 9,
          rawText: draft.questionText,
          errors: result.errors,
        }),
      );
      expect(invalidExamRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects non-sequential option labels before checking later rules', async () => {
      const draft = validDraft({
        options: [
          { label: 'A', text: 'a' },
          { label: 'C', text: 'c' },
        ],
      });

      const result = await service.validate(draft, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Non-sequential'))).toBe(
        true,
      );
      expect(invalidExamRepo.save).toHaveBeenCalled();
    });

    it('requires at least two options', async () => {
      const draft = validDraft({
        options: [{ label: 'A', text: 'only' }],
      });

      const result = await service.validate(draft, 1);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Too few options'))).toBe(
        true,
      );
    });
  });
});
