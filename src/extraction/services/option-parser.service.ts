import { Injectable } from '@nestjs/common';
import {
  OptionDraft,
  OptionParseResult,
} from '../interfaces/extraction.interfaces';

const OPTION_PATTERN = /([A-E])[.)]\s+(.+?)(?=(?:[A-E][.)]\s+)|$)/gis;
const VALID_OPTION_SEQUENCE = ['A', 'B', 'C', 'D', 'E'];

@Injectable()
export class OptionParserService {
  parseOptions(text: string): OptionParseResult {
    const optionMap = new Map<string, string>();
    const pattern = new RegExp(OPTION_PATTERN.source, OPTION_PATTERN.flags);

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const label = match[1].toUpperCase();
      if (!optionMap.has(label)) {
        optionMap.set(label, match[2].trim());
      }
    }

    const sorted = Array.from(optionMap.entries())
      .sort(([a], [b]) => a.codePointAt(0)! - b.codePointAt(0)!)
      .map(([label, text]): OptionDraft => ({ label, text }));

    const options = this.extractSequential(sorted);
    return { valid: this.isValidOptionSet(options), options };
  }

  private extractSequential(options: OptionDraft[]): OptionDraft[] {
    if (!options.length || options[0].label !== 'A') return options;

    const sequential: OptionDraft[] = [options[0]];
    for (let i = 1; i < options.length; i++) {
      if (options[i].label !== VALID_OPTION_SEQUENCE[i]) break;
      sequential.push(options[i]);
    }
    return sequential;
  }

  private isValidOptionSet(options: OptionDraft[]): boolean {
    return (
      options.length >= 2 &&
      options.every(
        (o, i) => o.label === VALID_OPTION_SEQUENCE[i] && o.text.length > 0,
      )
    );
  }
}
