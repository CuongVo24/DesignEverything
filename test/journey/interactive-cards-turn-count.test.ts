import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { loadScript } from '../../src/core/loadScript.js';
import { commitStep } from '../../src/core/advanceState.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';
import { resolveQuestionInteraction } from '../../src/core/interactionChoices.js';
import type { Progress, Script } from '../../src/core/schemas/index.js';

const REPO_ROOT = join(__dirname, '../..');
const SCRIPT_PATH = join(REPO_ROOT, 'Design/Content/interview-script/script.yaml');

/**
 * Reuses the exact commit harness from test/journey/newbie-shapes.test.ts
 * (NJ-01..05) — one real capability issue + commitStep per turn, no mocks.
 */
function commitWithCapability(progress: Progress, script: Script, opts: { branchChoice?: string } = {}): Progress {
  if (progress.current_step === null) {
    throw new Error('commitWithCapability: no active current_step to commit');
  }
  const issued = issueTurnCapability(progress.state_revision || 0, {
    sessionId: progress.session_id || 'default-session',
    operationKind: 'interview',
    questionId: progress.current_step,
  });
  const withCap: Progress = { ...progress, pending_turn_capability: issued.capability };
  return commitStep(withCap, script, { capabilityToken: issued.token, branchChoice: opts.branchChoice });
}

/**
 * B22e (P7) — turns the plan's DoD #4 ("số lượt gõ giảm có đo được") into an
 * actual measurement instead of a guess. "One turn" = one successful
 * commitStep call (D54: one real human turn = exactly one commit); this test
 * walks the real canonical web journey through the real state machine (not a
 * hand-typed ID list) so the count can't silently drift from the script.
 *
 * "Keyboard-typed" vs "card-assisted" is read from resolveQuestionInteraction
 * (kind === 'free_text' means Core offers no options/option_hints for that
 * question, so an AskUserQuestion card has nothing to render — the user must
 * type their own answer prose).
 */
describe('B22e — interactive cards turn-count measurement (canonical web journey)', () => {
  const script = loadScript(SCRIPT_PATH);

  function walkCanonicalWebJourney(): string[] {
    let progress: Progress = {
      version: '4.0.0',
      session_id: 'sess-turn-count',
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
    const visited: string[] = [];
    while (progress.current_step !== null) {
      const stepId = progress.current_step;
      visited.push(stepId);
      progress = commitWithCapability(progress, script, { branchChoice: stepId === 'S7' ? 'web' : undefined });
    }
    return visited;
  }

  it('walks exactly the 16-question canonical journey (CAL0, S0-S7, R1, S8, W1-W5), one commit each', () => {
    const visited = walkCanonicalWebJourney();
    expect(visited).toEqual([
      'CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8', 'W1', 'W2', 'W3', 'W4', 'W5',
    ]);
    expect(visited).toHaveLength(16);
  });

  it('classifies exactly 5 free-text questions and 11 card-assisted questions in the canonical journey', () => {
    const visited = walkCanonicalWebJourney();
    const freeText = visited.filter((id) => resolveQuestionInteraction(script.questions.find((q) => q.id === id)!).kind === 'free_text');
    const assisted = visited.filter((id) => resolveQuestionInteraction(script.questions.find((q) => q.id === id)!).kind !== 'free_text');

    expect(freeText.sort()).toEqual(['R1', 'S0', 'S6', 'S8', 'W5']);
    expect(assisted.sort()).toEqual(['CAL0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S7', 'W1', 'W2', 'W3', 'W4']);
  });

  it('measures the keyboard-typed message reduction: baseline 32 (2 typed messages/question) vs 5 after 8.1', () => {
    // Baseline (pre-8.1, from InteractiveQuestionCardsPlan.md §1): every
    // question needed 2 typed messages — one to answer, one to confirm the
    // translate-back ("Tổng ≈ 32 tin nhắn văn xuôi tự soạn").
    const visited = walkCanonicalWebJourney();
    const BASELINE_TYPED_MESSAGES_PER_QUESTION = 2;
    const baseline = visited.length * BASELINE_TYPED_MESSAGES_PER_QUESTION;
    expect(baseline).toBe(32);

    // Post-8.1: the confirmation step is always a 3-choice card (Đúng rồi /
    // Sửa lại / Giải thích thêm) regardless of question type (SKILL.md, P5)
    // — so it never requires typing anymore. Only a free_text question's
    // ANSWER still requires composing prose; a card-assisted question's
    // answer is a card selection unless the user opts into Other (excluded
    // here — this measures the non-Other, non-timeout canonical path per
    // the plan's own stated scope).
    const typedAfter = visited.filter(
      (id) => resolveQuestionInteraction(script.questions.find((q) => q.id === id)!).kind === 'free_text'
    ).length;
    expect(typedAfter).toBe(5);

    const reductionPct = Math.round((1 - typedAfter / baseline) * 100);
    expect(reductionPct).toBe(84);
  });
});
