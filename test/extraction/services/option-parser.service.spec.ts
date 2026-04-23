import { OptionParserService } from '../../../src/extraction/services/option-parser.service';

/** `parseOptions` expects a single string; join spec lines like production text blocks. */
function optLines(...lines: string[]): string {
  return lines.join('\n');
}

describe('OptionParserService', () => {
  let service: OptionParserService;

  beforeEach(() => {
    service = new OptionParserService();
  });

  describe('parseOptions', () => {
    it('returns valid when A–E options are contiguous and non-empty', () => {
      const result = service.parseOptions(
        optLines(
          'A) First choice',
          'B) Second',
          'C) Third',
          'D) Fourth',
          'E) Fifth',
        ),
      );

      expect(result.valid).toBe(true);
      expect(result.options).toEqual([
        { label: 'A', text: 'First choice' },
        { label: 'B', text: 'Second' },
        { label: 'C', text: 'Third' },
        { label: 'D', text: 'Fourth' },
        { label: 'E', text: 'Fifth' },
      ]);
    });

    it('accepts a dot after the label', () => {
      const result = service.parseOptions(optLines('A. one', 'B. two'));

      expect(result.valid).toBe(true);
      expect(result.options).toHaveLength(2);
    });

    it('marks invalid when fewer than two options', () => {
      const onlyOne = service.parseOptions('A) Only');
      expect(onlyOne.valid).toBe(false);
      expect(onlyOne.options).toHaveLength(1);

      const none = service.parseOptions('not an option');
      expect(none.valid).toBe(false);
      expect(none.options).toHaveLength(0);
    });

    it('marks invalid when the first label is not A', () => {
      const result = service.parseOptions(optLines('B) wrong', 'C) also wrong'));

      expect(result.valid).toBe(false);
      expect(result.options.map((o) => o.label)).toEqual(['B', 'C']);
    });

    it('marks invalid when labels are not consecutive A, B, C, …', () => {
      const result = service.parseOptions(
        optLines('A) ok', 'B) ok', 'D) skipped C'),
      );

      expect(result.valid).toBe(false);
    });

    it('marks invalid when an option has only whitespace text', () => {
      const result = service.parseOptions(optLines('A)   ', 'B) fine'));

      expect(result.valid).toBe(false);
    });

    it('appends wrapped lines to the previous option', () => {
      const result = service.parseOptions(
        optLines(
          'A) First line',
          'continuation of A',
          'B) Second',
        ),
      );

      expect(result.valid).toBe(true);
      expect(result.options[0].text).toContain('First line');
      expect(result.options[0].text).toContain('continuation of A');
    });

    it('stops when a question line appears', () => {
      const result = service.parseOptions(
        optLines(
          'A) One',
          'B) Two',
          '10. New question starts here',
          'C) ignored',
        ),
      );

      expect(result.options).toHaveLength(2);
      expect(result.valid).toBe(true);
    });

    it('skips empty lines', () => {
      const result = service.parseOptions(
        optLines('A) A', '', 'B) B', '\t'),
      );

      expect(result.valid).toBe(true);
      expect(result.options).toHaveLength(2);
    });

    it('does not collect labels outside A–E', () => {
      const result = service.parseOptions(
        optLines(
          'A) ok',
          'B) ok',
          'C) ok',
          'D) ok',
          'E) ok',
          'F) ignored',
        ),
      );

      expect(result.options).toHaveLength(5);
      expect(result.valid).toBe(true);
    });

    it('ignores orphan lines before the first option label', () => {
      const result = service.parseOptions(
        optLines(
          'noise before options',
          'A) First',
          'B) Second',
        ),
      );

      expect(result.options.map((o) => o.label)).toEqual(['A', 'B']);
      expect(result.valid).toBe(true);
    });
  });
});
