import fs from 'fs';
import { join, dirname } from 'path';
import { createHash, randomBytes } from 'crypto';
import {
  interviewStoreEnvelopeSchema,
  INTERVIEW_STORE_VERSION,
  type InterviewStoreEnvelope,
  type InterviewStorePayload,
} from './schemas/interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';

export const CANONICAL_STORE_REL_PATH = '.design-everything/interview-state.json';
export const LOCK_REL_PATH = '.design-everything/interview-state.lock';

// A live owner is never reclaimed by TTL alone (P2.2b). This bound only
// applies when liveness genuinely cannot be determined (unparsable/legacy
// lock record, or a platform where PID-signal probing is inconclusive) —
// it's a last-resort fallback, not the primary staleness signal.
const LOCK_STALE_FALLBACK_MS = 30000;

export interface LockRecord {
  nonce: string;
  pid: number;
  session_id: string | null;
  acquired_at: string;
  target: string;
}

export interface AcquireLockOptions {
  timeoutMs?: number;
  sessionId?: string | null;
}

export function computePayloadChecksum(payload: InterviewStorePayload): string {
  const sortedAnswers: Record<string, string> = {};
  for (const k of Object.keys(payload.answers).sort()) {
    sortedAnswers[k] = payload.answers[k];
  }
  const sortedSlots: Record<string, unknown> = {};
  for (const k of Object.keys(payload.slots).sort()) {
    sortedSlots[k] = payload.slots[k];
  }

  const canonicalObj = {
    progress: payload.progress,
    answers: sortedAnswers,
    slots: sortedSlots,
  };

  return createHash('sha256').update(JSON.stringify(canonicalObj), 'utf8').digest('hex');
}

function readLockRecord(lockPath: string): LockRecord | null {
  try {
    const raw = fs.readFileSync(lockPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.nonce === 'string' &&
      typeof parsed.pid === 'number' &&
      typeof parsed.acquired_at === 'string'
    ) {
      return parsed as LockRecord;
    }
    return null;
  } catch {
    return null;
  }
}

/** true = alive, false = definitively dead, 'unknown' = platform couldn't tell. */
function probePidLiveness(pid: number): boolean | 'unknown' {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    if (code === 'EPERM') return true; // exists, just not signalable by us
    return 'unknown';
  }
}

function ttlExpired(lockPath: string): boolean {
  try {
    const stats = fs.statSync(lockPath);
    return Date.now() - stats.mtimeMs > LOCK_STALE_FALLBACK_MS;
  } catch {
    return true; // already gone
  }
}

function isLockStale(lockPath: string): boolean {
  const record = readLockRecord(lockPath);
  if (!record) {
    // Unparsable or legacy (pre-nonce) lock file — ownership can't be
    // verified at all, so only the bounded TTL fallback applies.
    return ttlExpired(lockPath);
  }

  const liveness = probePidLiveness(record.pid);
  if (liveness === false) return true; // owner process is definitively dead
  if (liveness === true) return false; // owner alive -> TTL alone never reclaims it
  return ttlExpired(lockPath); // liveness truly indeterminate -> bounded fallback only
}

function sleepSync(ms: number): void {
  // Node has no synchronous sleep primitive besides Atomics.wait on a
  // SharedArrayBuffer-backed view. This actually yields the OS thread
  // instead of burning CPU in a busy-spin loop (P2.2b) — important under
  // concurrent test/process load where a spin loop measurably starves
  // other work on the machine.
  const view = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(view, 0, 0, ms);
}

/**
 * Acquires the workspace's interview-store lock and returns the nonce that
 * proves ownership. The caller MUST pass that exact nonce to releaseLock —
 * there is no unconditional release, so a writer can never delete a lock it
 * doesn't actually hold (e.g. one that was reclaimed as stale and re-issued
 * to a different writer while this one was still executing).
 */
