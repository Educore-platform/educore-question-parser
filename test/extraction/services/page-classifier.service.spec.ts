import { PageClassifierService } from '../../../src/extraction/services/page-classifier.service';
import type { TextItem } from '../../../src/extraction/interfaces/extraction.interfaces';

function itemAtX(x: number): TextItem {
  return {
    str: 'x',
    dir: 'ltr',
    width: 1,
    height: 1,
    transform: [1, 0, 0, 1, x, 0],
    fontName: 'f',
    hasEOL: false,
  };
}

describe('PageClassifierService', () => {
  let service: PageClassifierService;

  beforeEach(() => {
    service = new PageClassifierService();
  });

  describe('classify', () => {
    it('returns SINGLE with FULL segment for empty items', () => {
      const layout = service.classify([], 600);

      expect(layout).toEqual({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [] }],
      });
    });

    it('returns SPLIT when enough items on left and right and few in dead zone', () => {
      const viewportWidth = 600;

      const leftSide = Array.from({ length: 6 }, (_, i) => itemAtX(40 + i));
      const rightSide = Array.from({ length: 6 }, (_, i) => itemAtX(520 + i));

      const items = [...leftSide, ...rightSide];

      const layout = service.classify(items, viewportWidth);

      expect(layout.type).toBe('SPLIT');
      expect(layout.segments).toHaveLength(2);
      expect(layout.segments[0].side).toBe('LEFT');
      expect(layout.segments[1].side).toBe('RIGHT');
      expect(layout.segments[0].items.length).toBeGreaterThan(5);
      expect(layout.segments[1].items.length).toBeGreaterThan(5);
    });

    it('returns SINGLE when columns are not dense enough on both sides', () => {
      const viewportWidth = 600;
      const mid = viewportWidth / 2;

      const fewLeft = Array.from({ length: 3 }, () => itemAtX(10));
      const manyRight = Array.from({ length: 10 }, (_, i) =>
        itemAtX(mid + 50 + i),
      );

      const layout = service.classify(
        [...fewLeft, ...manyRight],
        viewportWidth,
      );

      expect(layout.type).toBe('SINGLE');
      expect(layout.segments).toEqual([
        { side: 'FULL', items: [...fewLeft, ...manyRight] },
      ]);
    });

    it('returns SPLIT when a histogram gap exists and both sides still have enough items', () => {
      const viewportWidth = 600;
      const mid = viewportWidth / 2;

      const leftColumn = Array.from({ length: 6 }, () => itemAtX(40));
      const nearCenter = Array.from({ length: 4 }, (_, i) =>
        itemAtX(mid - 20 - i),
      );
      const rightColumn = Array.from({ length: 6 }, () => itemAtX(560));

      const items = [...leftColumn, ...nearCenter, ...rightColumn];

      const layout = service.classify(items, viewportWidth);

      expect(layout.type).toBe('SPLIT');
      expect(layout.segments).toHaveLength(2);
    });

    it('documents behavior for very small viewport width', () => {
      const items = [itemAtX(0), itemAtX(1)];
      const layout = service.classify(items, 1);

      expect(layout.type).toBe('SINGLE');
      expect(layout.segments[0].items).toEqual(items);
    });
  });
});
