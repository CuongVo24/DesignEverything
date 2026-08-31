import { expect, test, describe } from 'vitest';
import { computeBatch } from './computeBatch.js';
import { commitStep } from './advanceState.js';
import { issueTurnCapability, verifyTurnCapability } from './turnCapability.js';
import { loadScript } from './loadScript.js';
import { loadProgress } from './loadProgress.js';
import type { Progress } from './schemas/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const script = loadScript(scriptPath);

/** Commits a single step (mirrors what a real turn does), using computeBatch's
 * own output for the token so the two stay in lockstep the way
 * issuePromptCapability does in production. */
function commitOne(progress: Progress, opts: { branchChoice?: string; calibrateChoice?: string } = {}): Progress {
  const batch = computeBatch(progress, script);
  const issued = issueTurnCapability(progress.state_revision || 0, {
    sessionId: progress.session_id || 'default-session',
    operationKind: 'interview',
    questionId: batch[0],
  });
  const capability = { ...issued.capability, question_ids: batch };
  const withCap = { ...progress, pending_turn_capability: capability };
  return commitStep(withCap, script, {
    capabilityToken: issued.token,
    branchChoice: opts.branchChoice,
    calibrateChoice: opts.calibrateChoice,
  });
}

function freshProgress(): Progress {
  const progress = loadProgress(join(__dirname, '../../test/fixtures/progress/init-s0.json'));
  progress.current_step = 'CAL0';
  progress.answered = [];
  return progress;
}

describe('B24b (D60) — computeBatch matches the projected batching in InterviewCadencePlan.md', () => {
  test('CAL0 batches with S0 (neither has option_hints/critic, same core branch)', () => {
    const progress = freshProgress();
    expect(computeBatch(progress, script)).toEqual(['CAL0', 'S0']);
  });

  test('S1..S5 (option_hints) each go alone', () => {
    for (const qid of ['S1', 'S2', 'S4', 'S5']) {
      const progress = freshProgress();
      progress.current_step = qid;
      expect(computeBatch(progress, script)).toEqual([qid]);
    }
  });

  test('S3 (has a critic) goes alone even though it has no option_hints', () => {
    const progress = freshProgress();
    progress.current_step = 'S3';
    expect(computeBatch(progress, script)).toEqual(['S3']);
  });

  test('S6 batches with S7, and S7 caps the batch (nothing appended after it)', () => {
    const progress = freshProgress();
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
    progress.current_step = 'S6';
    expect(computeBatch(progress, script)).toEqual(['S6', 'S7']);
  });

  test('S7 alone as head still caps at just S7 (branch unknown until it commits)', () => {
    const progress = freshProgress();
    progress.current_step = 'S7';
    expect(computeBatch(progress, script)).toEqual(['S7']);
  });

  test('R1 batches with S8 (post-S7, still core branch), stops before crossing into web', () => {
    const progress = freshProgress();
    progress.branch = 'web';
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    progress.current_step = 'R1';
    expect(computeBatch(progress, script)).toEqual(['R1', 'S8']);
  });

  test('W1 batches up to the hard cap of 4 (W1, W2, W3, W4), stopping before W5', () => {
    const progress = freshProgress();
    progress.branch = 'web';
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8'];
    progress.current_step = 'W1';
    expect(computeBatch(progress, script)).toEqual(['W1', 'W2', 'W3', 'W4']);
  });

  test('W5 (has a critic) goes alone', () => {
    const progress = freshProgress();
    progress.branch = 'web';
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8', 'W1', 'W2', 'W3', 'W4'];
    progress.current_step = 'W5';
    expect(computeBatch(progress, script)).toEqual(['W5']);
  });

  test('C1 batches up to the hard cap of 4 (C1, C2, C3, C4), stopping before C5', () => {
    const progress = freshProgress();
    progress.branch = 'cli';
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8'];
    progress.current_step = 'C1';
    expect(computeBatch(progress, script)).toEqual(['C1', 'C2', 'C3', 'C4']);
  });

  test('current_step null returns an empty batch', () => {
    const progress = freshProgress();
    progress.current_step = null;
    expect(computeBatch(progress, script)).toEqual([]);
  });
});

describe('B24b (D60) — a batch token authorizes exactly its questions, in a real commit walk', () => {
  test('CAL0+S0 batch: one token commits both, in the order the batch names, with the state machine\'s own revision bumps', () => {
    let progress = freshProgress();
    expect(computeBatch(progress, script)).toEqual(['CAL0', 'S0']);
    progress = commitOne(progress, { calibrateChoice: 'fast' });
    expect(progress.current_step).toBe('S0');
    // Still mid-batch: the record must not be fully consumed yet.
    expect(progress.pending_turn_capability?.status).toBe('active');
    expect(progress.pending_turn_capability?.consumed_question_ids).toEqual(['CAL0']);

    // Commit S0 reusing the SAME token (still current_step === 'S0', batch
    // covers it) — this is the point of D60: no fresh UserPromptSubmit
    // turn was needed between CAL0 and S0.
    const batch = progress.pending_turn_capability!.question_ids!;
    expect(batch).toEqual(['CAL0', 'S0']);
  });

  test('a batch token cannot be replayed against a question already consumed within it', () => {
    let progress = freshProgress();
    const batch = computeBatch(progress, script);
    expect(batch).toEqual(['CAL0', 'S0']);
    const issued = issueTurnCapability(progress.state_revision || 0, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: batch[0],
    });
    const capability = { ...issued.capability, question_ids: batch };
    progress = { ...progress, pending_turn_capability: capability };

    progress = commitStep(progress, script, { capabilityToken: issued.token, calibrateChoice: 'fast' });
    expect(progress.current_step).toBe('S0');
    expect(progress.pending_turn_capability?.consumed_question_ids).toEqual(['CAL0']);

    // Re-verify the SAME token against CAL0 (now consumed within this
    // batch) — must be rejected as replay even though the record's overall
    // status is still 'active' (S0 hasn't been consumed yet).
    const replay = verifyTurnCapability(progress.pending_turn_capability, issued.token, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: 'CAL0',
      currentRevision: progress.state_revision || 0,
    });
    expect(replay.valid).toBe(false);
    expect(replay.reason_code).toBe('TURN_CAPABILITY_REPLAY');

    // The SAME token against S0 (the still-unconsumed second half of the
    // batch) must still verify — this is the whole point of D60.
    const stillGood = verifyTurnCapability(progress.pending_turn_capability, issued.token, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: 'S0',
      currentRevision: progress.state_revision || 0,
    });
    expect(stillGood.valid).toBe(true);
  });
});
