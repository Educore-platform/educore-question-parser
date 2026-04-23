export enum ExamPaperStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  EXTRACTED = 'extracted',
  ENRICHED = 'enriched',
  FAILED = 'failed',
  PARTIALLY_ENRICHED = 'partially_enriched',
}

export enum DocumentType {
  PDF = 'pdf',
  IMAGE = 'image',
  TABLE = 'table',
  SCANNED_IMAGE = 'scanned_image',
}

export enum DocumentSource {
  UPLOADED = 'uploaded',
  EXTRACTED = 'extracted',
  OCR = 'ocr',
}

export enum CloudinaryStatus {
  PENDING = 'pending',
  UPLOADED = 'uploaded',
  FAILED = 'failed',
}

export enum QuestionIngestionSource {
  PDF = 'pdf',
  MANUAL = 'manual',
}

export enum QuestionStatus {
  RAW = 'raw',
  LATEX_QUEUED = 'latex_queued',
  LATEX_DONE = 'latex_done',
  ANSWER_MATCHED = 'answer_matched',
  ENRICHING = 'enriching',
  ENRICHED = 'enriched',
  FAILED = 'failed',
}

export enum AiProcessedStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum QuestionBulkAction {
  RE_ENRICH = 're-enrich',
  MARK_REVIEWED = 'mark-reviewed',
}
