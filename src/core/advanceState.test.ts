import { expect, test, describe } from 'vitest';
import { commitStep, checkRate, stampTurn } from './advanceState.js';
import { loadScript } from './loadScript.js';
import { loadProgress } from './loadProgress.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const script = loadScript(scriptPath);

describe('advanceState engine', () => {
  test('should go S0 -> S1 -> ... -> S6 correctly', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));

    for (let i = 0; i <= 5; i++) {
      expect(progress.current_step).toBe(`S${i}`);
      progress = commitStep(progress, script, { userTurnId: `turn-${i}` });
    }
    expect(progress.current_step).toBe('S6');
  });

  test('should require branchChoice when committing S6 and enforce immutability of branch', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    for (let i = 0; i <= 5; i++) {
      progress = commitStep(progress, script, { userTurnId: `turn-${i}` });
    }

    // Try committing S6 without branchChoice -> should throw
    expect(() => commitStep(progress, script, { userTurnId: 'turn-6' })).toThrow(
      /branchChoice must be provided when committing step S6/
    );

    // Commit S6 with web branch
    const progressWeb = commitStep(progress, script, { userTurnId: 'turn-6', branchChoice: 'web' });
    expect(progressWeb.branch).toBe('web');
    expect(progressWeb.current_step).toBe('W1');

    // Try changing branch -> should throw
    expect(() =>
      commitStep(progressWeb, script, { userTurnId: 'turn-7', branchChoice: 'mobile' })
    ).toThrow(/Cannot change branch once set/);

    // Commit S6 with mobile branch
    const progressMobile = commitStep(progress, script, { userTurnId: 'turn-6', branchChoice: 'mobile' });
    expect(progressMobile.branch).toBe('mobile');
    expect(progressMobile.current_step).toBe('M1');
  });

  test('should throw error on duplicate turn ID commit', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    progress = commitStep(progress, script, { userTurnId: 'turn-0' });

    // Commit again with same turn ID -> should throw
    expect(() => commitStep(progress, script, { userTurnId: 'turn-0' })).toThrow(
      /Duplicate commit: this turn ID has already been committed/
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
    progress = commitStep(progress, script, { userTurnId: 'turn-0' });
    progress = stampTurn(progress, progress.answered.length);
    expect(progress.answered_len_at_last_turn).toBe(1);

    // Grew to 1 or 2 -> ok
    expect(checkRate(progress, 1).ok).toBe(true);
    expect(checkRate(progress, 2).ok).toBe(true);
    // Grew to 3 -> fail
    expect(checkRate(progress, 3).ok).toBe(false);
  });

  test('should transition phase to docs-emitted or ready-to-build upon completing interview', () => {
    let progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));

    // S0 -> S6
    for (let i = 0; i <= 5; i++) {
      progress = commitStep(progress, script, { userTurnId: `turn-${i}` });
    }
    // S6 -> Web branch
    progress = commitStep(progress, script, { userTurnId: 'turn-6', branchChoice: 'web' });

    // W1 -> W4
    for (let i = 1; i <= 4; i++) {
      progress = commitStep(progress, script, { userTurnId: `turn-web-${i}` });
    }

    // Clone progress to test docs-emitted (default) and ready-to-build
    const progressDocsEmitted = commitStep(progress, script, { userTurnId: 'turn-web-5' });
    expect(progressDocsEmitted.current_step).toBeNull();
    expect(progressDocsEmitted.phase).toBe('docs-emitted');

    // Setup for ready-to-build
    let progressReady = { ...progress };
    const webQuestions = script.questions.filter((q) => q.branch === 'core' || q.branch === 'web');
    progressReady.emitted_docs = webQuestions.map((q) => q.target_doc);
    progressReady.gates_passed = ['scope-locked'];

    progressReady = commitStep(progressReady, script, { userTurnId: 'turn-web-5' });
    expect(progressReady.current_step).toBeNull();
    expect(progressReady.phase).toBe('ready-to-build');
  });

  test('should ensure purity by not mutating original progress state', () => {
    const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
    const originalAnsweredLength = progress.answered.length;
    const originalLastTurnId = progress.last_user_turn_id;

    const nextProgress = commitStep(progress, script, { userTurnId: 'turn-0' });

    expect(progress.answered.length).toBe(originalAnsweredLength);
    expect(progress.last_user_turn_id).toBe(originalLastTurnId);
    expect(nextProgress.answered.length).toBe(originalAnsweredLength + 1);
    expect(nextProgress.last_user_turn_id).toBe('turn-0');
  });
});
