import fs from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  interviewStoreEnvelopeSchema,
  INTERVIEW_STORE_VERSION,
  type InterviewStoreEnvelope,
  type InterviewStorePayload,
} from './schemas/interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';

export const CANONICAL_STORE_REL_PATH = '.design-everything/interview-state.json';
export const LOCK_REL_PATH = '.design-everything/interview-state.lock';

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

export function acquireLock(workspaceRoot: string, timeoutMs: number = 5000): void {
  const lockPath = join(workspaceRoot, LOCK_REL_PATH);
  fs.mkdirSync(dirname(lockPath), { recursive: true });

  const start = Date.now();
  while (true) {
    if (!fs.existsSync(lockPath)) {
      try {
        fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, time: Date.now() }), { flag: 'wx' });
        return;
      } catch {
        // Retry
      }
    } else {
      // Check stale lock or dead process PID
      try {
        let isAlive = false;
        if (fs.existsSync(lockPath)) {
          const raw = fs.readFileSync(lockPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.pid === 'number') {
            try {
              process.kill(parsed.pid, 0);
              isAlive = true;
            } catch {
              isAlive = false; // PID is dead
            }
          }
        }
        const stats = fs.statSync(lockPath);
        if (!isAlive || Date.now() - stats.mtimeMs > 30000) {
          // Lock stale or owner process dead -> force release
          fs.unlinkSync(lockPath);
        }
      } catch {
        // Ignore
      }
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`LOCK_TIMEOUT: Could not acquire workspace lock within ${timeoutMs}ms`);
    }

    // Micro sleep
    const end = Date.now() + 50;
    while (Date.now() < end) {
      // spin
    }
  }
}

export function releaseLock(workspaceRoot: string): void {
  const lockPath = join(workspaceRoot, LOCK_REL_PATH);
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Ignore
    }
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
  acquireLock(workspaceRoot);
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

    // Write temp file on same volume + flush + rename
    const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);
    const tmpPath = `${canonicalPath}.tmp.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
    fs.mkdirSync(dirname(canonicalPath), { recursive: true });

    fs.writeFileSync(tmpPath, JSON.stringify(validated, null, 2), 'utf8');
    fs.renameSync(tmpPath, canonicalPath);

    return validated;
  } finally {
    releaseLock(workspaceRoot);
  }
}

function writeEnvelopeAtomic(workspaceRoot: string, envelope: InterviewStoreEnvelope): void {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);
  const tmpPath = `${canonicalPath}.tmp.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  fs.mkdirSync(dirname(canonicalPath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(envelope, null, 2), 'utf8');
  fs.renameSync(tmpPath, canonicalPath);
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

  acquireLock(workspaceRoot);
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
    releaseLock(workspaceRoot);
  }
}
