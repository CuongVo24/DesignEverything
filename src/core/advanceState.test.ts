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

  test('should transition phase to docs-emitted or ready-for-validation upon completing interview', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress.current_step = 'CAL0';

    // CAL0 -> S6
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

    // Clone progress to test docs-emitted (default) and ready-for-validation.
    const progressDocsEmitted = commit(progress);
    expect(progressDocsEmitted.current_step).toBeNull();
    expect(progressDocsEmitted.phase).toBe('docs-emitted');

    // Setup for ready-for-validation.
    let progressReady = { ...progress };
    const webQuestions = script.questions.filter((q) => q.branch === 'core' || q.branch === 'web');
    progressReady.emitted_docs = webQuestions
      .filter((q) => q.target_doc !== null)
      .map((q) => q.target_doc as string);
    progressReady.gates_passed = ['scope-locked'];

    progressReady = commit(progressReady);
    expect(progressReady.current_step).toBeNull();
    expect(progressReady.phase).toBe('ready-for-validation');
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
