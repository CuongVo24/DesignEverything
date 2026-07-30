import { z } from 'zod';
import { progressSchema } from './state.js';

export const slotProvenanceRecordSchema = z.object({
  value: z.string(),
  provenance: z.string(),
  updated_at: z.string().datetime(),
  producer_version: z.string().optional(),
});

export const correctionEntrySchema = z.object({
  previous_value: z.string(),
  previous_revision: z.number().int().min(0),
  corrected_at: z.string().datetime(),
});

// Additive, backward-compatible: envelopes written before this field existed
// simply omit it (optional). Scoped to slots only, not answers[stepId] —
// commitStep's capability is bound to (and always advances) current_step,
// so re-committing an already-confirmed answers[stepId] is not reachable
// through the public commit flow. A slot key has no such constraint: it's
// an arbitrary caller-supplied key that can legitimately be resubmitted
// across two different steps in the same session, so a correction there
// appends what it replaced instead of silently destroying it. slots stays
// "latest value only" so every existing reader is unaffected.
export const interviewStoreCorrectionsSchema = z.object({
  slots: z.record(z.string(), z.array(correctionEntrySchema)).default({}),
});

export const interviewStorePayloadSchema = z.object({
  progress: progressSchema,
  answers: z.record(z.string(), z.string()),
  slots: z.record(z.string(), slotProvenanceRecordSchema),
  corrections: interviewStoreCorrectionsSchema.optional(),
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
export type CorrectionEntry = z.infer<typeof correctionEntrySchema>;
export type InterviewStoreCorrections = z.infer<typeof interviewStoreCorrectionsSchema>;
export type InterviewStorePayload = z.infer<typeof interviewStorePayloadSchema>;
export type InterviewStoreEnvelope = z.infer<typeof interviewStoreEnvelopeSchema>;

// This is the canonical interview store's own schema_version namespace — it
// tracks interview-state.json's payload shape, not the package/runtime
// release version (src/version.ts RUNTIME_VERSION, currently 6.0.0). The two
// have coincidentally diverged already and must stay allowed to: a future
// package bump to 7.0.0 is not a reason to touch this, and a future store
// schema migration is not a reason to touch RUNTIME_VERSION.
export const INTERVIEW_STORE_VERSION = '7.0.0';
