import { expect, test, describe } from 'vitest';
import { commitStep, checkRate, stampTurn } from './advanceState.js';
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

/** Issues a real capability for progress.current_step, mirroring what UserPromptSubmit does. */
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

/** Issues a capability for the current step and commits it in one call. */
function commit(progress: Progress, opts: { branchChoice?: string; calibrateChoice?: string } = {}): Progress {
  const { progress: withCap, token } = issueFor(progress);
  return commitStep(withCap, script, {
    capabilityToken: token,
    branchChoice: opts.branchChoice,
    calibrateChoice: opts.calibrateChoice,
  });
}

describe('advanceState engine', () => {
  test('should go CAL0 -> S0 -> S1 -> ... -> S7 correctly', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    for (let i = 0; i < steps.length; i++) {
      expect(progress.current_step).toBe(steps[i]);
      progress = commit(progress);
    }
    expect(progress.current_step).toBe('S7');
  });

  test('should default calibrate_mode to fast at CAL0 when --calibrate is omitted, and honor an explicit deep/fast choice', () => {
    const progressDefault = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progressDefault.current_step = 'CAL0';
    const afterDefault = commit(progressDefault);
    expect(afterDefault.calibrate_mode).toBe('fast');

    const progressDeep = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progressDeep.current_step = 'CAL0';
    const afterDeep = commit(progressDeep, { calibrateChoice: 'deep' });
    expect(afterDeep.calibrate_mode).toBe('deep');

    const progressInvalid = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progressInvalid.current_step = 'CAL0';
    const { progress: withCap, token } = issueFor(progressInvalid);
    expect(() =>
      commitStep(withCap, script, { capabilityToken: token, calibrateChoice: 'medium' })
    ).toThrow(/Invalid calibrate choice: medium/);
  });

  test('should require branchChoice when committing S7 and enforce immutability of branch', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';
    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    for (let i = 0; i < steps.length; i++) {
      progress = commit(progress);
    }

    // Try committing S7 without branchChoice -> should throw
    {
      const { progress: withCap, token } = issueFor(progress);
      expect(() => commitStep(withCap, script, { capabilityToken: token })).toThrow(
        /branchChoice must be provided when committing step S7/
      );
    }

    // Commit S7 with web branch
    const progressWeb = commit(progress, { branchChoice: 'web' });
    expect(progressWeb.branch).toBe('web');
    expect(progressWeb.current_step).toBe('R1');
    // R1 (rủi ro) rồi S8 (yêu cầu phi chức năng) đều là câu lõi, chạy trước khi rẽ nhánh.
    const progressWebR1 = commit(progressWeb);
    expect(progressWebR1.current_step).toBe('S8');
    const progressWebS8 = commit(progressWebR1);
    expect(progressWebS8.current_step).toBe('W1');

    // Try changing branch -> should throw
    {
      const { progress: withCap, token } = issueFor(progressWebS8);
      expect(() => commitStep(withCap, script, { capabilityToken: token, branchChoice: 'mobile' })).toThrow(
        /Cannot change branch once set/
      );
    }

    // Commit S7 with mobile branch
    const progressMobile = commit(progress, { branchChoice: 'mobile' });
    expect(progressMobile.branch).toBe('mobile');
    expect(progressMobile.current_step).toBe('R1');
    const progressMobileR1 = commit(progressMobile);
    expect(progressMobileR1.current_step).toBe('S8');
    const progressMobileS8 = commit(progressMobileR1);
    expect(progressMobileS8.current_step).toBe('M1');
  });

  test('should reject commit without a capability token', () => {
    const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    expect(() => commitStep(progress, script, { capabilityToken: '' })).toThrow(
      /TURN_CAPABILITY_MISSING/
    );
  });

  test('should reject replay of an already-consumed capability token', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    const { progress: withCap, token } = issueFor(progress);
    progress = commitStep(withCap, script, { capabilityToken: token });

    // Re-using the same (now-consumed) token for a second commit must fail —
    // this is the exact replay/duplicate-commit case the legacy userTurnId
    // fallback used to under-protect (X01/R01).
    expect(() => commitStep(progress, script, { capabilityToken: token })).toThrow(
      /TURN_CAPABILITY_REPLAY|TURN_CAPABILITY_WRONG_QUESTION/
    );
  });

  test('should reject a forged capability token', () => {
    const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    const { progress: withCap } = issueFor(progress);
    expect(() => commitStep(withCap, script, { capabilityToken: 'forged-token-xyz' })).toThrow(
      /TURN_CAPABILITY_FORGED/
    );
  });

  test('checkRate should validate answered length increment per turn', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    // Initial length of answered is 0, answered_len_at_last_turn is 0

    // Grew by 0 or 1 -> ok
    expect(checkRate(progress, 0).ok).toBe(true);
    expect(checkRate(progress, 1).ok).toBe(true);
    // Grew by 2 -> fail
    expect(checkRate(progress, 2).ok).toBe(false);

    // Advance and stamp
    progress = commit(progress);
    progress = stampTurn(progress, progress.answered.length);
    expect(progress.answered_len_at_last_turn).toBe(1);

    // Grew to 1 or 2 -> ok
    expect(checkRate(progress, 1).ok).toBe(true);
    expect(checkRate(progress, 2).ok).toBe(true);
    // Grew to 3 -> fail
    expect(checkRate(progress, 3).ok).toBe(false);
  });

  test('completing a real interview reaches ready-for-validation directly (H7); docs-emitted only fires if a declared gate was never satisfied', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    // CAL0 -> S6 (S3 commits along the way, recording gate 'scope-locked' — H6)
    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    for (let i = 0; i < steps.length; i++) {
      progress = commit(progress);
    }
    // S7 -> Web branch
    progress = commit(progress, { branchChoice: 'web' });
    // R1 (rủi ro) và S8 (yêu cầu phi chức năng) — câu lõi cuối trước khi rẽ nhánh
    progress = commit(progress);
    progress = commit(progress);

    // W1 -> W4
    for (let i = 1; i <= 4; i++) {
      progress = commit(progress);
    }

    // H7 — a real interview, driven purely through commitStep with nothing
    // hand-seeded, reaches 'ready-for-validation' the moment the last
    // question (W5) is committed: gates_passed already has 'scope-locked'
    // from S3, and doc coverage is judged against `answered` (guaranteed
    // complete once current_step goes null), not the still-empty
    // `emitted_docs` (which only `emit` itself populates, later).
    const progressReady = commit(progress);
    expect(progressReady.current_step).toBeNull();
    expect(progressReady.phase).toBe('ready-for-validation');

    // 'docs-emitted' is not dead: it still fires if a branch's declared gate
    // was somehow never recorded (e.g. a corrupted/hand-edited store) —
    // simulated here since a real commit sequence can no longer produce it.
    const progressMissingGate = { ...progress, gates_passed: [] };
    const afterMissingGate = commit(progressMissingGate);
    expect(afterMissingGate.current_step).toBeNull();
    expect(afterMissingGate.phase).toBe('docs-emitted');
  });

  // H6 (v8-hotfix) — regression for a real, pre-existing bug found while
  // manually walking the CLI branch end-to-end through the real hook/CLI
  // process boundary: `gates_passed` was NEVER appended to anywhere in the
  // commit pipeline, so a branch's declared gate (S3's `scope-locked`,
  // required by every branch) could never be satisfied and `emit` (which
  // requires phase === 'ready-for-validation') was permanently unreachable
  // through the documented commit flow — only a hand-seeded fixture (like
  // `progressReady` above) ever exercised that phase. This test proves the
  // fix through commitStep's own real code path, not a manual seed: it
  // commits an entire real 'cli' branch journey (no test setting
  // `gates_passed` by hand anywhere) and checks that S3's commit alone
  // already recorded the gate, and that emitted_docs is the only remaining
  // gap after the interview.
  test('committing S3 (which declares gate: scope-locked) records it in gates_passed via the real commit flow, no manual seeding', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    for (const stepId of ['CAL0', 'S0', 'S1', 'S2']) {
      expect(progress.current_step).toBe(stepId);
      progress = commit(progress);
    }
    expect(progress.current_step).toBe('S3');
    expect(progress.gates_passed).toEqual([]);

    progress = commit(progress); // commits S3
    expect(progress.gates_passed).toEqual(['scope-locked']);

    // Committing it twice more (S4, S5) must not duplicate the gate entry.
    progress = commit(progress);
    progress = commit(progress);
    expect(progress.gates_passed).toEqual(['scope-locked']);
  });

  test('a full real cli-branch commit sequence reaches ready-for-validation with nothing hand-seeded (H6+H7, the exact deadlock found manually walking the real CLI)', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    for (const stepId of ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
      progress = commit(progress);
    }
    progress = commit(progress, { branchChoice: 'cli' }); // S7
    for (const stepId of ['R1', 'S8', 'C1', 'C2', 'C3', 'C4']) {
      progress = commit(progress);
    }
    expect(progress.current_step).toBe('C5');
    // Real commit flow, no hand-seeding anywhere above — S3's gate already
    // landed in gates_passed on its own (H6).
    expect(progress.gates_passed).toEqual(['scope-locked']);
    expect(progress.emitted_docs).toEqual([]); // emit genuinely hasn't run

    // H7 — committing the last question (C5) reaches 'ready-for-validation'
    // directly. Before this fix, this always landed on 'docs-emitted'
    // instead — because emitted_docs (checked at this exact point) can
    // never be non-empty until AFTER `emit` runs, and `emit` itself refuses
    // to run unless phase is already 'ready-for-validation' (emit.ts). That
    // closed loop is exactly what made a real `/design-everything`
    // interview unable to ever reach `emit` in production.
    const afterFinalCommit = commit(progress);
    expect(afterFinalCommit.current_step).toBeNull();
    expect(afterFinalCommit.phase).toBe('ready-for-validation');
  });

  test('should support hybrid branch flow committing S7 and routing all core, web, and mobile questions', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    for (let i = 0; i < steps.length; i++) {
      progress = commit(progress);
    }

    // Commit S7 with hybrid branch
    progress = commit(progress, { branchChoice: 'hybrid' });
    expect(progress.branch).toBe('hybrid');
    expect(progress.current_step).toBe('R1');
    progress = commit(progress);
    expect(progress.current_step).toBe('S8');
    progress = commit(progress);

    // The next questions must include both Web and Mobile questions.
    const expectedQuestions = [
      'W1', 'W2', 'W3', 'W4', 'W5',
      'M1', 'M2', 'M3', 'M4', 'M5'
    ];

    for (const qId of expectedQuestions) {
      expect(progress.current_step).toBe(qId);
      progress = commit(progress);
    }

    expect(progress.current_step).toBeNull();
  });

  test('should ensure purity by not mutating original progress state', () => {
    const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    const originalAnsweredLength = progress.answered.length;
    const { progress: withCap, token } = issueFor(progress);

    const nextProgress = commitStep(withCap, script, { capabilityToken: token });

    expect(progress.answered.length).toBe(originalAnsweredLength);
    expect(nextProgress.answered.length).toBe(originalAnsweredLength + 1);
    expect(nextProgress.pending_turn_capability?.status).toBe('consumed');
  });
});
