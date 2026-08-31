import { expect, test, describe } from 'vitest';
import { commitStep } from './advanceState.js';
import { undoStep } from './undoStep.js';
import { issueTurnCapability } from './turnCapability.js';
import { loadScript } from './loadScript.js';
import { loadProgress } from './loadProgress.js';
import type { Progress } from './schemas/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const script = loadScript(scriptPath);

function issueFor(progress: Progress): { progress: Progress; token: string } {
  if (progress.current_step === null) {
    throw new Error('issueFor: no active current_step to issue a capability for');
  }
  const issued = issueTurnCapability(progress.state_revision || 0, {
    sessionId: progress.session_id || 'default-session',
    operationKind: 'interview',
    questionId: progress.current_step,
  });
  return { progress: { ...progress, pending_turn_capability: issued.capability }, token: issued.token };
}

function commit(progress: Progress, opts: { branchChoice?: string; calibrateChoice?: string } = {}): Progress {
  const { progress: withCap, token } = issueFor(progress);
  return commitStep(withCap, script, {
    capabilityToken: token,
    branchChoice: opts.branchChoice,
    calibrateChoice: opts.calibrateChoice,
  });
}

describe('B24a — undoStep (pure engine)', () => {
  test('undoing the first commit (CAL0) restores current_step to CAL0, clears calibrate_mode, revokes the capability', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    progress = commit(progress, { calibrateChoice: 'fast' });
    expect(progress.current_step).toBe('S0');
    expect(progress.calibrate_mode).toBe('fast');
    expect(progress.answered).toEqual(['CAL0']);

    const undone = undoStep(progress, script);
    expect(undone.current_step).toBe('CAL0');
    expect(undone.calibrate_mode).toBeNull();
    expect(undone.answered).toEqual([]);
    expect(undone.pending_turn_capability).toBeNull();
    expect(undone.answered_len_at_last_turn).toBe(0);
    expect(undone.state_revision).toBe(progress.state_revision + 1);
  });

  test('undoing S3 (declares gate: scope-locked) removes the gate from gates_passed', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    for (const stepId of ['CAL0', 'S0', 'S1', 'S2']) {
      expect(progress.current_step).toBe(stepId);
      progress = commit(progress);
    }
    expect(progress.current_step).toBe('S3');
    progress = commit(progress); // commits S3
    expect(progress.gates_passed).toEqual(['scope-locked']);

    const undone = undoStep(progress, script);
    expect(undone.current_step).toBe('S3');
    expect(undone.gates_passed).toEqual([]);
    expect(undone.answered).not.toContain('S3');
  });

  test('undoing S7 clears branch, allowing a genuinely different re-decision', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    for (const stepId of ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
      expect(progress.current_step).toBe(stepId);
      progress = commit(progress);
    }
    expect(progress.current_step).toBe('S7');
    progress = commit(progress, { branchChoice: 'web' });
    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('R1');

    const undone = undoStep(progress, script);
    expect(undone.current_step).toBe('S7');
    expect(undone.branch).toBeNull();

    // Re-committing S7 with a DIFFERENT branch must now succeed — proving
    // undo genuinely reopened the one-way choice, not just cosmetically.
    const recommitted = commit(undone, { branchChoice: 'cli' });
    expect(recommitted.branch).toBe('cli');
  });

  test('undo denies with UNDO_DENIED_NOTHING_ANSWERED when nothing has been answered yet', () => {
    const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    progress.answered = [];
    expect(() => undoStep(progress, script)).toThrow(/UNDO_DENIED_NOTHING_ANSWERED/);
  });

  test('undo denies with UNDO_DENIED_AFTER_EMIT once phase has advanced past interview', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    progress = commit(progress);
    progress = { ...progress, phase: 'docs-emitted' };
    expect(() => undoStep(progress, script)).toThrow(/UNDO_DENIED_AFTER_EMIT/);
  });
});
