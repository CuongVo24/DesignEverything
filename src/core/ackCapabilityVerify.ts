import { hashToken } from './turnCapability.js';
import { readAckStore } from './ackCapabilityStore.js';
import { computeWarningDigest, type AckWarningInput } from './schemas/ackCapability.js';
import type { AckCapabilityRecord } from './schemas/ackCapability.js';

/**
 * Split out of ackCapability.ts to keep both files under the repo's
 * 200-line hand-authored limit. Read-only verification only — issuance and
 * single-use consumption live in ackCapability.ts.
 */

export type VerifyAckReasonCode =
  | 'VALID'
  | 'ACK_TOKEN_MISSING'
  | 'ACK_TOKEN_FORGED'
  | 'ACK_TOKEN_REPLAY'
  | 'ACK_TOKEN_EXPIRED'
  | 'ACK_TOKEN_WRONG_WORKSPACE'
  | 'ACK_TOKEN_WRONG_SESSION'
  | 'ACK_TOKEN_WARNING_MISMATCH'
  | 'ACK_TOKEN_REVISION_MISMATCH'
  | 'ACK_TOKEN_GENERATION_MISMATCH';

export interface VerifyAckResult {
  valid: boolean;
  reason_code: VerifyAckReasonCode;
  message: string;
  capability?: AckCapabilityRecord;
}

export interface AckExpectation {
  workspaceRoot: string;
  sessionId: string;
  warnings: AckWarningInput[];
  interviewStateRevision: number;
  inputDigest: string;
  generationId?: string | null;
}

/**
 * Read-only check: does this token, as presented, satisfy `expected`? Does
 * NOT mark the token consumed — callers that intend to act on a valid
 * result must call consumeAckCapability, which re-verifies under the
 * single-use lock rather than trusting a verify done moments earlier.
 * Failure-mode ordering mirrors turnCapability.ts's verifyTurnCapability
 * deliberately: missing -> forged -> replay -> expired -> wrong
 * workspace/session -> content mismatch -> generation mismatch.
 */
export function verifyAckCapability(token: string | null | undefined, expected: AckExpectation): VerifyAckResult {
  if (!token) {
    return { valid: false, reason_code: 'ACK_TOKEN_MISSING', message: 'No ack token provided.' };
  }

  const tokenHash = hashToken(token);
  const record = readAckStore(expected.workspaceRoot).find((r) => r.token_hash === tokenHash);

  if (!record) {
    return { valid: false, reason_code: 'ACK_TOKEN_FORGED', message: 'Ack token does not match any issued challenge.' };
  }
  if (record.status === 'consumed' || record.consumed_at !== null) {
    return { valid: false, reason_code: 'ACK_TOKEN_REPLAY', message: 'Ack token has already been consumed.', capability: record };
  }
  if (record.status !== 'active') {
    return { valid: false, reason_code: 'ACK_TOKEN_EXPIRED', message: `Ack token status is ${record.status}.`, capability: record };
  }
  if (record.expires_at < new Date().toISOString()) {
    return { valid: false, reason_code: 'ACK_TOKEN_EXPIRED', message: 'Ack token has expired.', capability: record };
  }
  if (record.workspace_root !== expected.workspaceRoot) {
    return { valid: false, reason_code: 'ACK_TOKEN_WRONG_WORKSPACE', message: 'Ack token was issued for a different workspace.', capability: record };
  }
  if (record.session_id !== expected.sessionId) {
    return { valid: false, reason_code: 'ACK_TOKEN_WRONG_SESSION', message: 'Ack token was issued for a different session.', capability: record };
  }

  const expectedDigest = computeWarningDigest(expected.warnings);
  if (record.warning_digest !== expectedDigest) {
    return {
      valid: false,
      reason_code: 'ACK_TOKEN_WARNING_MISMATCH',
      message: 'The warning set has changed since this ack token was issued; re-request acknowledgement.',
      capability: record,
    };
  }
  if (record.interview_state_revision !== expected.interviewStateRevision) {
    return {
      valid: false,
      reason_code: 'ACK_TOKEN_REVISION_MISMATCH',
      message: 'Interview state advanced since this ack token was issued; re-request acknowledgement.',
      capability: record,
    };
  }
  if (record.input_digest !== expected.inputDigest) {
    return {
      valid: false,
      reason_code: 'ACK_TOKEN_WARNING_MISMATCH',
      message: 'The underlying input changed since this ack token was issued; re-request acknowledgement.',
      capability: record,
    };
  }

  const expectedGeneration = expected.generationId ?? null;
  if (record.generation_id !== expectedGeneration) {
    return {
      valid: false,
      reason_code: 'ACK_TOKEN_GENERATION_MISMATCH',
      message: 'Ack token was issued for a different staged generation.',
      capability: record,
    };
  }

  return { valid: true, reason_code: 'VALID', message: 'Ack token verified.', capability: record };
}
