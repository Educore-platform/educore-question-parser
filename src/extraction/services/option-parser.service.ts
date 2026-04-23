import { Injectable } from '@nestjs/common';
import {
  OptionDraft,
  OptionParseResult,
} from '../interfaces/extraction.interfaces';

const VALID_OPTION_SEQUENCE = ['A', 'B', 'C', 'D', 'E'];
const QUESTION_LINE = /^\s*\d{1,3}[.)]/;
const OPTION_LINE = /^\s*([A-E])[.)]\s*(.*)$/i;

@Injectable()
export class OptionParserService {
  parseOptions(text: string): OptionParseResult {
    const lines = text.split(/\r?\n/);
    const collected: OptionDraft[] = [];
    let buffer: { label: string; parts: string[] } | null = null;
    let lastLabelCode: number | null = null;

    const flush = (): void => {
      if (!buffer) return;
      collected.push({
        label: buffer.label,
        text: buffer.parts.join(' ').trim(),
      });
      buffer = null;
    };

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      if (QUESTION_LINE.test(trimmed)) {
        break;
      }

      if (this.isLabelPastE(trimmed)) {
        break;
      }

      const optMatch = trimmed.match(OPTION_LINE);
      if (optMatch) {
        flush();
        const label = optMatch[1].toUpperCase();
        const rest = optMatch[2].trimEnd();

        if (lastLabelCode !== null) {
          const expected = lastLabelCode + 1;
          if (label.charCodeAt(0) !== expected) {
            lastLabelCode = label.charCodeAt(0);
            buffer = { label, parts: rest ? [rest] : [] };
            continue;
          }
        }

        lastLabelCode = label.charCodeAt(0);
        buffer = { label, parts: rest ? [rest] : [] };
        continue;
      }

      if (buffer) {
        buffer.parts.push(trimmed);
      }
    }

    flush();

    const valid = this.isValidOptionSet(collected);
    return { valid, options: collected };
  }

  /** Lines like `F) …` end the MCQ block; do not append to option E. */
  private isLabelPastE(line: string): boolean {
    const m = line.match(/^\s*([A-Za-z])[.)]\s/);
    if (!m) return false;
    const ch = m[1].toUpperCase();
    return ch > 'E' && ch <= 'Z';
  }

  private isValidOptionSet(options: OptionDraft[]): boolean {
    if (options.length < 2) return false;
    if (!options.every((o) => o.text.length > 0)) return false;
    return options.every((o, i) => o.label === VALID_OPTION_SEQUENCE[i]);
  }
}
