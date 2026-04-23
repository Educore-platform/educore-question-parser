import { QuestionOption } from '../../model/entities/interfaces';

export class QuestionEnrichmentDto {
  id: string;
  questionText: string;
  questionLatex: string | null;
  options: QuestionOption[];
  answer: string | null;
  year: string;
  subject: string;
}
