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

  if (pendingCapability.question_id !== expected.questionId) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_QUESTION',
      message: `Question ID mismatch: expected ${expected.questionId}, got ${pendingCapability.question_id}`,
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

  if (pendingCapability.expected_revision !== expected.currentRevision) {
    return {
      valid: false,
      reason_code: 'TURN_CAPABILITY_WRONG_REVISION',
      message: `State revision mismatch: expected ${expected.currentRevision}, got ${pendingCapability.expected_revision}`,
    };
  }

  return {
    valid: true,
    reason_code: 'VALID',
    message: 'Turn capability verified successfully',
  };
}
