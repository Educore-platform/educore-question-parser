import { Injectable } from '@nestjs/common';
import { AnswerKeyDraft } from '../interfaces/extraction.interfaces';

// Matches "1. A" or "1) A"
const NUMBER_FIRST_PATTERN = /(\d{1,3})[.)]\s*([A-E])\b/g;

// Matches "A 1." or "A 1)" — answer-first format found in Nigerian exam PDFs
const ANSWER_FIRST_PATTERN = /\b([A-E])\s+(\d{1,3})[.)]/g;

@Injectable()
export class AnswerParserService {
  parseAnswers(segmentText: string, paperId: string, year: string): AnswerKeyDraft[] {
    const numberFirst = this.matchNumberFirst(segmentText, paperId, year);
    if (numberFirst.length > 0) return numberFirst;

    return this.matchAnswerFirst(segmentText, paperId, year);
  }

  private matchNumberFirst(text: string, paperId: string, year: string): AnswerKeyDraft[] {
    const answers: AnswerKeyDraft[] = [];
    for (const match of text.matchAll(NUMBER_FIRST_PATTERN)) {
      answers.push({
        paperId,
        year,
        questionNumber: Number.parseInt(match[1], 10),
        correctOption: match[2],
      });
    }
    return answers;
  }

  private matchAnswerFirst(text: string, paperId: string, year: string): AnswerKeyDraft[] {
    const answers: AnswerKeyDraft[] = [];
    for (const match of text.matchAll(ANSWER_FIRST_PATTERN)) {
      answers.push({
        paperId,
        year,
        questionNumber: Number.parseInt(match[2], 10),
        correctOption: match[1],
      });
    }
    return answers;
  }
}