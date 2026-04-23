import { AnswerParserService } from '../../../src/extraction/services/answer-parser.service';

describe('AnswerParserService', () => {
  let service: AnswerParserService;

  const paperId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const year = '2024';

  beforeEach(() => {
    service = new AnswerParserService();
  });

  describe('parseAnswers', () => {
    it('prefers number-first rows like "1. A"', () => {
      const text = '1. A\n2. B\n3. C';
      expect(service.parseAnswers(text, paperId, year)).toEqual([
        {
          paperId,
          year,
          questionNumber: 1,
          correctOption: 'A',
        },
        {
          paperId,
          year,
          questionNumber: 2,
          correctOption: 'B',
        },
        {
          paperId,
          year,
          questionNumber: 3,
          correctOption: 'C',
        },
      ]);
    });

    it('accepts number-first with closing parenthesis delimiter', () => {
      expect(service.parseAnswers('10) D\n11) E', paperId, year)).toEqual([
        { paperId, year, questionNumber: 10, correctOption: 'D' },
        { paperId, year, questionNumber: 11, correctOption: 'E' },
      ]);
    });

    it('falls back to answer-first rows like "A 12." when no number-first matches', () => {
      expect(service.parseAnswers('D 42.', paperId, year)).toEqual([
        { paperId, year, questionNumber: 42, correctOption: 'D' },
      ]);
    });

    it('parses multiple answer-first rows without cross-line number-first false positives', () => {
      const text = 'A 1. tail\nB 2. tail';
      expect(service.parseAnswers(text, paperId, year)).toEqual([
        { paperId, year, questionNumber: 1, correctOption: 'A' },
        { paperId, year, questionNumber: 2, correctOption: 'B' },
      ]);
    });

    it('does not use answer-first when any number-first match exists', () => {
      const mixed = '1. A\nE 9.';
      expect(service.parseAnswers(mixed, paperId, year)).toEqual([
        { paperId, year, questionNumber: 1, correctOption: 'A' },
      ]);
    });

    it('returns empty array when nothing matches', () => {
      expect(service.parseAnswers('no answers here', paperId, year)).toEqual(
        [],
      );
    });
  });
});
