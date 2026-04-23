import { LatexClassifierService } from '../../../src/extraction/services/latex-classifier.service';

describe('LatexClassifierService', () => {
  let service: LatexClassifierService;

  beforeEach(() => {
    service = new LatexClassifierService();
  });

  describe('needsLatex', () => {
    it('returns false for plain prose', () => {
      expect(service.needsLatex('Explain the water cycle.')).toBe(false);
    });

    it('detects arithmetic operators', () => {
      expect(service.needsLatex('x + y = z')).toBe(true);
      expect(service.needsLatex('a × b')).toBe(true);
      expect(service.needsLatex('p ≠ q')).toBe(true);
    });

    it('detects superscripts and Unicode superscripts/subscripts', () => {
      expect(service.needsLatex('E = mc²')).toBe(true);
      expect(service.needsLatex('x³')).toBe(true);
      expect(service.needsLatex('H₂O')).toBe(true);
    });

    it('detects Greek letters', () => {
      expect(service.needsLatex('angle θ')).toBe(true);
      expect(service.needsLatex('Δx')).toBe(true);
    });

    it('detects numeric fractions', () => {
      expect(service.needsLatex('half is 1/2')).toBe(true);
    });

    it('detects trig and log tokens', () => {
      expect(service.needsLatex('compute sin(x)')).toBe(true);
      expect(service.needsLatex('ln 10')).toBe(true);
    });

    it('detects chemical element subscript notation like H2', () => {
      expect(service.needsLatex('H2 combustion')).toBe(true);
    });

    it('does not treat CO2 as element+digits (O follows C, not digits)', () => {
      expect(service.needsLatex('CO2')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(service.needsLatex('')).toBe(false);
    });
  });

  describe('process', () => {
    it('returns latex null when needsLatex is false', () => {
      expect(service.process('Plain text.')).toEqual({
        text: 'Plain text.',
        latex: null,
      });
    });

    it('wraps converted content in math delimiters when signals present', () => {
      const out = service.process('α + β');
      expect(out.text).toBe('α + β');
      expect(out.latex).toMatch(/^\$/);
      expect(out.latex).toMatch(/\$$/);
      expect(out.latex).toContain(String.raw`\alpha`);
      expect(out.latex).toContain(String.raw`\beta`);
    });

    it('converts fractions and chemical subscripts in convertToLatex path', () => {
      const out = service.process('H2 and 1/2');
      expect(out.latex).toContain('_{2}');
      expect(out.latex).toContain(String.raw`\frac{1}{2}`);
    });

    it('handles edge case with only superscript marker', () => {
      const out = service.process('x^2');
      expect(out.latex).not.toBeNull();
      expect(out.latex!.includes('^')).toBe(true);
    });
  });

  describe('convertToLatex', () => {
    it('wraps entire string as inline math', () => {
      const latex = service.convertToLatex('1+1');
      expect(latex.startsWith('$')).toBe(true);
      expect(latex.endsWith('$')).toBe(true);
    });
  });
});
