import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PdfLoaderService } from './services/pdf-loader.service';
import { PageClassifierService } from './services/page-classifier.service';
import { QuestionParserService } from './services/question-parser.service';
import { YearDetectorService } from './services/year-detector.service';
import { OptionParserService } from './services/option-parser.service';
import { LatexClassifierService } from './services/latex-classifier.service';
import { ValidatorService } from './services/validator.service';
import { QuestionPersistenceService } from './services/question-persistence.service';
import { AnswerParserService } from './services/answer-parser.service';
import { RedisService } from '../shared/redis/redis.service';
import { ExamPaper } from '../model/entities/exam-paper.entity';
import { Document } from '../model/entities/document.entity';
import {
  ExamPaperStatus,
  QuestionStatus,
  DocumentType,
  DocumentSource,
} from '../model/entities/enums';
import {
  QUEUE_NAMES,
  LatexImprovementJobPayload,
  AnswerMatchingJobPayload,
  OcrScanningJobPayload,
  CloudinaryImageBatchPayload,
  CloudinaryPdfUploadPayload,
} from '../shared/queues/queue-names';
import {
  TextItem,
  ExtractionContext,
  ParsedQuestion,
  SaveQuestionPayload,
  ExtractionResult,
} from './interfaces/extraction.interfaces';
import { MediaHandlerService } from './services/media-handler.service';
import { formatErrorForStorage } from '../shared/utils/error-storage.util';

const ANSWER_KEY_ROW_PATTERN = /^[A-E]\s+\d+\.\s+[A-E]|^(\d+\.\s*[A-E]\s+){2,}/;
const ANSWER_SECTION_PATTERN = /\b(answers?|answer\s*key|solutions?|ans\.?)\b/i;
const WATERMARK_PATTERN = /\bwww\.\S+/gi;
const PAPER_TYPE_QUESTION = /which\s+.*question\s+paper\s+type\s+is\s+given\s+to\s+you/i;

type YearAdvanceResult = { year: string | null; flushedQuestions: ParsedQuestion[] };

@Injectable()
export class ExtractionOrchestrator {
  private readonly logger = new Logger(ExtractionOrchestrator.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pdfLoader: PdfLoaderService,
    private readonly pageClassifier: PageClassifierService,
    private readonly questionParser: QuestionParserService,
    private readonly yearDetector: YearDetectorService,
    private readonly optionParser: OptionParserService,
    private readonly latexClassifier: LatexClassifierService,
    private readonly validator: ValidatorService,
    private readonly questionPersistence: QuestionPersistenceService,
    private readonly answerParser: AnswerParserService,
    private readonly redisService: RedisService,
    private readonly mediaHandler: MediaHandlerService,
    @InjectRepository(ExamPaper)
    private readonly examPaperRepo: Repository<ExamPaper>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectQueue(QUEUE_NAMES.LATEX_IMPROVEMENT)
    private readonly latexQueue: Queue<LatexImprovementJobPayload>,
    @InjectQueue(QUEUE_NAMES.ANSWER_MATCHING)
    private readonly answerQueue: Queue<AnswerMatchingJobPayload>,
    @InjectQueue(QUEUE_NAMES.OCR_SCANNING)
    private readonly ocrQueue: Queue<OcrScanningJobPayload>,
    @InjectQueue(QUEUE_NAMES.CLOUDINARY_UPLOAD)
    private readonly cloudinaryQueue: Queue<
      CloudinaryImageBatchPayload | CloudinaryPdfUploadPayload
    >,
  ) {}

