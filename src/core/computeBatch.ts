import type { Progress, Script } from './schemas/index.js';
import { selectNextStep } from './advanceState.js';

// B24b (D60) — hard cap on how many questions one turn's capability token
// can cover. Bounds the blast radius of the exemption D60 accepts (a token
// no longer dies after exactly one commit — see DecisionLog.md D60): even
// in the worst case (user stops typing mid-batch, agent keeps committing
// until the TTL expires), at most this many questions can be committed
// without a fresh human turn.
const MAX_BATCH_SIZE = 4;

/**
 * B24b (D60) — Core, not the agent, decides how many consecutive questions
 * one capability token covers. Starting at `progress.current_step`, this
 * walks the same eligibility order `selectNextStep` (advanceState.ts) uses
 * for a single step, and folds in a chosen id into a *virtual* answered set
 * so depends_on-gated questions further down the script are still reached
 * correctly — but stops extending the batch the moment any of these is
 * true for the candidate:
 *
 *  - it has `option_hints` (the hint must be synthesized from an answer
 *    given earlier IN this same batch, which does not exist yet at the
 *    moment the token is issued — hints always go alone);
 *  - it has an entry in `script.critics` (needs its own ack card, never
 *    silently folded into a batch);
 *  - it belongs to a different `branch` than the question the batch
 *    started on (a batch never crosses a branch boundary);
 *  - the batch already reached `MAX_BATCH_SIZE`.
 *
 * S7 (the branch-choice question) is a special case: it may be the sole
 * member of a batch, or the last member of one, but nothing is ever
 * appended after it — the branch it decides isn't known until it actually
 * commits, so nothing past it can be evaluated for branch compatibility
 * yet. The head question itself is included even when it has
 * `option_hints`/a critic (a single-question batch of exactly that one
 * question) — it's only ever excluded from being followed by something
 * else.
 */
export function computeBatch(progress: Progress, script: Script): string[] {
  const headId = progress.current_step;
  if (headId === null) {
    return [];
  }

  const headQuestion = script.questions.find((q) => q.id === headId);
  if (!headQuestion) {
    // Unreachable in practice (current_step always names a real question),
    // but degrade to a single-question batch rather than throw — the
    // caller (issuePromptCapability) already handles a missing question via
    // its normal single-question path elsewhere.
    return [headId];
  }

  const hasCritic = (qid: string): boolean => Boolean(script.critics?.[qid]);

  if (headQuestion.option_hints || hasCritic(headId) || headId === 'S7') {
    return [headId];
  }

  const batch = [headId];
  let virtualAnswered = [...progress.answered, headId];

  while (batch.length < MAX_BATCH_SIZE) {
    const nextId = selectNextStep(virtualAnswered, progress.branch, script);
    if (nextId === null) {
      break;
    }
    const nextQuestion = script.questions.find((q) => q.id === nextId);
    if (!nextQuestion) {
      break;
    }
    if (nextQuestion.branch !== headQuestion.branch) {
      break;
    }
    if (nextQuestion.option_hints || hasCritic(nextId)) {
      break;
    }

    batch.push(nextId);
    virtualAnswered = [...virtualAnswered, nextId];

    if (nextId === 'S7') {
      // S7 caps the batch even mid-walk — nothing after it can be
      // evaluated for branch compatibility until it actually commits.
      break;
    }
  }

  return batch;
}
