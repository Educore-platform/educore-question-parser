jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import { unlink } from 'fs/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ExtractionOrchestrator } from '../../src/extraction/extraction.orchestrator';
import { PdfLoaderService } from '../../src/extraction/services/pdf-loader.service';
import { PageClassifierService } from '../../src/extraction/services/page-classifier.service';
import { QuestionParserService } from '../../src/extraction/services/question-parser.service';
import { YearDetectorService } from '../../src/extraction/services/year-detector.service';
import { OptionParserService } from '../../src/extraction/services/option-parser.service';
import { LatexClassifierService } from '../../src/extraction/services/latex-classifier.service';
import { ValidatorService } from '../../src/extraction/services/validator.service';
import { AnswerParserService } from '../../src/extraction/services/answer-parser.service';
import { RedisService } from '../../src/shared/redis/redis.service';
import { QuestionPersistenceService } from '../../src/extraction/services/question-persistence.service';
import { MediaHandlerService } from '../../src/extraction/services/media-handler.service';
import { ExamPaper } from '../../src/model/entities/exam-paper.entity';
import { ExamQuestion } from '../../src/model/entities/exam-question.entity';
import { Document } from '../../src/model/entities/document.entity';
import {
  ExamPaperStatus,
  DocumentType,
  QuestionStatus,
} from '../../src/model/entities/enums';
import { QUEUE_NAMES } from '../../src/shared/queues/queue-names';
import type { TextItem } from '../../src/extraction/interfaces/extraction.interfaces';

function textItem(str: string, y: number, hasEOL = false): TextItem {
  return {
    str,
    dir: 'ltr',
    width: 1,
    height: 1,
    transform: [1, 0, 0, 1, 0, y],
    fontName: 'f',
    hasEOL,
  };
}

/** Minimal stand-in for pdf.js page proxy (required by PdfLoader result type). */
const PDF_PAGE_PROXY_STUB = {} as never;

function makePdfPage(pageNumber: number, items: TextItem[]) {
  return {
    pageNumber,
    viewportWidth: 600,
    items,
    proxy: PDF_PAGE_PROXY_STUB,
  };
}

/** Page 1 is skipped by the orchestrator; use page 2 for exerciseable content. */
function twoPagePdf(body: string) {
  return {
    numPages: 2,
    pages: [makePdfPage(1, []), makePdfPage(2, [textItem(body, 400)])],
  };
}

