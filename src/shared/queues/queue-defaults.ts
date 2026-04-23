import { DefaultJobOptions } from 'bullmq';

export const PDF_EXTRACTION_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const OCR_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const STANDARD_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const AI_ENRICHMENT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const CLOUDINARY_UPLOAD_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: true,
  removeOnFail: { count: 100 },
};
