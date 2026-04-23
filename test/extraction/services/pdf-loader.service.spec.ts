import * as fs from 'node:fs/promises';
import { PdfLoaderService } from '../../../src/extraction/services/pdf-loader.service';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('PdfLoaderService', () => {
  let service: PdfLoaderService;
  const readFileMock = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
  const mockGetDocument = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocument.mockReset();

    service = new PdfLoaderService();

    const fakePdfjsLib = {
      GlobalWorkerOptions: { workerSrc: '' },
      getDocument: mockGetDocument,
    };

    jest
      .spyOn(
        service as unknown as { getPdfjs: () => Promise<typeof fakePdfjsLib> },
        'getPdfjs',
      )
      .mockResolvedValue(fakePdfjsLib);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadPdf', () => {
    it('loads PDF bytes, parses pages, returns layout', async () => {
      readFileMock.mockResolvedValue(Buffer.from('%PDF-1.4'));

      const textItems = [{ str: 'a', transform: [1, 0, 0, 1, 12, 34] }];

      mockGetDocument.mockReturnValue({
        promise: Promise.resolve({
          numPages: 2,
          getPage: jest.fn((pageNum: number) =>
            Promise.resolve({
              getTextContent: () =>
                Promise.resolve({
                  items: textItems,
                }),
              getViewport: () => ({ width: 600, height: 800 }),
            }),
          ),
        }),
      });

      const result = await service.loadPdf('/tmp/sample.pdf');

      expect(readFileMock).toHaveBeenCalledWith('/tmp/sample.pdf');
      expect(mockGetDocument).toHaveBeenCalled();

      expect(result.numPages).toBe(2);
      expect(result.pages).toHaveLength(2);

      expect(result.pages[0]).toMatchObject({
        pageNumber: 1,
        viewportWidth: 600,
        items: textItems,
      });
      expect(result.pages[1]).toMatchObject({
        pageNumber: 2,
        viewportWidth: 600,
        items: textItems,
      });
    });

    it('propagates errors when readFile fails', async () => {
      readFileMock.mockRejectedValue(new Error('ENOENT'));

      await expect(service.loadPdf('/missing.pdf')).rejects.toThrow('ENOENT');
      expect(mockGetDocument).not.toHaveBeenCalled();
    });
  });
});
