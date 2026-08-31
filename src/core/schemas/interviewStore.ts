import { z } from 'zod';
import { progressSchema } from './state.js';

// A1-P6 (B3a) — additive envelope enrichment: envelopes written before these
// fields existed simply omit them (optional, same backward-compatible
// pattern as producer_version/corrections below). slot_schema_version
// versions this envelope shape itself (bump on the next breaking change);
// question_id is the interview step this slot's value came from, when
// known; source_answer_revisions ties a slot to the store state_revision(s)
// its value was derived from (there is no answer-revisioning system yet —
// R21/amend is deferred past 7.0.0 — so this is the store's existing
// state_revision counter, not a fabricated per-answer version).
export const slotProvenanceRecordSchema = z.object({
  value: z.string(),
  provenance: z.string(),
  updated_at: z.string().datetime(),
  producer_version: z.string().optional(),
  slot_schema_version: z.string().optional(),
  question_id: z.string().optional(),
  source_answer_revisions: z.array(z.string()).optional(),
});

export const correctionEntrySchema = z.object({
  previous_value: z.string(),
  previous_revision: z.number().int().min(0),
  corrected_at: z.string().datetime(),
});

// Additive, backward-compatible: envelopes written before this field existed
// simply omit it (optional). Originally scoped to slots only, not
// answers[stepId] — commitStep's capability is bound to (and always
// advances) current_step, so re-committing an already-confirmed
// answers[stepId] was not reachable through the public commit flow. A slot
// key has no such constraint: it's an arbitrary caller-supplied key that
// can legitimately be resubmitted across two different steps in the same
// session, so a correction there appends what it replaced instead of
// silently destroying it. slots stays "latest value only" so every existing
// reader is unaffected.
//
// B24a (D59) — `answers` breaks that premise on purpose: `undo` is a new,
// narrow, single-step exception to "answers[stepId] is never re-committed"
// (see undoStep.ts). When undo removes answers[qid], the value it deleted
// is recorded here the same way a slot correction is — appended, not
// overwritten — so the history of what a question was previously answered
// survives even though the live `answers` map no longer has it. Optional
// for the same reason `corrections` itself is optional: envelopes written
// before undo existed simply don't have it, and it stays outside
// computePayloadChecksum (interviewStore.ts) exactly like `corrections.slots`
// already was.
export const interviewStoreCorrectionsSchema = z.object({
  slots: z.record(z.string(), z.array(correctionEntrySchema)).default({}),
  answers: z.record(z.string(), z.array(correctionEntrySchema)).optional(),
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

// Versions the slot envelope shape above, independent of RUNTIME_VERSION/
// package version; bump only when the envelope shape itself changes.
export const SLOT_ENVELOPE_SCHEMA_VERSION = '1.0.0';

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
