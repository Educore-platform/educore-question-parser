import { Injectable, Logger } from '@nestjs/common';
import {
  QuestionValidationDraft,
  ValidationResult,
} from '../interfaces/extraction.interfaces';
import { InvalidExamQuestionRepository } from '../../model/repositories/invalid-exam-question.repository';

const VALID_OPTION_SEQUENCE = ['A', 'B', 'C', 'D', 'E'];
const MIN_QUESTION_TEXT_LENGTH = 5;
const MIN_OPTIONS = 2;

@Injectable()
export class ValidatorService {
  private readonly logger = new Logger(ValidatorService.name);

  constructor(
    private readonly invalidExamRepo: InvalidExamQuestionRepository,
  ) {}

  async validate(
    draft: QuestionValidationDraft,
    pageNumber: number,
  ): Promise<ValidationResult> {
    const errors = this.runChecks(draft);

    if (errors.length > 0) {
      await this.invalidExamRepo.save(
        this.invalidExamRepo.create({
          paperId: draft.paperId,
          pageNumber,
          rawText: draft.questionText,
          errors,
        }),
      );
    }

    return { valid: errors.length === 0, errors };
  }

  private runChecks(draft: QuestionValidationDraft): string[] {
    const errors: string[] = [];

    if (!draft.questionNumber || draft.questionNumber < 1) {
      errors.push('Invalid question number');
    }

    if (
      !draft.questionText ||
      draft.questionText.trim().length < MIN_QUESTION_TEXT_LENGTH
    ) {
      errors.push('Question text too short or empty');
    }

    if (!draft.year) {
      errors.push('No year context');
    }

    if (draft.options.length < MIN_OPTIONS) {
      errors.push(`Too few options: ${draft.options.length}`);
      return errors;
    }

    const labels = draft.options.map((o) => o.label);
    const expectedSequence = VALID_OPTION_SEQUENCE.slice(0, labels.length);
    const isSequential = labels.every(
      (label, i) => label === expectedSequence[i],
    );

    if (!isSequential) {
      errors.push(`Non-sequential option labels: [${labels.join(', ')}]`);
    }

    return errors;
  }
}
