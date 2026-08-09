import fs from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { hashToken, generateOpaqueToken } from './turnCapability.js';
import { readAckStore, writeAckStoreAtomic, ACK_CONSUMED_DIR_REL_PATH } from './ackCapabilityStore.js';
import { computeWarningDigest, type AckCapabilityRecord, type AckWarningInput } from './schemas/ackCapability.js';
import { verifyAckCapability, type AckExpectation, type VerifyAckResult } from './ackCapabilityVerify.js';

/**
 * A1-01 (Wave A1, 8.1.0 rollout — Design/RoadMap/MasterSequencingPlan.md) —
 * capability token for overrideable "needs_user_ack" warnings (script.yaml
 * warning_rules: persona chung chung, mọi mục Must, offline/sync, lên store
 * thật, realtime, phân phối đa nền tảng — see QualityRubric.md §G). This is
 * deliberately NOT used for derived-recipe provenance, which is a
 * deterministic reject; see the G0 interface note at
 * Design/ContractForAI/Core/v1-fix-bugs/b3b-g0-interface-note.md §0.
 *
 * Replaces the bare `ackWarnings?: boolean` pattern
 * (interviewApplicationServices.ts, cliOps/commit.ts's `--ack-warnings`)
 * that plan-v1-bonus-tasks.md:919-925 itself flags as not a real
 * capability: nothing bound it to the warning content, the interview
 * revision, or a single use. A token here is bound to all three and can
 * only be consumed once. Verification lives in ackCapabilityVerify.ts;
 * see that file's comment for the failure-mode ordering.
 */

export { verifyAckCapability, type AckExpectation, type VerifyAckResult, type VerifyAckReasonCode } from './ackCapabilityVerify.js';
export { computeWarningDigest, type AckWarningInput } from './schemas/ackCapability.js';
export type { AckCapabilityRecord } from './schemas/ackCapability.js';

const DEFAULT_TTL_SECONDS = 1800; // mirrors turnCapability.ts's default

export interface IssueAckCapabilityInput {
  workspaceRoot: string;
  sessionId: string;
  warnings: AckWarningInput[];
  interviewStateRevision: number;
  inputDigest: string;
  generationId?: string | null;
  ttlSeconds?: number;
}

export interface IssueAckCapabilityResult {
  token: string;
  capability: AckCapabilityRecord;
}

export function issueAckCapability(input: IssueAckCapabilityInput): IssueAckCapabilityResult {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

  const capability: AckCapabilityRecord = {
    token_hash: tokenHash,
    workspace_root: input.workspaceRoot,
    session_id: input.sessionId,
    warning_digest: computeWarningDigest(input.warnings),
    interview_state_revision: input.interviewStateRevision,
    input_digest: input.inputDigest,
    generation_id: input.generationId ?? null,
    issued_at: now.toISOString(),
    expires_at: expiresAt,
    consumed_at: null,
    status: 'active',
    nonce: randomBytes(16).toString('hex'),
  };

  const existing = readAckStore(input.workspaceRoot);
  existing.push(capability);
  writeAckStoreAtomic(input.workspaceRoot, existing);

  return { token, capability };
}

/**
 * Verifies AND atomically consumes in one call. The real single-winner
 * guarantee under concurrent consumption is the exclusive ('wx') creation
 * of a marker file per token hash — that syscall can only succeed once no
 * matter how many callers race it, unlike a read-modify-write on the JSON
 * store array. The store's own `status`/`consumed_at` fields are then
 * updated best-effort for audit visibility, not as the source of truth.
 */
export function consumeAckCapability(token: string | null | undefined, expected: AckExpectation): VerifyAckResult {
  const verified = verifyAckCapability(token, expected);
  if (!verified.valid) return verified;

  const record = verified.capability!;
  const consumedDir = join(expected.workspaceRoot, ACK_CONSUMED_DIR_REL_PATH);
  fs.mkdirSync(consumedDir, { recursive: true });
  const markerPath = join(consumedDir, `${record.token_hash}.json`);

  try {
    const fd = fs.openSync(markerPath, 'wx');
    fs.writeSync(fd, JSON.stringify({ consumed_at: new Date().toISOString() }));
    fs.closeSync(fd);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      return {
        valid: false,
        reason_code: 'ACK_TOKEN_REPLAY',
        message: 'Ack token was consumed by a concurrent request.',
        capability: record,
      };
    }
    throw err;
  }

  // Best-effort audit update — the marker file above is what actually
  // enforces single-use; a failure here must not undo the consumption.
  try {
    const all = readAckStore(expected.workspaceRoot);
    const idx = all.findIndex((r) => r.token_hash === record.token_hash);
    if (idx !== -1) {
      all[idx] = { ...all[idx], status: 'consumed', consumed_at: new Date().toISOString() };
      writeAckStoreAtomic(expected.workspaceRoot, all);
    }
  } catch {
    // Non-fatal — see comment above.
  }

  return { valid: true, reason_code: 'VALID', message: 'Ack token consumed.', capability: record };
}
