export interface QuestionOption {
  label: string; // "A" | "B" | "C" | "D" | "E"
  text: string; // plain / best-effort text
  latex: string | null; // null if not applicable
}

export interface DocumentMetaPdf {
  original_filename: string;
  file_size_bytes: number;
  total_pages: number;
}

export interface DocumentMetaImage {
  page_number: number;
  column: 'left' | 'right' | 'full';
  position_relative_to_question: 'above' | 'below' | 'inline';
  x: number;
  y: number;
  width: number;
  height: number;
  /** true = image IS the question text (OCR needed to reconstruct text) */
  is_question_image: boolean;
  /** Populated after the OCR step via Cloudinary */
  ocr_text: string | null;
  /** Y position of the associated question */
  question_y: number | null;
}

export interface DocumentMetaTable {
  page_number: number;
  column: 'left' | 'right' | 'full';
  position_relative_to_question: 'above' | 'below' | 'inline';
  x: number;
  y: number;
  width: number;
  height: number;
  rows: string[][];
  /** Y position of the associated question */
  question_y: number | null;
}

export type DocumentMeta =
  | DocumentMetaPdf
  | DocumentMetaImage
  | DocumentMetaTable;

export interface EnrichedQuestion {
  id: string;
  questionText: string;
  questionLatex: string | null;
  options: QuestionOption[];
  answer: string | null;
  explanation: string | null;
  topic: string | null;
  relatedTopic: string | null;
}
