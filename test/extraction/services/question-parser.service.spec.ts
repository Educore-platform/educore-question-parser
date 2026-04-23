import { QuestionParserService } from '../../../src/extraction/services/question-parser.service';
import type {
  ParseResult,
  ParserState,
  TextItem,
} from '../../../src/extraction/interfaces/extraction.interfaces';

function linesToTextItems(fullText: string): TextItem[] {
  return fullText.split('\n').map((str, i) => ({
    str,
    hasEOL: true,
    transform: [0, 0, 0, 0, 0, 100 - i * 20],
    width: str.length * 6,
    height: 12,
    dir: 'ltr',
    fontName: 'g_d0_f1',
  }));
}

describe('QuestionParserService', () => {
  let service: QuestionParserService;

  beforeEach(() => {
    service = new QuestionParserService();
  });

  describe('initialState', () => {
    it('returns empty parser state', () => {
      expect(service.initialState()).toEqual({
        currentQuestion: null,
        lastQuestionNumber: 0,
        awaitingContinuation: false,
      });
    });
  });

  describe('parseSegment', () => {
    it('captures a single-line question body without repeating the number prefix', () => {
      const state = service.initialState();
      const result = service.parseSegment(
        linesToTextItems('12. What is 2+2?'),
        state,
      );

      expect(result.completedQuestions).toHaveLength(0);
      expect(state.currentQuestion).toEqual({
        questionNumber: 12,
        text: 'What is 2+2?',
        yPosition: 100,
      });
      expect(state.awaitingContinuation).toBe(true);
    });

    it('accepts a closing parenthesis after the number and stores only the body text', () => {
      const state = service.initialState();
      service.parseSegment(linesToTextItems('3) Derive the formula'), state);

      expect(state.currentQuestion?.questionNumber).toBe(3);
      expect(state.currentQuestion?.text).toBe('Derive the formula');
      expect(state.currentQuestion?.yPosition).toBe(100);
    });

    it('appends continuation lines until the next question starts', () => {
      const state = service.initialState();
      const result = service.parseSegment(
        linesToTextItems(
          '1. First question\nextra line\nmore text\n2. Second question',
        ),
        state,
      );

      expect(result.completedQuestions).toHaveLength(1);
      expect(result.completedQuestions[0]).toEqual({
        questionNumber: 1,
        rawText: 'First question\nextra line\nmore text',
        yPosition: 100,
      });
      expect(state.currentQuestion?.questionNumber).toBe(2);
      expect(state.currentQuestion?.yPosition).toBe(40);
      expect(state.lastQuestionNumber).toBe(1);
    });

    it('flushes the previous question when a new question line appears', () => {
      const state = service.initialState();
      const result = service.parseSegment(
        linesToTextItems('1. One\n2. Two\n3. Three'),
        state,
      );

      expect(result.completedQuestions.map((q) => q.questionNumber)).toEqual([
        1, 2,
      ]);
      expect(result.completedQuestions[0].yPosition).toBe(100);
      expect(result.completedQuestions[1].yPosition).toBe(80);
      expect(state.currentQuestion?.questionNumber).toBe(3);
      expect(state.currentQuestion?.yPosition).toBe(60);
    });

    it('ignores blank lines', () => {
      const state = service.initialState();
      service.parseSegment(linesToTextItems('1. Only\n\n\nstill one'), state);

      expect(state.currentQuestion?.text).toContain('still one');
    });

    it('ignores preamble lines until the first numbered question', () => {
      const state = service.initialState();
      service.parseSegment(
        linesToTextItems('Header text\nInstructions here\n1. Real start'),
        state,
      );

      expect(state.currentQuestion?.text).toBe('Real start');
      expect(state.currentQuestion?.yPosition).toBe(60);
    });

    it('does not treat lines without required space after delimiter as a new question', () => {
      const state = service.initialState();
      service.parseSegment(linesToTextItems('1. Valid\n2.Invalid'), state);

      expect(state.currentQuestion?.text).toContain('2.Invalid');
    });
  });

  describe('flushQuestion', () => {
    it('moves the active question into completedQuestions and resets state', () => {
      const state: ParserState = {
        currentQuestion: {
          questionNumber: 7,
          text: 'Explain briefly.',
          yPosition: 0,
        },
        lastQuestionNumber: 0,
        awaitingContinuation: true,
      };
      const result: ParseResult = {
        completedQuestions: [],
      };

      service['flushQuestion'](state, result);

      expect(result.completedQuestions).toEqual([
        { questionNumber: 7, rawText: 'Explain briefly.', yPosition: 0 },
      ]);
      expect(state.currentQuestion).toBeNull();
      expect(state.awaitingContinuation).toBe(false);
      expect(state.lastQuestionNumber).toBe(7);
    });

    it('does nothing when there is no active question', () => {
      const state = service.initialState();
      const result: ParseResult = {
        completedQuestions: [],
      };

      service['flushQuestion'](state, result);

      expect(result.completedQuestions).toHaveLength(0);
    });
  });
});
