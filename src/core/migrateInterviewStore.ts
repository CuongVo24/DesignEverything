import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { progressSchema, type Progress } from './schemas/state.js';
import {
  computePayloadChecksum,
  CANONICAL_STORE_REL_PATH,
} from './interviewStore.js';
import {
  INTERVIEW_STORE_VERSION,
  type InterviewStoreEnvelope,
} from './schemas/interviewStore.js';

export function migrateInterviewStore(workspaceRoot: string): 'migrated' | 'already-current' | 'fresh' {
  const canonicalPath = join(workspaceRoot, CANONICAL_STORE_REL_PATH);
  if (existsSync(canonicalPath)) {
    return 'already-current';
  }

  const legacyProgressPath = join(workspaceRoot, 'progress.json');
  const legacyAnswersPath = join(workspaceRoot, 'Design/.interview/answers.json');

  let legacyProgress: Progress | null = null;
  let legacyAnswers: Record<string, string> = {};

  if (existsSync(legacyProgressPath)) {
    try {
      const raw = JSON.parse(readFileSync(legacyProgressPath, 'utf8'));
      const parsed = progressSchema.safeParse(raw);
      if (parsed.success) {
        legacyProgress = parsed.data;
      }
    } catch {
      // Ignore
    }
  }

  if (existsSync(legacyAnswersPath)) {
    try {
      const raw = JSON.parse(readFileSync(legacyAnswersPath, 'utf8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        legacyAnswers = raw;
      }
    } catch {
      // Ignore
    }
  }

  const now = new Date().toISOString();

  // Create initial fresh store if no legacy files
  if (!legacyProgress) {
    const freshProgress: Progress = {
      version: '7.0.0',
      phase: 'interview',
      session_id: `session-${Date.now()}`,
      state_revision: 0,
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: now,
      calibrate_mode: null,
    };

    const payload = {
      progress: freshProgress,
      answers: {},
      slots: {},
    };

    const envelope: InterviewStoreEnvelope = {
      schema_version: INTERVIEW_STORE_VERSION,
      state_revision: 0,
      session_id: freshProgress.session_id,
      checksum: computePayloadChecksum(payload),
      payload,
      updated_at: now,
    };

    mkdirSync(dirname(canonicalPath), { recursive: true });
    writeFileSync(canonicalPath, JSON.stringify(envelope, null, 2), 'utf8');
    return 'fresh';
  }

  // Backup legacy files
  const backupDir = join(workspaceRoot, '.design-everything/backups', `migration-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });

  if (existsSync(legacyProgressPath)) {
    writeFileSync(join(backupDir, 'progress.json'), readFileSync(legacyProgressPath));
  }
  if (existsSync(legacyAnswersPath)) {
    writeFileSync(join(backupDir, 'answers.json'), readFileSync(legacyAnswersPath));
  }

  // Build migrated envelope
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

  mkdirSync(dirname(canonicalPath), { recursive: true });
  writeFileSync(canonicalPath, JSON.stringify(envelope, null, 2), 'utf8');
  return 'migrated';
}