  async processPaper(paperId: string, filePath: string): Promise<void> {
    try {
      this.logger.log(`Starting extraction for paper ${paperId}`);
      await this.examPaperRepo.update(paperId, {
        status: ExamPaperStatus.PROCESSING,
        failureReason: null,
      });

      const { pages, numPages } = await this.pdfLoader.loadPdf(filePath);
      this.logger.log(`Loaded ${numPages} pages for paper ${paperId}`);

      const context: ExtractionContext = {
        currentYear: null,
        parserState: this.questionParser.initialState(),
        isAnswerSection: false,
      };

      const allQuestions: SaveQuestionPayload[] = [];
      const allMedia: ExtractionResult['media'] = [];
      const yearsDetected = new Set<string>();

      for (const page of pages) {
        if (page.pageNumber === 1) continue;

        this.logger.debug(`Processing page ${page.pageNumber}/${numPages}`);

        const layout = this.pageClassifier.classify(page.items, page.viewportWidth);
        const extractedImages = await this.mediaHandler.extractImages(page.proxy, page.pageNumber);
        const extractedTables = this.mediaHandler.detectTables(page.items);

        allMedia.push({
          images: extractedImages,
          tables: extractedTables,
          pageNumber: page.pageNumber,
          pageItems: page.items,
        });

        for (const segment of layout.segments) {
          if (!segment.items.length) continue;
          const segmentPayloads = await this.processSegment(segment.items, context, page.pageNumber, paperId);
          allQuestions.push(...segmentPayloads);
          if (context.currentYear) yearsDetected.add(context.currentYear);
        }
      }

      const trailingQuestions = this.questionParser.finalFlush(context.parserState);
      if (trailingQuestions.length) {
        const lastPageNumber = pages.at(-1)?.pageNumber ?? numPages;
        for (const q of trailingQuestions) {
          const payload = await this.prepareQuestion(q, context.currentYear, lastPageNumber, paperId);
          if (payload) allQuestions.push(payload);
        }
      }

      const years = [...yearsDetected];

      const { questions, documents } = await this.questionPersistence.savePaperResult({
        paperId,
        questions: allQuestions,
        media: allMedia,
        yearsDetected: years,
      });

      const latexJobs = questions
        .filter((q) => q.status === QuestionStatus.LATEX_QUEUED)
        .map((q): { name: string; data: LatexImprovementJobPayload } => ({
          name: 'process',
          data: { questionId: q.id },
        }));

      const answerJobs = years.map((year): { name: string; data: AnswerMatchingJobPayload } => ({
        name: 'match',
        data: { paperId, year },
      }));

      const ocrJobs = documents
        .filter((doc) => doc.type === DocumentType.SCANNED_IMAGE && doc.storagePath)
        .map((doc): { name: string; data: OcrScanningJobPayload } => ({
          name: 'ocr',
          data: { documentId: doc.id, filePath: doc.storagePath! },
        }));

      if (latexJobs.length) await this.latexQueue.addBulk(latexJobs);
      if (answerJobs.length) await this.answerQueue.addBulk(answerJobs);
      if (ocrJobs.length) await this.ocrQueue.addBulk(ocrJobs);

      const cloudinaryJobs = await this.buildCloudinaryUploadJobs(paperId, filePath, documents);
      if (cloudinaryJobs.length) await this.cloudinaryQueue.addBulk(cloudinaryJobs);

      await this.examPaperRepo.update(paperId, {
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      });

      this.logger.log(`Extraction complete for paper ${paperId}`);
    } catch (error) {
      this.logger.error(`Extraction failed for paper ${paperId}`, error);
      await this.examPaperRepo.update(paperId, {
        status: ExamPaperStatus.FAILED,
        failureReason: formatErrorForStorage(error),
      });
      throw error;
    }
  }

