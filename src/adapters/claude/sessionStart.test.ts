import { expect, test, describe, afterEach, beforeEach, vi } from 'vitest';
import { onSessionStart } from './sessionStart.js';
import * as core from '../../core/index.js';
import { loadInterviewStore, initializeInterviewStore, transactInterviewStore } from '../../core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testWorkspaceRoot = join(__dirname, '../../../test/fixtures/progress');
const progressPath = join(testWorkspaceRoot, 'progress.json');
const canonicalPath = join(testWorkspaceRoot, '.design-everything/interview-state.json');

function cleanup() {
  try {
    if (existsSync(progressPath)) {
      rmSync(progressPath, { force: true });
    }
    const storePath = join(testWorkspaceRoot, '.design-everything');
    if (existsSync(storePath)) {
      rmSync(storePath, { recursive: true, force: true });
    }
  } catch {
    // Ignore
  }
}

describe('onSessionStart hook', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test('should never fabricate state for a truly uninvolved workspace (P2.2a)', () => {
    expect(existsSync(canonicalPath)).toBe(false);

    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    // SessionStart is no longer the explicit initializer — nothing should
    // have been created. `init` is the only legitimate path to fresh state.
    expect(existsSync(progressPath)).toBe(false);
    expect(existsSync(canonicalPath)).toBe(false);
  });

  test('should migrate legacy progress.json into the canonical store when legacy state exists', () => {
    const legacyState = {
      version: '0.1.0',
      phase: 'interview',
      branch: 'web',
      session_id: 'legacy-session',
      state_revision: 0,
      current_step: 'W1',
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-6',
      answered_len_at_last_turn: 7,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
    };
    writeFileSync(progressPath, JSON.stringify(legacyState, null, 2), 'utf8');

    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    expect(existsSync(canonicalPath)).toBe(true);
    const envelope = loadInterviewStore(testWorkspaceRoot);
    expect(envelope.payload.progress.current_step).toBe('W1');
    expect(envelope.payload.progress.branch).toBe('web');

    // Legacy file itself is left in place (P2.2b: no destructive migration).
    expect(existsSync(progressPath)).toBe(true);
  });

  test('should leave an already-current canonical store untouched (idempotent)', () => {
    initializeInterviewStore(testWorkspaceRoot);
    transactInterviewStore(testWorkspaceRoot, 0, (env) => ({
      ...env,
      payload: { ...env.payload, progress: { ...env.payload.progress, current_step: 'S3' } },
    }));
    const before = loadInterviewStore(testWorkspaceRoot);

    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    const after = loadInterviewStore(testWorkspaceRoot);
    expect(after.state_revision).toBe(before.state_revision);
    expect(after.payload.progress.current_step).toBe('S3');
  });

  test('P4.2/R03 — returns the real inspectRuntimeHealth result instead of discarding it', () => {
    const result = onSessionStart({ workspaceRoot: testWorkspaceRoot });
    expect(result.health).toBeDefined();
    expect(result.health.status).toBe('uninvolved');
  });

  test('P4.2/R03 — a migration failure is reported via migrate_error, not swallowed', () => {
    // Corrupt legacy progress.json makes migrateInterviewStore throw
    // MIGRATION_BLOCKED_LEGACY_CORRUPT — a real, reachable error path, not a
    // mock. Before this fix, an empty catch inside onSessionStart absorbed
    // this and the caller never learned migration had failed.
    writeFileSync(progressPath, '{ not valid json', 'utf8');

    const result = onSessionStart({ workspaceRoot: testWorkspaceRoot });
    expect(result.migrate_error).toBeDefined();
    expect(result.migrate_error).toContain('MIGRATION_BLOCKED_LEGACY_CORRUPT');
  });

  test('P4.2/R03 — a recovery failure is reported via recover_error, not swallowed', () => {
    const spy = vi.spyOn(core, 'recoverEmit').mockImplementation(() => {
      throw new Error('simulated recovery failure');
    });
    try {
      const result = onSessionStart({ workspaceRoot: testWorkspaceRoot });
      expect(result.recover_error).toBe('simulated recovery failure');
    } finally {
      spy.mockRestore();
    }
  });
});