describe('ExtractionOrchestrator', () => {
  let orchestrator: ExtractionOrchestrator;
  let questionParser: QuestionParserService;
  let examPaperRepo: jest.Mocked<Pick<Repository<ExamPaper>, 'update'>>;
  let documentRepo: { update: jest.Mock; findOne: jest.Mock };
  let pdfLoader: jest.Mocked<Pick<PdfLoaderService, 'loadPdf'>>;
  let pageClassifier: jest.Mocked<Pick<PageClassifierService, 'classify'>>;
  let questionPersistence: { savePaperResult: jest.Mock };
  let latexQueue: { addBulk: jest.Mock };
  let answerQueue: { addBulk: jest.Mock };
  let ocrQueue: { addBulk: jest.Mock };
  let cloudinaryQueue: { addBulk: jest.Mock };
  let mediaHandler: {
    extractImages: jest.Mock;
    detectTables: jest.Mock;
  };
  let validator: { validate: jest.Mock };
  let redisHset: jest.Mock;
  let redisService: { getClient: jest.Mock };

  const paperId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const questionId = 'qqqqqqqq-qqqq-qqqq-qqqq-qqqqqqqqqqqq';
  const pdfDocId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  let pdfStoragePathForMocks = '/tmp/file.pdf';

  beforeEach(async () => {
    pdfStoragePathForMocks = '/tmp/file.pdf';

    examPaperRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    documentRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockImplementation(() => ({
        id: pdfDocId,
        storagePath: pdfStoragePathForMocks,
      })),
    };

    pdfLoader = {
      loadPdf: jest.fn(),
    };

    pageClassifier = {
      classify: jest.fn(),
    };

    latexQueue = {
      addBulk: jest.fn().mockResolvedValue(undefined),
    };
    answerQueue = {
      addBulk: jest.fn().mockResolvedValue(undefined),
    };
    ocrQueue = {
      addBulk: jest.fn().mockResolvedValue(undefined),
    };
    cloudinaryQueue = {
      addBulk: jest.fn().mockResolvedValue(undefined),
    };

    questionPersistence = {
      savePaperResult: jest.fn().mockResolvedValue({
        questions: [],
        documents: [],
      }),
    };

    mediaHandler = {
      extractImages: jest.fn().mockResolvedValue([]),
      detectTables: jest.fn().mockReturnValue([]),
    };

    validator = {
      validate: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    };

    redisHset = jest.fn().mockResolvedValue(1);
    redisService = {
      getClient: jest.fn().mockReturnValue({
        hset: redisHset,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionOrchestrator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(<T>(_key: string, defaultValue: T) => defaultValue),
          },
        },
        { provide: PdfLoaderService, useValue: pdfLoader },
        { provide: PageClassifierService, useValue: pageClassifier },
        QuestionParserService,
        YearDetectorService,
        OptionParserService,
        LatexClassifierService,
        { provide: ValidatorService, useValue: validator },
        AnswerParserService,
        { provide: RedisService, useValue: redisService },
        { provide: QuestionPersistenceService, useValue: questionPersistence },
        { provide: MediaHandlerService, useValue: mediaHandler },
        {
          provide: getRepositoryToken(ExamPaper),
          useValue: examPaperRepo,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepo,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.LATEX_IMPROVEMENT),
          useValue: latexQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.ANSWER_MATCHING),
          useValue: answerQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.OCR_SCANNING),
          useValue: ocrQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.CLOUDINARY_UPLOAD),
          useValue: cloudinaryQueue,
        },
      ],
    }).compile();

    orchestrator = module.get(ExtractionOrchestrator);
    questionParser = module.get(QuestionParserService);
  });

  describe('processPaper', () => {
    const validTwoQuestionsBody =
      '1. Describe photosynthesis briefly.\n' +
      'A) First\nB) Second\nC) Third\nD) Fourth\nE) Fifth\n' +
      '2. Next\nA) a\nB) b\nC) c\nD) d\nE) e\n';

    it('marks paper as processing, walks pages and segments, then completes and enqueues Cloudinary upload jobs', async () => {
      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(validTwoQuestionsBody));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          { side: 'FULL', items: [textItem(validTwoQuestionsBody, 400)] },
        ],
      });

      const path = '/tmp/file.pdf';
      pdfStoragePathForMocks = path;
      await orchestrator.processPaper(paperId, path);

      expect(examPaperRepo.update).toHaveBeenCalledWith(paperId, {
        status: ExamPaperStatus.PROCESSING,
        failureReason: null,
      });
      expect(pdfLoader.loadPdf).toHaveBeenCalledWith(path);
      expect(pageClassifier.classify).toHaveBeenCalled();

      expect(examPaperRepo.update).not.toHaveBeenCalledWith(paperId, {
        status: ExamPaperStatus.FAILED,
      });

      expect(cloudinaryQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'pdf',
          data: {
            paperId,
            documentId: pdfDocId,
            localPath: path,
          },
        },
      ]);
    });

    it('enqueues image-batch jobs for IMAGE documents plus pdf job', async () => {
      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(validTwoQuestionsBody));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          { side: 'FULL', items: [textItem(validTwoQuestionsBody, 400)] },
        ],
      });

      const imgA = '11111111-1111-1111-1111-111111111111';
      const imgB = '22222222-2222-2222-2222-222222222222';
      questionPersistence.savePaperResult.mockResolvedValue({
        questions: [],
        documents: [
          {
            id: imgA,
            type: DocumentType.IMAGE,
            storagePath: '/media/page_2_img_1.png',
          } as Document,
          {
            id: imgB,
            type: DocumentType.IMAGE,
            storagePath: '/media/page_2_img_2.png',
          } as Document,
        ],
      });

      const path = '/tmp/file.pdf';
      pdfStoragePathForMocks = path;
      await orchestrator.processPaper(paperId, path);

      expect(cloudinaryQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'image-batch',
          data: {
            paperId,
            items: [
              { documentId: imgA, localPath: '/media/page_2_img_1.png' },
              { documentId: imgB, localPath: '/media/page_2_img_2.png' },
            ],
          },
        },
        {
          name: 'pdf',
          data: {
            paperId,
            documentId: pdfDocId,
            localPath: path,
          },
        },
      ]);
    });

    it('skips segments with no text items', async () => {
      pdfLoader.loadPdf.mockResolvedValue({
        numPages: 2,
        pages: [makePdfPage(1, []), makePdfPage(2, [])],
      });

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [] }],
      });

      pdfStoragePathForMocks = '/tmp/a.pdf';
      await orchestrator.processPaper(paperId, '/tmp/a.pdf');

      expect(pageClassifier.classify).toHaveBeenCalled();
    });

    it('builds segment text in the item order produced by the classifier (top–bottom sorted)', async () => {
      pdfLoader.loadPdf.mockResolvedValue({
        numPages: 2,
        pages: [makePdfPage(1, []), makePdfPage(2, [])],
      });

      const parseSpy = jest.spyOn(questionParser, 'parseSegment');

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          {
            side: 'FULL',
            items: [
              textItem('top ', 500, false),
              textItem('bottom ', 100, false),
            ],
          },
        ],
      });

      pdfStoragePathForMocks = '/tmp/x.pdf';
      await orchestrator.processPaper(paperId, '/tmp/x.pdf');

      expect(parseSpy).toHaveBeenCalled();
      const items = parseSpy.mock.calls[0][0];
      expect(items[0].str.startsWith('top')).toBe(true);

      parseSpy.mockRestore();
    });

    it('flushes the open question when a new calendar year is detected', async () => {
      const flushSpy = jest.spyOn(questionParser, 'finalFlush');

      pdfLoader.loadPdf.mockResolvedValue({
        numPages: 2,
        pages: [makePdfPage(1, []), makePdfPage(2, [])],
      });

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          {
            side: 'FULL',
            items: [textItem('1. Hold\nYear 2023', 400, true)],
          },
          {
            side: 'FULL',
            items: [textItem('Section 2024\n2. Next', 300, true)],
          },
        ],
      });

      pdfStoragePathForMocks = '/tmp/years.pdf';
      await orchestrator.processPaper(paperId, '/tmp/years.pdf');

      expect(flushSpy).toHaveBeenCalled();
      flushSpy.mockRestore();
    });

    it('marks paper failed and rethrows when loading fails; does not delete upload', async () => {
      pdfLoader.loadPdf.mockRejectedValue(new Error('disk'));

      await expect(
        orchestrator.processPaper(paperId, '/tmp/missing.pdf'),
      ).rejects.toThrow('disk');

      expect(examPaperRepo.update).toHaveBeenCalledWith(
        paperId,
        expect.objectContaining({
          status: ExamPaperStatus.FAILED,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matcher
          failureReason: expect.any(String),
        }),
      );

      expect(unlink).not.toHaveBeenCalled();
      expect(cloudinaryQueue.addBulk).not.toHaveBeenCalled();
    });

    it('persists Unknown year when no year appears in the PDF text', async () => {
      const body = '1. Plain\n' + 'A) a\nB) b\nC) c\nD) d\nE) e\n' + '2. Flush';
      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(body));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [textItem(body, 400)] }],
      });

      pdfStoragePathForMocks = '/tmp/no-year.pdf';
      await orchestrator.processPaper(paperId, '/tmp/no-year.pdf');

      expect(questionPersistence.savePaperResult).toHaveBeenCalledWith(
        expect.objectContaining({
          paperId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- nested Jest matchers
          questions: expect.arrayContaining([
            expect.objectContaining({ year: 'Unknown' }),
          ]),
        }),
      );
    });

    it('enqueues answer matching when extraction needs no latex improvement', async () => {
      const bodyWithYear =
        'Year 2023\n' +
        '1. Describe photosynthesis briefly.\n' +
        'A) First\nB) Second\nC) Third\nD) Fourth\nE) Fifth\n' +
        '2. Next\nA) a\nB) b\nC) c\nD) d\nE) e\n';

      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(bodyWithYear));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [textItem(bodyWithYear, 400)] }],
      });

      questionPersistence.savePaperResult.mockResolvedValue({
        questions: [
          { id: questionId, status: QuestionStatus.RAW } as ExamQuestion,
        ],
        documents: [],
      });

      pdfStoragePathForMocks = '/tmp/plain.pdf';
      await orchestrator.processPaper(paperId, '/tmp/plain.pdf');

      expect(latexQueue.addBulk).not.toHaveBeenCalled();
      expect(answerQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'match',
          data: { paperId, year: '2023' },
        },
      ]);
    });

    it('enqueues latex improvement when question or options contain math signals', async () => {
      const body =
        '1. Solve x^2 = 4\n' + 'A) 1\nB) 2\nC) 3\nD) 4\nE) 5\n' + '2. Done';
      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(body));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [textItem(body, 400)] }],
      });

      questionPersistence.savePaperResult.mockResolvedValue({
        questions: [
          {
            id: questionId,
            status: QuestionStatus.LATEX_QUEUED,
          } as ExamQuestion,
        ],
        documents: [],
      });

      pdfStoragePathForMocks = '/tmp/math.pdf';
      await orchestrator.processPaper(paperId, '/tmp/math.pdf');

      expect(latexQueue.addBulk).toHaveBeenCalledWith([
        {
          name: 'process',
          data: { questionId },
        },
      ]);
      expect(answerQueue.addBulk).not.toHaveBeenCalled();
    });

    it('does not enqueue downstream jobs when segments produce no completed questions', async () => {
      pdfLoader.loadPdf.mockResolvedValue({
        numPages: 2,
        pages: [makePdfPage(1, []), makePdfPage(2, [textItem('1. Only', 400)])],
      });

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [{ side: 'FULL', items: [textItem('1. Only', 400)] }],
      });

      pdfStoragePathForMocks = '/tmp/incomplete.pdf';
      await orchestrator.processPaper(paperId, '/tmp/incomplete.pdf');

      expect(questionPersistence.savePaperResult).toHaveBeenCalled();
      expect(latexQueue.addBulk).not.toHaveBeenCalled();
      expect(answerQueue.addBulk).not.toHaveBeenCalled();
    });

    it('skips persistence payload when validation fails', async () => {
      validator.validate.mockResolvedValue({
        valid: false,
        errors: ['Too few options: 1'],
      });

      pdfLoader.loadPdf.mockResolvedValue(twoPagePdf(validTwoQuestionsBody));

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          { side: 'FULL', items: [textItem(validTwoQuestionsBody, 400)] },
        ],
      });

      pdfStoragePathForMocks = '/tmp/invalid.pdf';
      await orchestrator.processPaper(paperId, '/tmp/invalid.pdf');

      expect(questionPersistence.savePaperResult).toHaveBeenCalledWith(
        expect.objectContaining({
          questions: [],
        }),
      );
    });

    it('stores answer-key rows in Redis after the answer section boundary', async () => {
      const questions =
        '1. Describe photosynthesis briefly.\n' +
        'A) First\nB) Second\nC) Third\nD) Fourth\nE) Fifth\n' +
        '2. Next\nA) a\nB) b\nC) c\nD) d\nE) e\n';

      pdfLoader.loadPdf.mockResolvedValue({
        numPages: 2,
        pages: [makePdfPage(1, []), makePdfPage(2, [textItem('x', 400)])],
      });

      pageClassifier.classify.mockReturnValue({
        type: 'SINGLE',
        segments: [
          { side: 'FULL', items: [textItem(questions, 400)] },
          {
            side: 'FULL',
            items: [textItem('Answer key\n1. A\n2. B', 300)],
          },
        ],
      });

      pdfStoragePathForMocks = '/tmp/with-answers.pdf';
      await orchestrator.processPaper(paperId, '/tmp/with-answers.pdf');

      expect(redisHset).toHaveBeenCalledWith(`answers:${paperId}:Unknown`, {
        '1': 'A',
        '2': 'B',
      });
    });
  });
});
