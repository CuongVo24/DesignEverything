import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadInterviewStore,
  transactInterviewStore,
  initializeInterviewStore,
  CANONICAL_STORE_REL_PATH,
} from './interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';
import {
  ensureCanonicalStore,
  issuePromptCapability,
  commitInterviewAnswer,
} from './interviewApplicationServices.js';

// P2.2a §5.1 — pins the canonical interview store authority semantics that
// every production consumer (CLI, hooks, health) must observe. Written
// against plan-v1-bonus-tasks.md Section 5.1's exact scenario list.
describe('P2.2a — canonical interview store authority', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-canon-auth-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(tempDir, { recursive: true });
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  function writeLegacyProgress(overrides: Record<string, unknown> = {}) {
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify(
        {
          version: '0.1.0',
          phase: 'interview',
          branch: 'web',
          session_id: 'legacy-session',
          state_revision: 0,
          current_step: 'S3',
          answered: ['S0', 'S1', 'S2'],
          emitted_docs: [],
          gates_passed: [],
          last_user_turn_id: null,
          answered_len_at_last_turn: 3,
          updated_at: new Date().toISOString(),
          calibrate_mode: 'deep',
          ...overrides,
        },
        null,
        2
      )
    );
  }

  test('canonical and legacy progress.json disagree — every production consumer follows canonical only', () => {
    initializeInterviewStore(tempDir);
    // Legacy file disagrees with canonical (different branch/step entirely).
    // If any consumer fell back to this, it would see 'mobile'/'S9' instead
    // of the canonical 'CAL0' truth.
    writeLegacyProgress({ branch: 'mobile', current_step: 'S9' });

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.current_step).toBe('CAL0');
    expect(envelope.payload.progress.branch).toBeNull();

    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(true);
    if (capRes.ok) {
      expect(capRes.progress.current_step).toBe('CAL0');
    }
  });

  test('corrupt canonical + valid legacy fails closed — no fallback to legacy', () => {
    initializeInterviewStore(tempDir);
    writeLegacyProgress();

    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    writeFileSync(canonicalPath, '{ not valid json');

    expect(() => loadInterviewStore(tempDir)).toThrow(/CANONICAL_CORRUPT/);

    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(false);
    if (!capRes.ok) {
      expect(capRes.reason_code).toBe('STORE_CORRUPT');
    }

    const commitRes = commitInterviewAnswer(tempDir, { capabilityToken: 'whatever' });
    expect(commitRes.ok).toBe(false);
    if (!commitRes.ok) {
      expect(commitRes.reason_code).toBe('STORE_CORRUPT');
    }
  });

  test('valid canonical + corrupt legacy still works and never touches legacy', () => {
    initializeInterviewStore(tempDir);
    // Legacy file present but unparsable garbage.
    writeFileSync(join(tempDir, 'progress.json'), '{ not valid json at all');

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.current_step).toBe('CAL0');

    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(true);
  });

  test('missing canonical + legacy exists runs the migrator exactly once, creates an immutable backup, then uses canonical', () => {
    writeLegacyProgress();
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify({ S0: 'Vision' }));

    const first = migrateInterviewStore(tempDir);
    expect(first).toBe('migrated');
    const backupBase = join(tempDir, '.design-everything/backups');
    expect(existsSync(backupBase)).toBe(true);

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.branch).toBe('web');

    // Second call must be a no-op: 'already-current', no re-migration, no
    // second backup, canonical bytes unchanged.
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    const bytesBefore = readFileSync(canonicalPath, 'utf8');
    const second = migrateInterviewStore(tempDir);
    expect(second).toBe('already-current');
    const bytesAfter = readFileSync(canonicalPath, 'utf8');
    expect(bytesAfter).toBe(bytesBefore);
  });

  test('missing canonical AND missing legacy on an uninvolved workspace only goes through the explicit initializer', () => {
    // Nothing exists. migrateInterviewStore must not fabricate anything.
    const migrateRes = migrateInterviewStore(tempDir);
    expect(migrateRes).toBe('no-legacy');
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);

    // loadInterviewStore must not silently produce a fresh store either.
    expect(() => loadInterviewStore(tempDir)).toThrow(/STORE_MISSING/);

    // Application services must report the same, not synthesize state.
    const capRes = issuePromptCapability(tempDir);
    expect(capRes.ok).toBe(false);
    if (!capRes.ok) {
      expect(capRes.reason_code).toBe('STORE_MISSING');
    }

    // ensureCanonicalStore (used by init/status/repair) reports 'uninvolved',
    // and only the caller invoking initializeInterviewStore explicitly may
    // create state.
    const outcome = ensureCanonicalStore(tempDir);
    expect(outcome.status).toBe('uninvolved');
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);

    initializeInterviewStore(tempDir);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(true);
  });

  test('two writers racing with the same expectedRevision — exactly one succeeds, the loser gets a stable revision-conflict code', () => {
    initializeInterviewStore(tempDir);
    const envelope = loadInterviewStore(tempDir);
    expect(envelope.state_revision).toBe(0);

    const winner = transactInterviewStore(tempDir, 0, (env) => ({
      ...env,
      payload: { ...env.payload, answers: { ...env.payload.answers, S0: 'first writer' } },
    }));
    expect(winner.state_revision).toBe(1);

    let loserError: Error | null = null;
    try {
      transactInterviewStore(tempDir, 0, (env) => ({
        ...env,
        payload: { ...env.payload, answers: { ...env.payload.answers, S0: 'second writer' } },
      }));
    } catch (err: unknown) {
      loserError = err as Error;
    }
    expect(loserError).not.toBeNull();
    expect(loserError!.message).toMatch(/REVISION_CONFLICT/);

    // Winner's write must be the one that survives.
    const final = loadInterviewStore(tempDir);
    expect(final.payload.answers.S0).toBe('first writer');
    expect(final.state_revision).toBe(1);
  });

  test('expectedRevision must be a real, non-negative integer at every public mutation — no null/undefined/negative sentinel bypass', () => {
    initializeInterviewStore(tempDir);

    // @ts-expect-error — intentionally violating the type to prove the
    // runtime guard exists independent of TypeScript's static check (a JS
    // caller, or a caller that got `null` from `foo?.revision`, must not
    // sail through).
    expect(() => transactInterviewStore(tempDir, null, (env) => env)).toThrow(
      /INVALID_EXPECTED_REVISION/
    );
    expect(() => transactInterviewStore(tempDir, -1, (env) => env)).toThrow(
      /INVALID_EXPECTED_REVISION/
    );
    expect(() => transactInterviewStore(tempDir, 1.5, (env) => env)).toThrow(
      /INVALID_EXPECTED_REVISION/
    );
  });
});
