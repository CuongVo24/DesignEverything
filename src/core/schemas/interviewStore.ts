import { z } from 'zod';
import { progressSchema } from './state.js';

export const slotProvenanceRecordSchema = z.object({
  value: z.string(),
  provenance: z.string(),
  updated_at: z.string().datetime(),
  producer_version: z.string().optional(),
});

export const interviewStorePayloadSchema = z.object({
  progress: progressSchema,
  answers: z.record(z.string(), z.string()),
  slots: z.record(z.string(), slotProvenanceRecordSchema),
});

export const interviewStoreEnvelopeSchema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  state_revision: z.number().int().min(0),
  session_id: z.string(),
  checksum: z.string().length(64), // SHA-256 hex
  payload: interviewStorePayloadSchema,
  updated_at: z.string().datetime(),
});

export type SlotProvenanceRecord = z.infer<typeof slotProvenanceRecordSchema>;
export type InterviewStorePayload = z.infer<typeof interviewStorePayloadSchema>;
export type InterviewStoreEnvelope = z.infer<typeof interviewStoreEnvelopeSchema>;

export const INTERVIEW_STORE_VERSION = '7.0.0';
