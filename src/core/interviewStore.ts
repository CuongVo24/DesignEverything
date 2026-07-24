import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdirSync,
  statSync,
} from 'fs';
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
  mkdirSync(dirname(lockPath), { recursive: true });

  const start = Date.now();
  while (true) {
    if (!existsSync(lockPath)) {
      try {
        writeFileSync(lockPath, JSON.stringify({ pid: process.pid, time: Date.now() }), { flag: 'wx' });
        return;
      } catch {
        // Retry
      }
    } else {
      // Check stale lock
      try {
        const stats = statSync(lockPath);
        if (Date.now() - stats.mtimeMs > 30000) {
          // Lock stale (> 30s) -> force release
          unlinkSync(lockPath);
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
  if (existsSync(lockPath)) {
    try {
      unlinkSync(lockPath);
    } catch {
      // Ignore
    }
  }
}

export function loadInterviewStore(workspaceRoot: string): InterviewStoreEnvelope {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);

  // Auto-migrate if canonical store does not exist yet
  if (!existsSync(canonicalPath)) {
    migrateInterviewStore(workspaceRoot);
  }

  if (!existsSync(canonicalPath)) {
    throw new Error('INTERVIEW_STORE_NOT_FOUND: Canonical store does not exist and migration did not produce one.');
  }

  const content = readFileSync(canonicalPath, 'utf8');
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

export function transactInterviewStore(
  workspaceRoot: string,
  expectedRevision: number | null,
  mutator: (envelope: InterviewStoreEnvelope) => InterviewStoreEnvelope
): InterviewStoreEnvelope {
  acquireLock(workspaceRoot);
  try {
    const current = loadInterviewStore(workspaceRoot);

    if (expectedRevision !== null && current.state_revision !== expectedRevision) {
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
    mkdirSync(dirname(canonicalPath), { recursive: true });

    writeFileSync(tmpPath, JSON.stringify(validated, null, 2), 'utf8');
    renameSync(tmpPath, canonicalPath);

    return validated;
  } finally {
    releaseLock(workspaceRoot);
  }
}
