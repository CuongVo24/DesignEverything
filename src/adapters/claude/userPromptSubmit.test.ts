import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onUserPromptSubmit } from './userPromptSubmit.js';
import {
  commitStep,
  loadScript,
  loadInterviewStore,
  initializeInterviewStore,
  transactInterviewStore,
  type Progress,
} from '../../core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');
const testWorkspaceRoot = join(__dirname, '../../../test/fixtures/progress/user-prompt-submit-workspace');
const canonicalPath = join(testWorkspaceRoot, '.design-everything/interview-state.json');

// Seeds the canonical store directly (bypassing the normal commit flow) so
// each test can set up an arbitrary progress snapshot, mirroring what the
// old fixtures did by hand-writing progress.json before the P2.2a cutover.
function seedCanonicalProgress(overrides: Partial<Progress>): Progress {
  const base = initializeInterviewStore(testWorkspaceRoot).payload.progress;
  const seeded = transactInterviewStore(testWorkspaceRoot, 0, (env) => ({
    ...env,
    payload: {
      ...env.payload,
      progress: { ...base, ...overrides },
    },
  }));
  return seeded.payload.progress;
}

function currentCanonicalProgress(): Progress {
  return loadInterviewStore(testWorkspaceRoot).payload.progress;
}

describe('onUserPromptSubmit hook', () => {
  beforeEach(() => {
    // 1. Recreate clean workspace directory
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }

    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });

    // 2. Copy script and policy files
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/script.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml')
    );
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/gate-policy.yaml')
    );
  });

  afterEach(() => {
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
  });

  test('should allow turn, stamp answered_len_at_last_turn, and inject S3 question details when current_step is S3', () => {
    seedCanonicalProgress({
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      last_user_turn_id: 'turn-2',
      answered_len_at_last_turn: 2,
    });

    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-3' });

    expect(result.decision).toBe('allow');
    expect(result.injectedContext).toBeDefined();
    expect(result.injectedContext).toContain('ID câu hỏi: S3');
    expect(result.injectedContext).toContain('Cứ kể lộn xộn những việc bạn muốn người dùng làm được');
    expect(result.injectedContext).toContain('Must / Should / Could / Won\'t');
    expect(result.injectedContext).toContain('4 Quy tắc vàng của phỏng vấn');

    // Verify canonical store is updated: answered_len_at_last_turn is
    // stamped to answered.length (3)
    const updatedProgress = currentCanonicalProgress();
    expect(updatedProgress.answered_len_at_last_turn).toBe(3);
    // answered should NOT change
    expect(updatedProgress.answered).toEqual(['S0', 'S1', 'S2']);
  });

  test('should issue a capability token that commitStep accepts end-to-end (B1a)', () => {
    seedCanonicalProgress({
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      last_user_turn_id: null,
      answered_len_at_last_turn: 2,
    });

    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot });
    expect(result.decision).toBe('allow');
    expect(result.capabilityToken).toBeTruthy();
    expect(result.injectedContext).toContain(result.capabilityToken!);

    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));
    const progress = currentCanonicalProgress();
    const committed = commitStep(progress, script, { capabilityToken: result.capabilityToken! });
    expect(committed.answered).toContain('S3');

    // The token is single-use: reusing it must fail.
    expect(() => commitStep(committed, script, { capabilityToken: result.capabilityToken! })).toThrow(
      /TURN_CAPABILITY_REPLAY/
    );
  });

  test('should block turn when rate limit is violated (answered length grew by 2 without stamping)', () => {
    seedCanonicalProgress({
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      last_user_turn_id: 'turn-2',
      answered_len_at_last_turn: 1, // answered length (3) - answered_len_at_last_turn (1) = 2 > 1 (violation)
    });

    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-3' });

    expect(result.decision).toBe('block');
    expect(result.message).toContain('Rate limit violation');

    // Verify canonical store was NOT modified
    const progress = currentCanonicalProgress();
    expect(progress.answered_len_at_last_turn).toBe(1);
  });

  test('should allow turn but not inject context when current_step is null (interview complete)', () => {
    seedCanonicalProgress({
      phase: 'ready-to-build',
      branch: 'web',
      current_step: null,
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'W1', 'W2', 'W3', 'W4', 'W5'],
      emitted_docs: [
        '00-vision.md',
        '01-personas.md',
        '02-scope.md',
        '03-data-model.md',
        '04-flows.md',
        '05-architecture.md',
        '06-constraints.md',
        '07-deployment.md',
      ],
      gates_passed: ['scope-locked'],
      last_user_turn_id: 'turn-web-5',
      answered_len_at_last_turn: 12,
    });

    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-web-6' });

    expect(result.decision).toBe('allow');
    expect(result.injectedContext).toBeUndefined();
  });

  test('should block when canonical interview store is missing or corrupt', () => {
    // Uninvolved workspace: no canonical store, no legacy files.
    const resultMissing = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-1' });
    expect(resultMissing.decision).toBe('block');
    expect(resultMissing.message).toMatch(/STORE_MISSING/);

    // Corrupt canonical store.
    initializeInterviewStore(testWorkspaceRoot);
    writeFileSync(canonicalPath, '{ not valid json at all');
    const resultCorrupt = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-1' });
    expect(resultCorrupt.decision).toBe('block');
    expect(resultCorrupt.message).toMatch(/CANONICAL_CORRUPT/);
  });
});
