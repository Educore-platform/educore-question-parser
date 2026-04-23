import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamQuestion } from '../../model/entities/exam-question.entity';
import { ExamPaper } from '../../model/entities/exam-paper.entity';
import { Document } from '../../model/entities/document.entity';
import {
  CloudinaryStatus,
  DocumentType,
  DocumentSource,
  ExamPaperStatus,
  QuestionStatus,
  QuestionIngestionSource,
} from '../../model/entities/enums';
import {
  SaveQuestionPayload,
  ExtractionResult,
} from '../interfaces/extraction.interfaces';
import {
  DocumentMetaImage,
  DocumentMetaTable,
} from '../../model/entities/interfaces';
import { MediaHandlerService } from './media-handler.service';
import { InjectRepository } from '@nestjs/typeorm';

interface PositionedQuestion {
  entity: ExamQuestion;
  y: number;
}

type RelativePosition = 'above' | 'below' | 'inline';

@Injectable()
export class QuestionPersistenceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mediaHandler: MediaHandlerService,
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepo: Repository<ExamQuestion>,
  ) {}

  async savePaperResult(
    result: ExtractionResult,
  ): Promise<{ questions: ExamQuestion[]; documents: Document[] }> {
    return this.dataSource.transaction(async (manager) => {
      const savedQuestions: ExamQuestion[] = await manager.save(
        ExamQuestion,
        result.questions.map((p) => this.buildEntity(p)),
      );

      // Pair each saved entity with its yPosition for media association.
      const positionedByPage = new Map<number, PositionedQuestion[]>();
      for (let i = 0; i < savedQuestions.length; i++) {
        const q = savedQuestions[i];
        const pageNum = q.pageNumber ?? 0;
        const y = result.questions[i].yPosition ?? 0;
        if (!positionedByPage.has(pageNum)) positionedByPage.set(pageNum, []);
        positionedByPage.get(pageNum)!.push({ entity: q, y });
      }

      for (const value of positionedByPage.values()) {
        value.sort((a, b) => b.y - a.y);
      }

      const docsToSave: Partial<Document>[] = [];
      const mediaQuestionIds = new Set<string>();

      for (const pageMedia of result.media) {
        const sortedQuestions =
          positionedByPage.get(pageMedia.pageNumber) ?? [];

        for (const img of pageMedia.images) {
          const isScanned = this.mediaHandler.isScannedImage(
            img,
            pageMedia.pageItems,
          );
          const { question, position } = this.findRelativeQuestion(
            img.yPosition,
            sortedQuestions,
          );
          if (question) mediaQuestionIds.add(question.entity.id);

          docsToSave.push({
            examPaperId: result.paperId,
            questionId: question?.entity.id ?? null,
            type: isScanned ? DocumentType.SCANNED_IMAGE : DocumentType.IMAGE,
            source: DocumentSource.EXTRACTED,
            storagePath: img.filePath,
            contentSha256: null,
            cloudinaryStatus: isScanned ? null : CloudinaryStatus.PENDING,
            meta: {
              page_number: pageMedia.pageNumber,
              column: 'full',
              position_relative_to_question: position,
              x: 0,
              y: img.yPosition,
              width: img.width,
              height: img.height,
              is_question_image: isScanned,
              ocr_text: null,
              question_y: question?.y ?? null,
            } as DocumentMetaImage,
          });
        }

        for (const table of pageMedia.tables) {
          const { question, position } = this.findRelativeQuestion(
            table.yStart,
            sortedQuestions,
          );
          if (question) mediaQuestionIds.add(question.entity.id);

          docsToSave.push({
            examPaperId: result.paperId,
            questionId: question?.entity.id ?? null,
            type: DocumentType.TABLE,
            source: DocumentSource.EXTRACTED,
            contentSha256: null,
            cloudinaryStatus: null,
            meta: {
              page_number: pageMedia.pageNumber,
              column: 'full',
              position_relative_to_question: position,
              x: 0,
              y: table.yStart,
              width: 0,
              height: 0,
              rows: table.rows,
              question_y: question?.y ?? null,
            } as DocumentMetaTable,
          });
        }
      }

      const savedDocuments = docsToSave.length
        ? await manager.save(Document, docsToSave)
        : [];

      if (mediaQuestionIds.size) {
        await manager
          .createQueryBuilder()
          .update(ExamQuestion)
          .set({ hasMedia: true })
          .whereInIds([...mediaQuestionIds])
          .execute();
      }

      await manager.update(ExamPaper, result.paperId, {
        status: ExamPaperStatus.EXTRACTED,
        failureReason: null,
      });

      return { questions: savedQuestions, documents: savedDocuments };
    });
  }

  async saveMany(payloads: SaveQuestionPayload[]): Promise<ExamQuestion[]> {
    if (!payloads.length) return [];
    return this.examQuestionRepo.save(payloads.map((p) => this.buildEntity(p)));
  }

  private findRelativeQuestion(
    mediaY: number,
    sortedQuestions: PositionedQuestion[],
  ): { question: PositionedQuestion | null; position: RelativePosition } {
    if (!sortedQuestions.length) return { question: null, position: 'above' };

    for (let i = 0; i < sortedQuestions.length; i++) {
      const q = sortedQuestions[i];
      const next = sortedQuestions[i + 1];

      if (mediaY < q.y) return { question: q, position: 'above' };
      if (next && mediaY > q.y && mediaY < next.y)
        return { question: q, position: 'below' };
    }

    return { question: sortedQuestions.at(-1) ?? null, position: 'below' };
  }

  private buildEntity(payload: SaveQuestionPayload): ExamQuestion {
    return this.examQuestionRepo.create({
      examPaperId: payload.paperId,
      year: payload.year,
      pageNumber: payload.pageNumber,
      questionNumber: payload.questionNumber,
      questionText: payload.questionText,
      questionLatex: payload.questionLatex,
      options: payload.options,
      status: payload.needsLatex
        ? QuestionStatus.LATEX_QUEUED
        : QuestionStatus.RAW,
      ingestionSource: QuestionIngestionSource.PDF,
      hasMedia: false,
    });
  }
}
