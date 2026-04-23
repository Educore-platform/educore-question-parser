import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createCanvas, ImageData } from 'canvas';
import { TextItem, ExtractedImage, ExtractedTable, PdfJsImage, TableRow } from '../interfaces/extraction.interfaces';

const PDF_OPS = {
  TRANSFORM: 12,
  PAINT_IMAGE_XOBJECT: 25,
  PAINT_INLINE_IMAGE_XOBJECT: 26,
} as const;

const IDENTITY_TRANSFORM = [1, 0, 0, 1, 0, 0] as const;
const TABLE_MIN_COLS = 3;
const TABLE_MIN_ROWS = 3;
const TABLE_ROW_GAP = 30;
const ROW_Y_TOLERANCE = 5;
const SCANNED_MIN_DIMENSION = 100;

@Injectable()
export class MediaHandlerService implements OnModuleInit {
  private readonly logger = new Logger(MediaHandlerService.name);
  private readonly mediaDir: string;

  constructor(private readonly configService: ConfigService) {
    this.mediaDir = this.configService.get<string>('media.dir') ?? './media';
  }

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.mediaDir, { recursive: true });
  }

  async extractImages(page: any, pageNum: number): Promise<ExtractedImage[]> {
    const opList = await page.getOperatorList();
    const images: ExtractedImage[] = [];
    let currentTransform = [...IDENTITY_TRANSFORM];

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === PDF_OPS.TRANSFORM) {
        currentTransform = args;
        continue;
      }

      if (fn !== PDF_OPS.PAINT_IMAGE_XOBJECT && fn !== PDF_OPS.PAINT_INLINE_IMAGE_XOBJECT) continue;

      const imgName = args[0];
      try {
        const img: PdfJsImage = await page.objs.get(imgName);
        if (!img) continue;

        const fileName = `page_${pageNum}_img_${i}.png`;
        const filePath = path.join(this.mediaDir, fileName);
        await fs.writeFile(filePath, await this.renderImageToBuffer(img));

        images.push({
          type: 'image',
          filePath,
          yPosition: currentTransform[5],
          width: img.width,
          height: img.height,
          isScanned: false,
        });
      } catch (err) {
        this.logger.error(`Failed to extract image ${imgName} on page ${pageNum}`, err);
      }
    }

    return images;
  }

  private async renderImageToBuffer(img: PdfJsImage): Promise<Buffer> {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
    return canvas.toBuffer('image/png');
  }

  detectTables(items: TextItem[]): ExtractedTable[] {
    const tableRows = this.groupByY(items, ROW_Y_TOLERANCE)
      .filter((row) => row.items.length >= TABLE_MIN_COLS);

    if (tableRows.length < TABLE_MIN_ROWS) return [];

    const tables: ExtractedTable[] = [];
    let currentGroup: TableRow[] = [tableRows[0]];

    for (let i = 1; i < tableRows.length; i++) {
      const gap = Math.abs(tableRows[i - 1].y - tableRows[i].y);
      if (gap < TABLE_ROW_GAP) {
        currentGroup.push(tableRows[i]);
      } else {
        if (currentGroup.length >= TABLE_MIN_ROWS) tables.push(this.formatTable(currentGroup));
        currentGroup = [tableRows[i]];
      }
    }

    if (currentGroup.length >= TABLE_MIN_ROWS) tables.push(this.formatTable(currentGroup));

    return tables;
  }

  private groupByY(items: TextItem[], tolerance: number): TableRow[] {
    const buckets = new Map<number, TableRow>();
    const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

    for (const item of sorted) {
      const y = item.transform[5];
      const bucketKey = Math.round(y / tolerance) * tolerance;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { y, items: [] });
      }
      buckets.get(bucketKey)!.items.push(item);
    }

    return Array.from(buckets.values());
  }

  private formatTable(rows: TableRow[]): ExtractedTable {
    return {
      rows: rows.map((row) =>
        [...row.items]
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((item) => item.str),
      ),
      yStart: rows[0].y,
      yEnd: rows.at(-1)!.y,
    };
  }

  isScannedImage(img: { width: number; height: number }, textItems: TextItem[]): boolean {
    return (
      img.width > SCANNED_MIN_DIMENSION &&
      img.height > SCANNED_MIN_DIMENSION &&
      textItems.length === 0
    );
  }
}