import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { loadScript } from '../../src/core/loadScript.js';
import { commitStep } from '../../src/core/advanceState.js';
import { computeBatch } from '../../src/core/computeBatch.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';
import { resolveQuestionInteraction } from '../../src/core/interactionChoices.js';
import type { Progress, Script } from '../../src/core/schemas/index.js';

const REPO_ROOT = join(__dirname, '../..');
const SCRIPT_PATH = join(REPO_ROOT, 'Design/Content/interview-script/script.yaml');

/**
 * B24f (8.2) — this file used to measure "typed messages saved by the
 * translate-back card" (D53/8.1). D59 removed that card entirely (commit
 * happens immediately, translate_back is printed alongside the result, not
 * gated behind a confirmation), so that unit of measurement no longer
 * exists to count. The unit that DOES exist and matters post-D60 is a real
 * turn boundary: one `issuePromptCapability` call, i.e. one Core-computed
 * batch (`computeBatch`). This walks the real canonical journey through the
 * real state machine (`commitStep`, batch-aware token consumption from
 * B24b) — not a hand-typed ID list and not a model of what a turn "should"
 * cost — so the count can't silently drift from the script or from
 * computeBatch's actual behavior.
 */
function freshProgress(sessionId: string): Progress {
  return {
    version: '4.0.0',
    session_id: sessionId,
    state_revision: 0,
    phase: 'interview',
    branch: null,
    calibrate_mode: 'fast',
    current_step: 'CAL0',
    answered: [],
    emitted_docs: [],
    gates_passed: [],
    pending_turn_capability: null,
    last_user_turn_id: null,
    answered_len_at_last_turn: 0,
    updated_at: new Date().toISOString(),
  };
}

/**
 * One real capability token per BATCH (not per question) — mirrors
 * production's `issuePromptCapability` (interviewApplicationServices.ts):
 * it computes the batch once, then every question in that batch is
 * committed by reusing the same token, relying on commitStep's own
 * partial-consumption bookkeeping (B24b) rather than issuing a fresh token
 * per question.
 */
function walkCountingTurns(script: Script, branchChoice: string, sessionId: string): { visited: string[]; batches: string[][]; turnCount: number } {
  let progress = freshProgress(sessionId);
  const visited: string[] = [];
  const batches: string[][] = [];
  let turnCount = 0;

  while (progress.current_step !== null) {
    turnCount++;
    const batch = computeBatch(progress, script);
    batches.push(batch);

    const issued = issueTurnCapability(progress.state_revision || 0, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: batch[0],
    });
    progress = { ...progress, pending_turn_capability: { ...issued.capability, question_ids: batch } };

    for (const qid of batch) {
      visited.push(qid);
      progress = commitStep(progress, script, {
        capabilityToken: issued.token,
        branchChoice: qid === 'S7' ? branchChoice : undefined,
      });
    }
  }

  return { visited, batches, turnCount };
}

describe('B24f — turn-count measurement (real batch-aware state machine, canonical web + cli journeys)', () => {
  const script = loadScript(SCRIPT_PATH);

  it('walks exactly the 16-question canonical web journey (CAL0, S0-S7, R1, S8, W1-W5), unchanged by batching', () => {
    const { visited } = walkCountingTurns(script, 'web', 'sess-turn-count-web');
    expect(visited).toEqual([
      'CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8', 'W1', 'W2', 'W3', 'W4', 'W5',
    ]);
    expect(visited).toHaveLength(16);
  });

  it('classifies exactly 5 free-text questions and 11 card-assisted questions in the canonical web journey', () => {
    const { visited } = walkCountingTurns(script, 'web', 'sess-classify-web');
    const freeText = visited.filter((id) => resolveQuestionInteraction(script.questions.find((q) => q.id === id)!).kind === 'free_text');
    const assisted = visited.filter((id) => resolveQuestionInteraction(script.questions.find((q) => q.id === id)!).kind !== 'free_text');

    expect(freeText.sort()).toEqual(['R1', 'S0', 'S6', 'S8', 'W5']);
    expect(assisted.sort()).toEqual(['CAL0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S7', 'W1', 'W2', 'W3', 'W4']);
  });

  it('D60 batches the web journey into exactly the projected 10 turns', () => {
    const { batches, turnCount } = walkCountingTurns(script, 'web', 'sess-batches-web');
    expect(batches).toEqual([
      ['CAL0', 'S0'],
      ['S1'],
      ['S2'],
      ['S3'],
      ['S4'],
      ['S5'],
      ['S6', 'S7'],
      ['R1', 'S8'],
      ['W1', 'W2', 'W3', 'W4'],
      ['W5'],
    ]);
    expect(turnCount).toBe(10);
  });

  it('D60 batches the cli journey into exactly the projected 10 turns (same shape as web: core batches identical, branch batch differs)', () => {
    const { visited, batches, turnCount } = walkCountingTurns(script, 'cli', 'sess-batches-cli');
    expect(visited).toHaveLength(16);
    expect(batches).toEqual([
      ['CAL0', 'S0'],
      ['S1'],
      ['S2'],
      ['S3'],
      ['S4'],
      ['S5'],
      ['S6', 'S7'],
      ['R1', 'S8'],
      ['C1', 'C2', 'C3', 'C4'],
      ['C5'],
    ]);
    expect(turnCount).toBe(10);
  });

  it('measures the real turn reduction from D60 batching: 16 single-question turns (pre-8.2) vs 10 batched turns (post-8.2)', () => {
    // Pre-8.2 baseline: one turn = one commit (D54, unchanged in count by
    // D60 — commit count is still 16). Post-8.2: one turn = one
    // Core-computed batch (D60), measured directly via issueTurnCapability
    // call count above, not modeled.
    const { visited, turnCount } = walkCountingTurns(script, 'web', 'sess-reduction-web');
    const PRE_8_2_TURNS = visited.length;
    expect(PRE_8_2_TURNS).toBe(16);
    expect(turnCount).toBe(10);

    const reductionPct = Math.round((1 - turnCount / PRE_8_2_TURNS) * 100);
    expect(reductionPct).toBe(38);
  });
});
