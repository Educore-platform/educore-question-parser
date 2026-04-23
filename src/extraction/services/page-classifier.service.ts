import { Injectable, Logger } from '@nestjs/common';
import { TextItem, PageLayout } from '../interfaces/extraction.interfaces';

const MIN_COLUMN_ITEMS = 5;
const GAP_BUCKET_COUNT = 50;

@Injectable()
export class PageClassifierService {
  private readonly logger = new Logger(PageClassifierService.name);

  classify(items: TextItem[], viewportWidth: number): PageLayout {
    if (!items.length) {
      return { type: 'SINGLE', segments: [{ side: 'FULL', items: [] }] };
    }

    const gap = this.findColumnGap(items, viewportWidth);

    if (!gap) {
      return {
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: this.sortTopToBottom(items) }],
      };
    }

    const leftItems = items.filter((i) => i.transform[4] < gap.start);
    const rightItems = items.filter((i) => i.transform[4] >= gap.end);

    if (
      leftItems.length < MIN_COLUMN_ITEMS ||
      rightItems.length < MIN_COLUMN_ITEMS
    ) {
      return {
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: this.sortTopToBottom(items) }],
      };
    }

    return {
      type: 'SPLIT',
      segments: [
        { side: 'LEFT', items: this.sortTopToBottom(leftItems) },
        { side: 'RIGHT', items: this.sortTopToBottom(rightItems) },
      ],
    };
  }

  private findColumnGap(
    items: TextItem[],
    viewportWidth: number,
  ): { start: number; end: number } | null {
    const bucketWidth = viewportWidth / GAP_BUCKET_COUNT;
    const density = new Array<number>(GAP_BUCKET_COUNT).fill(0);

    for (const item of items) {
      const x = item.transform[4];
      const bucketIndex = Math.min(
        Math.floor(x / bucketWidth),
        GAP_BUCKET_COUNT - 1,
      );
      density[bucketIndex]++;
    }

    // Only look for gaps in the middle third of the page — avoids margins
    const searchStart = Math.floor(GAP_BUCKET_COUNT / 3);
    const searchEnd = Math.floor((2 * GAP_BUCKET_COUNT) / 3);

    let bestGapStart = -1;
    let bestGapWidth = 0;
    let currentGapStart = -1;

    for (let i = searchStart; i <= searchEnd; i++) {
      if (density[i] === 0) {
        if (currentGapStart === -1) currentGapStart = i;
        const currentGapWidth = i - currentGapStart + 1;
        if (currentGapWidth > bestGapWidth) {
          bestGapWidth = currentGapWidth;
          bestGapStart = currentGapStart;
        }
      } else {
        currentGapStart = -1;
      }
    }

    if (bestGapStart === -1 || bestGapWidth < 2) return null;

    return {
      start: bestGapStart * bucketWidth,
      end: (bestGapStart + bestGapWidth) * bucketWidth,
    };
  }

  private sortTopToBottom(items: TextItem[]): TextItem[] {
    return [...items].sort((a, b) => b.transform[5] - a.transform[5]);
  }
}
