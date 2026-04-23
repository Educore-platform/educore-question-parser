import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { TextItem } from '../interfaces/extraction.interfaces';

@Injectable()
export class PdfLoaderService {
  private readonly logger = new Logger(PdfLoaderService.name);
  private pdfjsLib: typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null =
    null;

  private async getPdfjs() {
    if (!this.pdfjsLib) {
      this.pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      this.pdfjsLib.GlobalWorkerOptions.workerSrc =
        require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    }
    return this.pdfjsLib;
  }

  async loadPdf(filePath: string) {
    this.logger.log(`Loading PDF from ${filePath}`);
    const [data, pdfjsLib] = await Promise.all([
      fs.readFile(filePath).then((buf) => new Uint8Array(buf)),
      this.getPdfjs(),
    ]);

    const pdfDocument = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    this.logger.log(`PDF loaded. Total pages: ${pdfDocument.numPages}`);

    const pages = await Promise.all(
      Array.from({ length: pdfDocument.numPages }, async (_, index) => {
        const pageNum = index + 1;
        const page = await pdfDocument.getPage(pageNum);
        const [textContent, viewport] = await Promise.all([
          page.getTextContent(),
          Promise.resolve(page.getViewport({ scale: 1 })),
        ]);

        return {
          pageNumber: pageNum,
          viewportWidth: viewport.width,
          items: textContent.items as unknown as TextItem[],
          proxy: page,
        };
      }),
    );

    return { numPages: pdfDocument.numPages, pages };
  }
}
