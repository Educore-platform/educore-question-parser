import { Injectable } from '@nestjs/common';
import { YearDetectionResult } from '../interfaces/extraction.interfaces';

const YEAR_PATTERN = /\b(19[7-9]\d|20[0-2]\d)\b/;
const OPTION_LINE = /^\s*[A-E][.)]\s+/i;
const QUESTION_LINE = /^\s*\d{1,3}[.)]/;
const CONTENT_NOISE = /[+*\/=^°\-]|Jmol|cm|kg|m\/s|Hz|\bmol\b/i;
const HEADER_KEYWORDS =
  /jamb|waec|neco|utme|past|question|paper|mathematics|physics|chemistry|biology|english|economics|government|accounting|commerce|literature|geography|agric|subject/i;
const SHORT_LINE_MAX = 35;

@Injectable()
export class YearDetectorService {
  detectYear(segmentText: string, currentYear: string | null): YearDetectionResult {
    const detectedYear = this.firstAcceptableYear(segmentText);
    if (!detectedYear) return { year: currentYear, isNewYear: false };

    const isNewYear = currentYear !== null && detectedYear !== currentYear;
    return { year: detectedYear, isNewYear };
  }

  private firstAcceptableYear(segmentText: string): string | null {
    let fallback: string | null = null;

    for (const line of segmentText.split('\n')) {
      const trimmed = line.trim();
      const yearMatch = YEAR_PATTERN.exec(trimmed);

      if (
        !yearMatch ||
        OPTION_LINE.test(trimmed) ||
        QUESTION_LINE.test(trimmed) ||
        CONTENT_NOISE.test(trimmed)
      ) continue;

      if (HEADER_KEYWORDS.test(trimmed)) return yearMatch[1];

      if (fallback === null && trimmed.length < SHORT_LINE_MAX) {
        fallback = yearMatch[1];
      }
    }

    return fallback;
  }
}