export function acquireLock(workspaceRoot: string, opts: AcquireLockOptions = {}): string {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const lockPath = join(workspaceRoot, LOCK_REL_PATH);
  fs.mkdirSync(dirname(lockPath), { recursive: true });

  const nonce = randomBytes(16).toString('hex');
  const record: LockRecord = {
    nonce,
    pid: process.pid,
    session_id: opts.sessionId ?? null,
    acquired_at: new Date().toISOString(),
    target: CANONICAL_STORE_REL_PATH,
  };
  const serialized = JSON.stringify(record);

  const start = Date.now();
  let attempt = 0;
  while (true) {
    try {
      fs.writeFileSync(lockPath, serialized, { flag: 'wx' });
      return nonce;
    } catch {
      // Lock file already exists (or a transient FS error) — fall through
      // to the staleness check below.
    }

    if (isLockStale(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
        continue; // retry immediately, no sleep needed
      } catch {
        // Another writer reclaimed/removed it first — fall through to retry.
      }
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`LOCK_TIMEOUT: Could not acquire workspace lock within ${timeoutMs}ms`);
    }

    attempt += 1;
    sleepSync(Math.min(50 * attempt, 250)); // bounded backoff, never a CPU spin
  }
}

/**
 * Releases the lock ONLY if `nonce` matches the current on-disk owner.
 * Never deletes a lock this caller doesn't actually hold.
 */
export function releaseLock(workspaceRoot: string, nonce: string): void {
  const lockPath = join(workspaceRoot, LOCK_REL_PATH);
  const record = readLockRecord(lockPath);
  if (!record || record.nonce !== nonce) {
    return;
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Already gone — fine.
  }
}