  private async buildCloudinaryUploadJobs(
    paperId: string,
    filePath: string,
    documents: Document[],
  ): Promise<
    {
      name: string;
      data: CloudinaryImageBatchPayload | CloudinaryPdfUploadPayload;
    }[]
  > {
    const batchSize = this.config.get<number>('cloudinary.batchSize', 10);

    const imageDocs = documents.filter(
      (d) => d.type === DocumentType.IMAGE && d.storagePath,
    );
    const batches = chunk(imageDocs, batchSize);
    const imageJobs = batches.map((batch) => ({
      name: 'image-batch',
      data: {
        paperId,
        items: batch.map((d) => ({
          documentId: d.id,
          localPath: d.storagePath!,
        })),
      } satisfies CloudinaryImageBatchPayload,
    }));

    const pdfDoc = await this.documentRepo.findOne({
      where: {
        examPaperId: paperId,
        type: DocumentType.PDF,
        source: DocumentSource.UPLOADED,
      },
    });

    const pdfJobs =
      pdfDoc?.storagePath
        ? [
            {
              name: 'pdf',
              data: {
                paperId,
                documentId: pdfDoc.id,
                localPath: pdfDoc.storagePath,
              } satisfies CloudinaryPdfUploadPayload,
            },
          ]
        : [];

    if (pdfDoc?.storagePath && filePath && pdfDoc.storagePath !== filePath) {
      this.logger.warn(
        `PDF storage path mismatch for paper ${paperId}: db=${pdfDoc.storagePath} job=${filePath}`,
      );
    }

    return [...imageJobs, ...pdfJobs];
  }

  private async processSegment(
    items: TextItem[],
    context: ExtractionContext,
    pageNumber: number,
    paperId: string,
  ): Promise<SaveQuestionPayload[]> {
    const segmentText = this.buildSegmentText(items);

    if (this.isAnswerKeyRow(segmentText)) {
      this.logger.debug(`Page ${pageNumber}: skipping answer key row`);
      return [];
    }

    const { year, flushedQuestions } = this.advanceYearContext(segmentText, context, pageNumber);
    context.currentYear = year;

    const boundaryPayloads: SaveQuestionPayload[] = [];
    for (const q of flushedQuestions) {
      const payload = await this.prepareQuestion(q, context.currentYear, pageNumber, paperId);
      if (payload) boundaryPayloads.push(payload);
    }

    if (context.isAnswerSection) {
      await this.handleAnswerSection(segmentText, context, paperId);
      return boundaryPayloads;
    }

    const answerSectionMatch = ANSWER_SECTION_PATTERN.exec(segmentText);
    if (answerSectionMatch) {
      this.logger.log(`Page ${pageNumber}: answer section boundary detected`);
      context.isAnswerSection = true;

      // Approximate which item index corresponds to the answer section boundary
      // by accumulating character counts until we reach the match offset.
      let charCount = 0;
      let splitItemIdx = items.length;
      for (let i = 0; i < items.length; i++) {
        charCount += items[i].str.length + 1;
        if (charCount >= answerSectionMatch.index) {
          splitItemIdx = i;
          break;
        }
      }

      const questionItems = items.slice(0, splitItemIdx);
      const answerPart = segmentText.slice(answerSectionMatch.index);

      const payloads = questionItems.length
        ? await this.collectQuestions(questionItems, context, pageNumber, paperId)
        : [];
      await this.handleAnswerSection(answerPart, context, paperId);
      return [...boundaryPayloads, ...payloads];
    }

    const segmentPayloads = await this.collectQuestions(items, context, pageNumber, paperId);
    return [...boundaryPayloads, ...segmentPayloads];
  }

  private async collectQuestions(
    items: TextItem[],
    context: ExtractionContext,
    pageNumber: number,
    paperId: string,
  ): Promise<SaveQuestionPayload[]> {
    const { completedQuestions } = this.questionParser.parseSegment(items, context.parserState);
    const payloads: SaveQuestionPayload[] = [];

    for (const question of completedQuestions) {
      const payload = await this.prepareQuestion(question, context.currentYear, pageNumber, paperId);
      if (payload) payloads.push(payload);
    }

    return payloads;
  }

  private async handleAnswerSection(
    segmentText: string,
    context: ExtractionContext,
    paperId: string,
  ): Promise<void> {
    const year = context.currentYear ?? 'Unknown';
    const answers = this.answerParser.parseAnswers(segmentText, paperId, year);
    if (!answers.length) return;

    this.logger.log(`Storing ${answers.length} answers for year ${year}`);

    const redis = this.redisService.getClient();
    const entries = Object.fromEntries(answers.map((ans) => [String(ans.questionNumber), ans.correctOption]));
    await redis.hset(`answers:${paperId}:${year}`, entries);
  }

