import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import {
  transactInterviewStore,
  loadInterviewStore,
  acquireLock,
  releaseLock,
  computePayloadChecksum,
  type InterviewStoreEnvelope,
  CANONICAL_STORE_REL_PATH,
  LOCK_REL_PATH,
} from '../../src/core/interviewStore.js';
import { INTERVIEW_STORE_VERSION, interviewStoreEnvelopeSchema } from '../../src/core/schemas/interviewStore.js';
import { injectFsFault, restoreFsFaults } from '../helpers/faulty-filesystem.js';

const REPO_ROOT = join(__dirname, '../..');
const CRASH_WORKER = join(REPO_ROOT, 'test/helpers/crash-worker.mjs');

describe('B5b — Interview Transaction Fault Injection Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-interview-fault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const now = new Date().toISOString();
    const progress = {
      version: '4.0.0',
      session_id: 'default-session',
      state_revision: 1,
      phase: 'interview',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: ['S0'],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: 'turn-0',
      answered_len_at_last_turn: 1,
      updated_at: now,
    };

    const rawEnvelope = {
      schema_version: INTERVIEW_STORE_VERSION,
      state_revision: 1,
      session_id: 'default-session',
      updated_at: now,
      checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      payload: {
        progress,
        answers: { S0: 'Web application' },
        slots: {},
      },
    };

    const envelope = interviewStoreEnvelopeSchema.parse(rawEnvelope);
    envelope.checksum = computePayloadChecksum(envelope.payload);

    const canonicalPath = join(tmpDir, CANONICAL_STORE_REL_PATH);
    mkdirSync(join(tmpDir, '.design-everything'), { recursive: true });
    writeFileSync(canonicalPath, JSON.stringify(envelope, null, 2), 'utf8');
  });

  afterEach(() => {
    restoreFsFaults();
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('FI-01 — should handle lock contention and timeout when workspace lock is held', () => {
    acquireLock(tmpDir);

    try {
      expect(() => {
        transactInterviewStore(tmpDir, 1, (env) => {
          env.payload.answers['S1'] = 'Answer under lock';
          return env;
        });
      }).toThrow('LOCK_TIMEOUT');
    } finally {
      releaseLock(tmpDir);
    }

    // Store state remains revision 1
    const current = loadInterviewStore(tmpDir);
    expect(current.state_revision).toBe(1);
    expect(current.payload.answers['S1']).toBeUndefined();

    // Next attempt succeeds
    const updated = transactInterviewStore(tmpDir, 1, (env) => {
      env.payload.answers['S1'] = 'Answer after lock release';
      return env;
    });
    expect(updated.state_revision).toBe(2);
    expect(updated.payload.answers['S1']).toBe('Answer after lock release');
  });

  it('FI-02 — should handle parallel revision conflict: 1 winner, loser receives REVISION_CONFLICT', () => {
    const mutator = (env: InterviewStoreEnvelope) => {
      env.payload.answers['S1'] = 'Answer parallel';
      return env;
    };

    // Winner succeeds
    const win = transactInterviewStore(tmpDir, 1, mutator);
    expect(win.state_revision).toBe(2);

    // Loser with stale expectedRevision = 1 fails
    expect(() => {
      transactInterviewStore(tmpDir, 1, mutator);
    }).toThrow('REVISION_CONFLICT');

    // Canonical store is valid and uncorrupted
    const store = loadInterviewStore(tmpDir);
    expect(store.state_revision).toBe(2);
  });

  it('FI-03 — should fail-safe and preserve canonical store on temp write ENOSPC disk full', () => {
    injectFsFault({
      targetMethod: 'writeFileSync',
      pathSubstring: '.tmp.',
      errorCode: 'ENOSPC',
    });

    expect(() => {
      transactInterviewStore(tmpDir, 1, (env) => {
        env.payload.answers['S1'] = 'Disk full attempt';
        return env;
      });
    }).toThrow('ENOSPC');

    // Lock is released
    expect(existsSync(join(tmpDir, LOCK_REL_PATH))).toBe(false);

    // Canonical store remains intact
    const store = loadInterviewStore(tmpDir);
    expect(store.state_revision).toBe(1);
    expect(store.payload.answers['S1']).toBeUndefined();

    // Restoring disk allows subsequent write to succeed
    restoreFsFaults();
    const store2 = transactInterviewStore(tmpDir, 1, (env) => {
      env.payload.answers['S1'] = 'Recovered after disk fix';
      return env;
    });
    expect(store2.state_revision).toBe(2);
  });

  it('FI-04 — should fail-safe and release lock on rename EACCES failure', () => {
    injectFsFault({
      targetMethod: 'renameSync',
      pathSubstring: '.tmp.',
      errorCode: 'EACCES',
    });

    expect(() => {
      transactInterviewStore(tmpDir, 1, (env) => {
        env.payload.answers['S1'] = 'Rename blocked';
        return env;
      });
    }).toThrow('EACCES');

    // Lock is released
    expect(existsSync(join(tmpDir, LOCK_REL_PATH))).toBe(false);

    // Canonical store remains intact
    const store = loadInterviewStore(tmpDir);
    expect(store.state_revision).toBe(1);
  });

  it('FI-05 — should recover idempotently after hard process kill during commit', () => {
    // Spawn crash worker to crash at temp-write
    try {
      execSync(`node "${CRASH_WORKER}" --workspace="${tmpDir}" --action=commit --crash-at=temp-write`, {
        stdio: 'pipe',
      });
    } catch (err: unknown) {
      expect((err as { status?: number }).status).toBe(137);
    }

    // Process crashed: canonical store remains at revision 1
    const store1 = loadInterviewStore(tmpDir);
    expect(store1.state_revision).toBe(1);
    expect(store1.payload.answers['S1']).toBeUndefined();

    // Re-running commit completes successfully
    const res = transactInterviewStore(tmpDir, 1, (env) => {
      env.payload.answers['S1'] = 'Re-commit after crash';
      return env;
    });
    expect(res.state_revision).toBe(2);

    // Re-running load/recovery again is completely idempotent
    const store2 = loadInterviewStore(tmpDir);
    expect(store2.state_revision).toBe(2);
    expect(store2.payload.answers['S1']).toBe('Re-commit after crash');
  });
});