export function loadInterviewStore(workspaceRoot: string): InterviewStoreEnvelope {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);

  // Auto-migrate ONLY if legacy state exists — migrateInterviewStore never
  // fabricates fresh state itself (that is initializeInterviewStore's sole
  // job), so this is safe to call unconditionally: it is a no-op for a
  // truly uninvolved workspace.
  if (!fs.existsSync(canonicalPath)) {
    migrateInterviewStore(workspaceRoot);
  }

  if (!fs.existsSync(canonicalPath)) {
    throw new Error(
      'STORE_MISSING: Canonical interview store does not exist and there is no legacy state to migrate. ' +
        'Call initializeInterviewStore() explicitly to create a fresh store.'
    );
  }

  const content = fs.readFileSync(canonicalPath, 'utf8');
  let envelope: InterviewStoreEnvelope;
  try {
    const raw = JSON.parse(content);
    const parsed = interviewStoreEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid schema: ${parsed.error.message}`);
    }
    envelope = parsed.data;
  } catch (err: unknown) {
    throw new Error(`CANONICAL_CORRUPT: Canonical store is corrupt: ${(err as Error).message}`);
  }

  // Verify checksum
  const expectedChecksum = computePayloadChecksum(envelope.payload);
  if (envelope.checksum !== expectedChecksum) {
    throw new Error(`CHECKSUM_MISMATCH: Canonical store payload checksum verification failed. Expected ${expectedChecksum}, got ${envelope.checksum}`);
  }

  return envelope;
}

/**
 * The sole public mutation entrypoint for an EXISTING canonical store.
 * `expectedRevision` is mandatory (B1b/P2.2a) — there is no sentinel that
 * bypasses the CAS check. A caller that has no prior revision to compare
 * against (creating a store for the first time) must use
 * initializeInterviewStore() instead, which has its own no-conflict-possible
 * write path.
 */
export function transactInterviewStore(
  workspaceRoot: string,
  expectedRevision: number,
  mutator: (envelope: InterviewStoreEnvelope) => InterviewStoreEnvelope
): InterviewStoreEnvelope {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(
      `INVALID_EXPECTED_REVISION: expectedRevision must be a non-negative integer, got ${String(expectedRevision)}`
    );
  }
  const lockNonce = acquireLock(workspaceRoot);
  try {
    const current = loadInterviewStore(workspaceRoot);

    if (current.state_revision !== expectedRevision) {
      throw new Error(`REVISION_CONFLICT: Expected state revision ${expectedRevision}, but found ${current.state_revision}`);
    }

    const mutated = mutator(current);

    // Ensure state_revision increments
    mutated.state_revision = current.state_revision + 1;
    mutated.updated_at = new Date().toISOString();
    mutated.schema_version = INTERVIEW_STORE_VERSION;
    mutated.payload.progress.state_revision = mutated.state_revision;
    mutated.payload.progress.updated_at = mutated.updated_at;

    // Compute checksum
    mutated.checksum = computePayloadChecksum(mutated.payload);

    // Validate entire envelope before writing
    const validated = interviewStoreEnvelopeSchema.parse(mutated);

    writeEnvelopeAtomic(workspaceRoot, validated);

    return validated;
  } finally {
    releaseLock(workspaceRoot, lockNonce);
  }
}

/**
 * Durable atomic write (P2.2b): open -> write -> fsync -> close the temp
 * file (so its bytes are actually on disk, not just past writeFileSync's
 * buffered write) before the atomic rename makes it the canonical store.
 * Parent-directory fsync is attempted best-effort for the rename's
 * directory-entry update — POSIX only; Windows has no directory-fsync
 * equivalent (opening a directory for fsync fails there), so it's wrapped
 * and never allowed to fail the write. NTFS's own metadata journaling is
 * the practical guarantee on Windows, which is what this runtime targets.
 */
/** @internal exported for migrateInterviewStore.ts's own durable write — not part of the public store API. */
export function writeEnvelopeAtomic(workspaceRoot: string, envelope: InterviewStoreEnvelope): void {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);
  const dir = dirname(canonicalPath);
  const tmpPath = `${canonicalPath}.tmp.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  fs.mkdirSync(dir, { recursive: true });

  const data = JSON.stringify(envelope, null, 2);
  fs.writeFileSync(tmpPath, data, 'utf8');

  // Reopen to fsync: guarantees the bytes just written are durable on disk
  // before the rename below makes them visible as canonical, closing the
  // gap a buffered writeFileSync alone leaves open.
  const fd = fs.openSync(tmpPath, 'r+');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.renameSync(tmpPath, canonicalPath);

  try {
    const dirFd = fs.openSync(dir, 'r');
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {
    // Expected on Windows (no directory-fsync); not fatal anywhere else.
  }
}

function buildFreshProgress(): InterviewStorePayload['progress'] {
  const now = new Date().toISOString();
  return {
    version: '7.0.0',
    phase: 'interview',
    session_id: `session-${Date.now()}`,
    state_revision: 0,
    branch: null,
    current_step: 'CAL0',
    answered: [],
    emitted_docs: [],
    gates_passed: [],
    pending_turn_capability: null,
    last_user_turn_id: null,
    answered_len_at_last_turn: 0,
    updated_at: now,
    calibrate_mode: null,
  };
}

/**
 * The ONLY function allowed to create a fresh canonical store from nothing
 * (P2.2a §5.2). Explicit and single-purpose: refuses to run if a canonical
 * store already exists (use transactInterviewStore to mutate it) and refuses
 * to run if legacy state exists (use migrateInterviewStore so history isn't
 * silently discarded). A truly uninvolved workspace is the only target this
 * accepts.
 */
export function initializeInterviewStore(workspaceRoot: string): InterviewStoreEnvelope {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);
  const legacyProgressPath = join(workspaceRoot, 'progress.json');
  const legacyAnswersPath = join(workspaceRoot, 'Design/.interview/answers.json');

  const lockNonce = acquireLock(workspaceRoot);
  try {
    if (fs.existsSync(canonicalPath)) {
      throw new Error(
        'STORE_ALREADY_EXISTS: Canonical interview store already exists; use transactInterviewStore to mutate it.'
      );
    }
    if (fs.existsSync(legacyProgressPath) || fs.existsSync(legacyAnswersPath)) {
      throw new Error(
        'MIGRATION_REQUIRED: Legacy interview state exists in this workspace; call migrateInterviewStore instead of initializing fresh.'
      );
    }

    const now = new Date().toISOString();
    const progress = buildFreshProgress();
    const payload: InterviewStorePayload = { progress, answers: {}, slots: {} };
    const envelope: InterviewStoreEnvelope = {
      schema_version: INTERVIEW_STORE_VERSION,
      state_revision: 0,
      session_id: progress.session_id,
      checksum: computePayloadChecksum(payload),
      payload,
      updated_at: now,
    };

    writeEnvelopeAtomic(workspaceRoot, envelope);
    return envelope;
  } finally {
    releaseLock(workspaceRoot, lockNonce);
  }
}
