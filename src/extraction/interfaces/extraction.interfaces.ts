import { ExamQuestion } from "src/model/entities/exam-question.entity";

export interface SaveQuestionPayload {
  paperId: string;
  year: string;
  pageNumber: number;
  questionNumber: number;
  questionText: string;
  questionLatex: string | null;
  options: { label: string; text: string; latex: string | null }[];
  needsLatex: boolean;
  yPosition?: number; // Internal use for media association
}

export interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
  fontName: string;
  hasEOL: boolean;
}

export interface PageLayout {
  type: 'SPLIT' | 'SINGLE';
  segments: { side: 'LEFT' | 'RIGHT' | 'FULL'; items: TextItem[] }[];
}

export interface OptionDraft {
  label: string;
  text: string;
}

export interface OptionParseResult {
  valid: boolean;
  options: OptionDraft[];
}

export interface QuestionDraft {
  questionNumber: number;
  text: string;
  yPosition: number;
}

export interface QuestionValidationDraft {
  paperId: string;
  year: string | null;
  questionNumber: number;
  questionText: string;
  options: OptionDraft[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AnswerKeyDraft {
  paperId: string;
  year: string;
  questionNumber: number;
  correctOption: string;
}

export interface ParserState {
  currentQuestion: Partial<QuestionDraft> | null;
  lastQuestionNumber: number;
  awaitingContinuation: boolean; // true while inside a question block
}


export interface YearDetectionResult {
  year: string | null;
  isNewYear: boolean;
}

export interface ParsedQuestion {
  questionNumber: number;
  rawText: string;
  yPosition: number;
}

export interface ParseResult {
  completedQuestions: ParsedQuestion[];
}

export interface ExtractionContext {
  currentYear: string | null;
  parserState: ParserState;
  isAnswerSection: boolean;
}

// extraction.interfaces.ts additions
export interface ExtractedImage {
  type: 'image';
  filePath: string;
  yPosition: number;
  width: number;
  height: number;
  isScanned: boolean;
}

export interface PdfJsImage {
  data: ArrayBuffer;
  width: number;
  height: number;
}

export interface TableRow {
  y: number;
  items: TextItem[];
}

export interface ExtractedTable {
  rows: string[][];
  yStart: number;
  yEnd: number;
}

export interface TextLine {
  text: string;
  y: number;
}

export interface QuestionWithPosition {
  entity: ExamQuestion;
  y: number;
}

export interface ExtractionResult {
  paperId: string;
  questions: SaveQuestionPayload[];
  media: {
    images: ExtractedImage[];
    tables: ExtractedTable[];
    pageNumber: number;
    pageItems: TextItem[];
  }[];
  yearsDetected: string[];
}