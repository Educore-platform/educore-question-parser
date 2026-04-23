import { Injectable } from '@nestjs/common';
import { YearDetectionResult } from '../interfaces/extraction.interfaces';

const YEAR_PATTERN = /\b(19[7-9]\d|20[0-2]\d)\b/;
const OPTION_LINE = /^\s*[A-E][.)]\s+/i;
const CONTENT_NOISE = /[+*=^°/-]|Jmol|cm|kg|m\/s|Hz|\bmol\b/i;
const HEADER_KEYWORDS =
  /jamb|waec|neco|utme|past|question|paper|mathematics|physics|chemistry|biology|english|economics|government|accounting|commerce|literature|geography|agric|subject/i;
const SHORT_LINE_MAX = 35;
const QUESTION_PREFIX = /^\s*\d{1,3}[.)]\s+/;
const LEADING_YEAR = /^(19[7-9]\d|20[0-2]\d)\b/;

@Injectable()
export class YearDetectorService {
  detectYear(
    segmentText: string,
    currentYear: string | null,
  ): YearDetectionResult {
    const detectedYear = this.firstAcceptableYear(segmentText);
    if (!detectedYear) return { year: currentYear, isNewYear: false };

    const isNewYear = currentYear !== null && detectedYear !== currentYear;
    return { year: detectedYear, isNewYear };
  }

  private firstAcceptableYear(segmentText: string): string | null {
    let fallback: string | null = null;
    const yearGlobal = new RegExp(YEAR_PATTERN.source, 'g');

    for (const line of segmentText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (OPTION_LINE.test(trimmed) || CONTENT_NOISE.test(trimmed)) continue;

      const questionPrefixMatch = trimmed.match(QUESTION_PREFIX);
      if (questionPrefixMatch) {
        const rest = trimmed.slice(questionPrefixMatch[0].length);
        if (this.restStartsWithYear(rest)) {
          continue;
        }

        yearGlobal.lastIndex = 0;
        const yearMatches = [...trimmed.matchAll(yearGlobal)];
        const prefixEnd = questionPrefixMatch[0].length;
        const nonLeading = yearMatches.filter((m) => m.index! >= prefixEnd);
        if (nonLeading.length === 0) {
          continue;
        }
        const y = nonLeading[0][1];
        if (HEADER_KEYWORDS.test(trimmed)) {
          return y;
        }
        if (fallback === null && trimmed.length < SHORT_LINE_MAX) {
          fallback = y;
        }
        continue;
      }

      const yearMatch = YEAR_PATTERN.exec(trimmed);
      if (!yearMatch) continue;

      if (HEADER_KEYWORDS.test(trimmed)) {
        return yearMatch[1];
      }

      if (fallback === null && trimmed.length < SHORT_LINE_MAX) {
        fallback = yearMatch[1];
      }
    }

    return fallback;
  }

  private restStartsWithYear(rest: string): boolean {
    return LEADING_YEAR.test(rest.trimStart());
  }
}
