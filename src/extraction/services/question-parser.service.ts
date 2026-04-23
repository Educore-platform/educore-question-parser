import { Injectable, Logger } from '@nestjs/common';
import {
  TextItem,
  ParsedQuestion,
  ParseResult,
  ParserState,
  TextLine,
} from '../interfaces/extraction.interfaces';

const QUESTION_START_PATTERN = /^(\d{1,3})[.)]\s+(.+)/;

@Injectable()
export class QuestionParserService {
  private readonly logger = new Logger(QuestionParserService.name);

  initialState(): ParserState {
    return {
      currentQuestion: null,
      lastQuestionNumber: 0,
      awaitingContinuation: false,
    };
  }

  parseSegment(items: TextItem[], state: ParserState): ParseResult {
    const result: ParseResult = { completedQuestions: [] };

    for (const { text, y } of this.itemsToLines(items)) {
      if (!text) continue;

      const match = QUESTION_START_PATTERN.exec(text);
      if (match) {
        this.flushQuestion(state, result);
        const [, number, textPart] = match;
        state.currentQuestion = {
          questionNumber: Number.parseInt(number, 10),
          text: textPart,
          yPosition: y,
        };
        state.awaitingContinuation = true;
        continue;
      }

      if (state.awaitingContinuation && state.currentQuestion) {
        state.currentQuestion.text += '\n' + text;
      }
    }

    return result;
  }

  finalFlush(state: ParserState): ParsedQuestion[] {
    const result: ParseResult = { completedQuestions: [] };
    this.flushQuestion(state, result);
    return result.completedQuestions;
  }

  private flushQuestion(state: ParserState, result: ParseResult): void {
    const q = state.currentQuestion;
    if (
      q?.questionNumber === undefined ||
      q.text === undefined ||
      q.yPosition === undefined
    )
      return;

    this.logger.debug(
      `Flushing question ${q.questionNumber} (${q.text.length} chars) at Y=${q.yPosition}`,
    );

    result.completedQuestions.push({
      questionNumber: q.questionNumber,
      rawText: q.text,
      yPosition: q.yPosition,
    });

    state.lastQuestionNumber = q.questionNumber;
    state.currentQuestion = null;
    state.awaitingContinuation = false;
  }

  private itemsToLines(items: TextItem[]): TextLine[] {
    const lines: TextLine[] = [];
    let currentText = '';
    let lineY = 0;

    for (const item of items) {
      if (!currentText) lineY = item.transform?.[5] ?? 0;
      currentText += item.hasEOL ? item.str : item.str + ' ';

      if (item.hasEOL) {
        lines.push({ text: currentText.trim(), y: lineY });
        currentText = '';
      }
    }

    if (currentText.trim()) lines.push({ text: currentText.trim(), y: lineY });

    return lines;
  }
}
