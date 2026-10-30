export const PROCESSING_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];
