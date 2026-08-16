import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

export const turnCapabilityRecordSchema = z.object({
  token_hash: z.string(),
  session_id: z.string(),
  operation_kind: z.enum(['interview', 'deepen']),
  question_id: z.string(),
  subject_id: z.string().nullable(),
  expected_revision: z.number().int().min(0),
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  consumed_at: z.string().datetime().nullable(),
  status: z.enum(['active', 'consumed', 'invalidated', 'expired']),
  // B24b (D60) — batch capability. `question_id` above stays required and
  // always equals `question_ids[0]` when this is present, so every
  // pre-existing reader (deepenState.ts, every test that builds a record by
  // hand) keeps working unmodified. Both fields are `.optional()`, NOT
  // `.default()`: computePayloadChecksum (interviewStore.ts) runs on the
  // envelope AFTER zod-parse, and this record is nested inside
  // progress/payload — a `.default([])` would silently inject a value into
  // every capability record written before this field existed, changing
  // what gets hashed and producing CHECKSUM_MISMATCH on every store already
  // on disk. `.optional()` leaves an absent field as `undefined`, which
  // JSON.stringify drops, so the checksum of an old record is unaffected.
  // Read via `cap.question_ids ?? [cap.question_id]`, never bare.
  question_ids: z.array(z.string()).optional(),
  // Which of `question_ids` have already been consumed by a commit within
  // this same batch, in commit order. Absent/empty means none yet. A
  // single-question token (no `question_ids`) never populates this.
  consumed_question_ids: z.array(z.string()).optional(),
});

export type TurnCapabilityRecord = z.infer<typeof turnCapabilityRecordSchema>;

export interface IssueCapabilityInput {
  sessionId: string;
  operationKind: 'interview' | 'deepen';
  questionId: string;
  subjectId?: string | null;
  ttlSeconds?: number;
}

export interface IssueCapabilityResult {
  token: string;
  tokenHash: string;
  capability: TurnCapabilityRecord;
  expiresAt: string;
}

export type VerifyTurnReasonCode =
  | 'VALID'
  | 'TURN_CAPABILITY_MISSING'
  | 'TURN_CAPABILITY_REPLAY'
  | 'TURN_CAPABILITY_FORGED'
  | 'TURN_CAPABILITY_EXPIRED'
  | 'TURN_CAPABILITY_WRONG_SESSION'
  | 'TURN_CAPABILITY_WRONG_QUESTION'
  | 'TURN_CAPABILITY_WRONG_SUBJECT'
  | 'TURN_CAPABILITY_WRONG_REVISION'
  | 'TURN_CAPABILITY_WRONG_KIND';

export interface VerifyTurnResult {
  valid: boolean;
  reason_code: VerifyTurnReasonCode;
  message: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function issueTurnCapability(
  stateRevision: number,
  input: IssueCapabilityInput
): IssueCapabilityResult {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const ttl = input.ttlSeconds ?? 1800; // 30 mins default
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

  const capability: TurnCapabilityRecord = {
    token_hash: tokenHash,
    session_id: input.sessionId,
    operation_kind: input.operationKind,
    question_id: input.questionId,
    subject_id: input.subjectId ?? null,
    expected_revision: stateRevision,
    issued_at: now.toISOString(),
    expires_at: expiresAt,
    consumed_at: null,
    status: 'active',
  };

  return {
    token,
    tokenHash,
    capability,
    expiresAt,
  };
}

export function verifyTurnCapability(
  pendingCapability: TurnCapabilityRecord | null | undefined,
  token: string,
  expected: {
    sessionId: string;
    operationKind: 'interview' | 'deepen';
    questionId: string;
    subjectId?: string | null;
    currentRevision: number;
  }
): VerifyTurnResult {
  if (!pendingCapability) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_MISSING',
      message: 'No pending turn capability found in state',
    };
  }

  const tokenHash = hashToken(token);

  if (pendingCapability.token_hash !== tokenHash) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_FORGED',
      message: 'Turn capability token signature / hash mismatch',
    };
  }

  // B24b (D60) — batch-aware replay check. A batch token's `question_ids`
  // defaults to `[question_id]` when absent, so a single-question token's
  // check collapses to the original bare comparison below it. Checking the
  // per-question consumed list FIRST catches replay of an already-committed
  // question within a still-active batch (status stays 'active' until every
  // question in the batch is consumed — see advanceState.ts's commitStep);
  // the original whole-record check right after still catches the fully-
  // consumed/invalidated case for a single-question token exactly as before.
  const consumedIds = pendingCapability.consumed_question_ids ?? [];
  if (consumedIds.includes(expected.questionId)) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_REPLAY',
      message: `Question ${expected.questionId} has already been consumed within this batch (replay attack prevented)`,
    };
  }

  if (pendingCapability.status === 'consumed' || pendingCapability.consumed_at !== null) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_REPLAY',
      message: 'Turn capability has already been consumed (replay attack prevented)',
    };
  }

  if (pendingCapability.status !== 'active') {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_EXPIRED',
      message: `Turn capability status is ${pendingCapability.status}`,
    };
  }

  const now = new Date().toISOString();
  if (pendingCapability.expires_at < now) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_EXPIRED',
      message: 'Turn capability token has expired',
    };
  }

  if (pendingCapability.session_id !== expected.sessionId) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_SESSION',
      message: `Session mismatch: expected ${expected.sessionId}, got ${pendingCapability.session_id}`,
    };
  }

  if (pendingCapability.operation_kind !== expected.operationKind) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_KIND',
      message: `Operation kind mismatch: expected ${expected.operationKind}, got ${pendingCapability.operation_kind}`,
    };
  }

  // B24b (D60) — the token is valid for any question in its batch, not
  // just `question_id` (which is always batchIds[0]). A single-question
  // token has `batchIds === [question_id]`, so this is exactly the old
  // check when there is no batch.
  const batchIds = pendingCapability.question_ids ?? [pendingCapability.question_id];
  if (!batchIds.includes(expected.questionId)) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_QUESTION',
      message: `Question ID mismatch: expected one of [${batchIds.join(', ')}], got ${expected.questionId}`,
    };
  }

  const expectedSubject = expected.subjectId ?? null;
  if (pendingCapability.subject_id !== expectedSubject) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_SUBJECT',
      message: `Subject ID mismatch: expected ${expectedSubject}, got ${pendingCapability.subject_id}`,
    };
  }

  // B24b (D60) — each commit inside a batch bumps state_revision by
  // exactly one (transactInterviewStore), so the Nth commit in a batch is
  // expected to observe expected_revision + N (N = how many of this
  // batch's questions have already been consumed), not the token's
  // original expected_revision unmodified. consumedIds.length is 0 for the
  // first commit of any token (batch or not), so this collapses to the
  // original bare comparison when there is no batch.
  if (pendingCapability.expected_revision + consumedIds.length !== expected.currentRevision) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_REVISION',
      message: `State revision mismatch: expected ${pendingCapability.expected_revision + consumedIds.length}, got ${expected.currentRevision}`,
    };
  }

  return {
    valid: true,
    reason_code: 'VALID',
    message: 'Turn capability verified successfully',
  };
}
