import { Injectable } from '@nestjs/common';

const CHEMICAL_ELEMENTS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Fe', 'Cu', 'Zn', 'Ag', 'Au', 'Hg', 'Pb', 'I', 'Br',
]);

const GREEK_MAP: Record<string, string> = {
  'α': String.raw`\alpha`, 'β': String.raw`\beta`, 'γ': String.raw`\gamma`, 'δ': String.raw`\delta`,
  'θ': String.raw`\theta`, 'λ': String.raw`\lambda`, 'μ': String.raw`\mu`,  'π': String.raw`\pi`,
  'σ': String.raw`\sigma`, 'φ': String.raw`\phi`,   'ω': String.raw`\omega`,
};

const MATH_SIGNALS: RegExp[] = [
  /[+\-×÷=≠≥≤<>]/,
  /\^|[²³⁻₀-₉]/,
  /[α-ωΑ-Ω]/,
  /\d+\/\d+/,
  /\b(sin|cos|tan|log|ln|sqrt)\b/i,
  new RegExp(String.raw`\b(${[...CHEMICAL_ELEMENTS].join('|')})\d+`, 'g'),
];

@Injectable()
export class LatexClassifierService {
  needsLatex(text: string): boolean {
    return MATH_SIGNALS.some((pattern) => pattern.test(text));
  }

  convertToLatex(text: string): string {
    let result = text;

    // Greek letters first — before any other substitution touches those chars
    for (const [char, latex] of Object.entries(GREEK_MAP)) {
      result = result.replaceAll(char, latex);
    }

    // Chemical subscripts before fraction replacement to avoid double-processing digits
    result = result.replaceAll(
      new RegExp(String.raw`\b(${[...CHEMICAL_ELEMENTS].join('|')})(\d+)`, 'g'),
      '$1_{$2}',
    );

    // Fractions: 1/2 → \frac{1}{2}
    result = result.replaceAll(/(\d+)\/(\d+)/g, String.raw`\frac{$1}{$2}`);

    // Superscripts: x^2 → x^{2}
    result = result.replaceAll(/\^(\w+)/g, '^{$1}');

    return `$${result}$`;
  }

  process(text: string): { text: string; latex: string | null } {
    if (!this.needsLatex(text)) return { text, latex: null };
    return { text, latex: this.convertToLatex(text) };
  }
}