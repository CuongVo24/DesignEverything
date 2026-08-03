import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { progressSchema, type Progress } from './schemas/index.js';
import {
  computePayloadChecksum,
  CANONICAL_STORE_REL_PATH,
  loadInterviewStore,
  acquireLock,
  releaseLock,
  writeEnvelopeAtomic,
  cleanupOrphanTempFiles,
} from './interviewStore.js';
import {
  INTERVIEW_STORE_VERSION,
  type InterviewStoreEnvelope,
} from './schemas/interviewStore.js';

export type MigrateInterviewStoreOutcome = 'migrated' | 'already-current' | 'no-legacy';

/**
 * Migrates legacy progress.json/answers.json into the canonical store.
 * Never fabricates fresh state — a workspace with no canonical store AND no
 * legacy files is reported as 'no-legacy' and left untouched; only
 * initializeInterviewStore() may create a store from nothing (P2.2a §5.2/5.4:
 * "Missing cả hai ở workspace uninvolved chỉ đi qua explicit initializer").
 *
 * P2.2b hardening:
 * - An existing canonical store is schema/checksum-validated before being
 *   declared 'already-current' — corruption is never silently accepted as a
 *   no-op.
 * - A legacy progress.json/answers.json that exists but fails to parse is a
 *   structured blocking error, never silently treated as "no legacy" (which
 *   would let a caller fabricate fresh state and discard real data).
 * - The whole read-backup-write sequence runs under the same workspace lock
 *   as every other canonical mutation, so two concurrent migrations can't
 *   race each other or interleave with a transactInterviewStore call.
 * - The backup directory name includes a random suffix, not just
 *   Date.now(), so two migrations landing in the same millisecond can't
 *   collide.
 */
export function migrateInterviewStore(workspaceRoot: string): MigrateInterviewStoreOutcome {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);

  if (existsSync(canonicalPath)) {
    try {
      loadInterviewStore(workspaceRoot);
      return 'already-current';
    } catch (err: unknown) {
      throw new Error(
        `MIGRATION_BLOCKED_CANONICAL_CORRUPT: Existing canonical store failed validation and was left untouched: ${(err as Error).message}`
      );
    }
  }

  const legacyProgressPath = join(workspaceRoot, 'progress.json');
  const legacyAnswersPath = join(workspaceRoot, 'Design/.interview/answers.json');

  let legacyProgress: Progress | null = null;
  if (existsSync(legacyProgressPath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(legacyProgressPath, 'utf8'));
    } catch (err: unknown) {
      throw new Error(
        `MIGRATION_BLOCKED_LEGACY_CORRUPT: progress.json exists but is not valid JSON (${(err as Error).message}); refusing to silently treat it as absent.`
      );
    }
    // `ready-to-build` was the pre-P3 terminal interview phase. Convert it
    // only while importing a legacy progress.json; canonical stores never
    // accept that phase because it falsely implies coding may begin.
    const candidate =
      raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as { phase?: unknown }).phase === 'ready-to-build'
        ? { ...(raw as Record<string, unknown>), phase: 'ready-for-validation' }
        : raw;
    const parsed = progressSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error(
        `MIGRATION_BLOCKED_LEGACY_CORRUPT: progress.json exists but failed schema validation; refusing to silently treat it as absent. ${parsed.error.message}`
      );
    }
    legacyProgress = parsed.data;
  }

  let legacyAnswers: Record<string, string> = {};
  if (existsSync(legacyAnswersPath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(legacyAnswersPath, 'utf8'));
    } catch (err: unknown) {
      throw new Error(
        `MIGRATION_BLOCKED_LEGACY_CORRUPT: Design/.interview/answers.json exists but is not valid JSON (${(err as Error).message}); refusing to silently discard it.`
      );
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(
        'MIGRATION_BLOCKED_LEGACY_CORRUPT: Design/.interview/answers.json exists but is not a JSON object; refusing to silently discard it.'
      );
    }
    legacyAnswers = raw as Record<string, string>;
  }

  if (!legacyProgress) {
    // A bare answers.json with no progress.json is not "no legacy" — it is
    // real answer data with nothing to attach it to. Silently ignoring it
    // (as a prior version of this function did) would let a caller run
    // initializeInterviewStore() next and discard that data forever, which
    // is exactly the "reset/fail-open" pattern this migrator exists to
    // prevent (R02/P2.2a).
    if (Object.keys(legacyAnswers).length > 0) {
      throw new Error(
        'MIGRATION_BLOCKED_ANSWERS_WITHOUT_PROGRESS: Design/.interview/answers.json has data but progress.json is missing; ' +
          'refusing to silently discard the answers. Restore progress.json or remove answers.json to acknowledge the loss explicitly.'
      );
    }
    return 'no-legacy';
  }

  // Conflicting-pair guard (P2.2a §5): a fully disjoint set between the
  // steps progress.json already marks answered and the keys answers.json
  // actually has strongly suggests the two files came from different runs
  // (e.g. a stale answers.json copied back in) rather than one consistent
  // legacy session. Migrating either "answered but no text" or "text but
  // never marked answered" data silently would fabricate a plausible-looking
  // but wrong canonical store, so this fails closed instead of guessing.
  if (legacyProgress.answered.length > 0 && Object.keys(legacyAnswers).length > 0) {
    const answeredSet = new Set(legacyProgress.answered);
    const hasOverlap = Object.keys(legacyAnswers).some((key) => answeredSet.has(key));
    if (!hasOverlap) {
      throw new Error(
        'MIGRATION_BLOCKED_LEGACY_CONFLICT: progress.json answered steps and answers.json keys share no overlap; ' +
          'these look like they came from different interview sessions. Resolve the conflict manually before migrating.'
      );
    }
  }

  const lockNonce = acquireLock(workspaceRoot);
  try {
    cleanupOrphanTempFiles(workspaceRoot);
    // Re-check under the lock: another writer may have migrated or
    // initialized the store between our pre-lock check and acquiring it.
    if (existsSync(canonicalPath)) {
      try {
        loadInterviewStore(workspaceRoot);
        return 'already-current';
      } catch (err: unknown) {
        throw new Error(
          `MIGRATION_BLOCKED_CANONICAL_CORRUPT: Existing canonical store failed validation and was left untouched: ${(err as Error).message}`
        );
      }
    }

    // Backup legacy files — immutable and uniquely named so two migrations
    // in the same millisecond (or a rerun) never collide or overwrite an
    // earlier backup.
    const backupDir = join(
      workspaceRoot,
      '.design-everything/backups',
      `migration-${Date.now()}.${Math.floor(Math.random() * 1_000_000)}`
    );
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, 'progress.json'), readFileSync(legacyProgressPath));
    if (existsSync(legacyAnswersPath)) {
      writeFileSync(join(backupDir, 'answers.json'), readFileSync(legacyAnswersPath));
    }

    // Build migrated envelope
    const now = new Date().toISOString();
    const payload = {
      progress: {
        ...legacyProgress,
        state_revision: legacyProgress.state_revision ?? 0,
        session_id: legacyProgress.session_id ?? `session-${Date.now()}`,
      },
      answers: legacyAnswers,
      slots: {},
    };

    const envelope: InterviewStoreEnvelope = {
      schema_version: INTERVIEW_STORE_VERSION,
      state_revision: payload.progress.state_revision,
      session_id: payload.progress.session_id,
      checksum: computePayloadChecksum(payload),
      payload,
      updated_at: now,
    };

    writeEnvelopeAtomic(workspaceRoot, envelope);
    return 'migrated';
  } finally {
    releaseLock(workspaceRoot, lockNonce);
  }
}
