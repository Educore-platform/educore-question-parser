import { YearDetectorService } from '../../../src/extraction/services/year-detector.service';

describe('YearDetectorService', () => {
  let service: YearDetectorService;

  beforeEach(() => {
    service = new YearDetectorService();
  });

  describe('detectYear', () => {
    it('returns current year unchanged when no year appears in text', () => {
      expect(
        service.detectYear('No digits that look like a year', '2023'),
      ).toEqual({ year: '2023', isNewYear: false });

      expect(service.detectYear('Roman XII', null)).toEqual({
        year: null,
        isNewYear: false,
      });
    });

    it('captures the first four-digit year in range 1900–2099', () => {
      expect(service.detectYear('Session 2024 papers', null)).toEqual({
        year: '2024',
        isNewYear: false,
      });
    });

    it('extracts year from titles like "Economics 2024"', () => {
      expect(service.detectYear('Economics 2024', null)).toEqual({
        year: '2024',
        isNewYear: false,
      });
    });

    it('does not treat a first calendar year as a boundary when none was set', () => {
      expect(service.detectYear('From 2023 onward', null)).toEqual({
        year: '2023',
        isNewYear: false,
      });
    });

    it('sets isNewYear when a different year follows an established year', () => {
      expect(service.detectYear('Material for 2024 cohort', '2023')).toEqual({
        year: '2024',
        isNewYear: true,
      });
    });

    it('does not flag a new year when the same year appears again', () => {
      expect(service.detectYear('Also 2023', '2023')).toEqual({
        year: '2023',
        isNewYear: false,
      });
    });

    it('uses word boundaries so plain substrings do not match', () => {
      expect(service.detectYear('code2012x', null).year).toBeNull();
    });

    it('does not treat a year as metadata when it is the first token after question numbering', () => {
      expect(service.detectYear('1. 2024', null)).toEqual({
        year: null,
        isNewYear: false,
      });

      expect(service.detectYear('12) 2024 extra text', null)).toEqual({
        year: null,
        isNewYear: false,
      });
    });

    it('still extracts a later year on the same line after real question content', () => {
      expect(service.detectYear('1. Explain inflation in 2024', null)).toEqual({
        year: '2024',
        isNewYear: false,
      });
    });

    it('uses the first acceptable year when an early match is skipped as question-leading', () => {
      expect(service.detectYear('2. 2023\nEconomics 2024', null)).toEqual({
        year: '2024',
        isNewYear: false,
      });
    });

    it('does not match years outside 1900–2099 (e.g. 2100, 1899)', () => {
      expect(service.detectYear('Paper from 2100', null).year).toBeNull();
      expect(service.detectYear('Ancient 1899 exam', null).year).toBeNull();
    });

    it('does not treat question-leading year as metadata when followed by closing paren style', () => {
      expect(service.detectYear('99) 2024 Intro', null)).toEqual({
        year: null,
        isNewYear: false,
      });
    });
  });
});
