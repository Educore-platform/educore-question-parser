export const QUEUE_NAMES = {
  PDF_EXTRACTION: 'pdf-extraction',
  OCR_SCANNING: 'ocr-scanning',
  LATEX_IMPROVEMENT: 'latex-improvement',
  ANSWER_MATCHING: 'answer-matching',
  AI_ENRICHMENT: 'ai-enrichment',
  CLOUDINARY_UPLOAD: 'cloudinary-upload',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface PdfExtractionJobPayload {
  paperId: string;
  filePath: string;
}

export interface OcrScanningJobPayload {
  documentId: string;
  filePath: string;
}

export interface CloudinaryUploadItem {
  documentId: string;
  localPath: string;
}

export interface CloudinaryImageBatchPayload {
  paperId: string;
  items: CloudinaryUploadItem[];
}

export interface CloudinaryPdfUploadPayload {
  paperId: string;
  documentId: string;
  localPath: string;
}

export interface LatexImprovementJobPayload {
  questionId: string;
}

export interface AnswerMatchingJobPayload {
  paperId: string;
  year: string;
}

export interface AiEnrichmentJobPayload {
  questionIds: string[];
}