  private advanceYearContext(
    segmentText: string,
    context: ExtractionContext,
    pageNumber: number,
  ): YearAdvanceResult {
    const { year, isNewYear } = this.yearDetector.detectYear(segmentText, context.currentYear);

    if (!isNewYear) return { year, flushedQuestions: [] };

    this.logger.log(`Page ${pageNumber}: new year boundary detected — ${year}`);
    const flushedQuestions = this.questionParser.finalFlush(context.parserState);
    context.isAnswerSection = false;
    return { year, flushedQuestions };
  }

  private async prepareQuestion(
    question: ParsedQuestion,
    year: string | null,
    pageNumber: number,
    paperId: string,
  ): Promise<SaveQuestionPayload | null> {
    if (PAPER_TYPE_QUESTION.test(question.rawText)) {
      this.logger.debug(`Page ${pageNumber}: ignoring paper type question ${question.questionNumber}`);
      return null;
    }

    this.logger.log(`Page ${pageNumber}: processing question ${question.questionNumber} (year: ${year})`);

    const { questionText, optionsText } = this.splitQuestionBody(question.rawText);
    const optionResult = this.optionParser.parseOptions(optionsText);

    const validation = await this.validator.validate(
      { paperId, year, questionNumber: question.questionNumber, questionText, options: optionResult.options },
      pageNumber,
    );

    if (!validation.valid) {
      this.logger.warn(`Page ${pageNumber}: question ${question.questionNumber} rejected — ${validation.errors.join(', ')}`);
      return null;
    }

    const enriched = this.enrichWithLatex(questionText, optionResult.options);

    return {
      paperId,
      year: year ?? 'Unknown',
      pageNumber,
      questionNumber: question.questionNumber,
      questionText,
      questionLatex: enriched.questionLatex,
      options: enriched.options,
      needsLatex: enriched.needsLatex,
      yPosition: question.yPosition,
    };
  }

  private splitQuestionBody(rawText: string): { questionText: string; optionsText: string } {
    const lines = rawText.split('\n');
    const firstOptionIdx = lines.findIndex((line) => /^[A][.)]\s+/i.test(line.trim()));

    if (firstOptionIdx !== -1) {
      return {
        questionText: lines.slice(0, firstOptionIdx).join('\n').trim(),
        optionsText: lines.slice(firstOptionIdx).join('\n'),
      };
    }

    const match = /(?:^|\s)([aA][.)]\s+.*?\s[bB][.)]\s+)/s.exec(rawText);
    if (match) {
      const splitIdx = match.index + (match[0].toLowerCase().startsWith('a') ? 0 : 1);
      return {
        questionText: rawText.slice(0, splitIdx).trim(),
        optionsText: rawText.slice(splitIdx),
      };
    }

    return { questionText: rawText.trim(), optionsText: '' };
  }

  private enrichWithLatex(questionText: string, options: { label: string; text: string }[]) {
    const qLatex = this.latexClassifier.process(questionText);
    let needsLatex = qLatex.latex !== null;

    const enrichedOptions = options.map((opt) => {
      const result = this.latexClassifier.process(opt.text);
      if (result.latex !== null) needsLatex = true;
      return { label: opt.label, text: opt.text, latex: result.latex };
    });

    return { questionLatex: qLatex.latex, options: enrichedOptions, needsLatex };
  }

  private buildSegmentText(items: TextItem[]): string {
    return items
      .map((item) => item.str + (item.hasEOL ? '\n' : ' '))
      .join('')
      .replaceAll(WATERMARK_PATTERN, '')
      .replaceAll(/ {2,}/g, ' ')
      .trim();
  }

  private isAnswerKeyRow(segmentText: string): boolean {
    return ANSWER_KEY_ROW_PATTERN.test(segmentText.trim());
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size < 1) return arr.length ? [arr] : [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}