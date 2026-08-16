import type { Script } from './schemas/index.js';
import { resolveQuestionInteraction, type QuestionInteraction } from './interactionChoices.js';

/**
 * H4 (v8-hotfix) — single source of truth for the data a question card
 * needs: ask, default, target_doc, translate_back, the resolved
 * interaction (options/option_hints/free_text), and any critic-pass
 * challenge. Before this, that data existed only inside
 * render-inject.ts's UserPromptSubmit-only rendering path — a `status
 * --json` call (the ONLY signal available on the very first turn, before
 * any UserPromptSubmit has ever fired for this session) returned nothing
 * but `current_step: "CAL0"`, so the agent had no `ask`/`options`/
 * `recommendation` to work from and had to fabricate a question and a
 * recommendation, guessing wrong against the script's own
 * `recommendation: {mode: fixed, value: fast}` for CAL0. D53 — data lives
 * in Core, only rendering differs by adapter; render-inject.ts now builds
 * its inject text FROM this card instead of re-deriving the same fields a
 * second time, so the two surfaces can no longer independently drift.
 */
export interface QuestionCard {
  id: string;
  kind: string;
  ask: string;
  default: string | null;
  target_doc: string | null;
  translate_back: string;
  interaction: QuestionInteraction;
  critic: { challenge: string; ack_prompt: string } | null;
}

export function buildQuestionCard(
  currentStepId: string | null,
  script: Script,
  committedAnswers: Record<string, string> = {}
): QuestionCard | null {
  if (currentStepId === null) return null;

  const question = script.questions.find((q) => q.id === currentStepId);
  if (!question) {
    throw new Error(`Question with ID ${currentStepId} not found in script`);
  }

  const critic = script.critics?.[question.id] ?? null;

  return {
    id: question.id,
    kind: question.kind ?? 'anchored',
    ask: question.ask,
    default: question.default ?? null,
    target_doc: question.target_doc,
    translate_back: question.translate_back,
    interaction: resolveQuestionInteraction(question, committedAnswers),
    critic: critic ? { challenge: critic.challenge.trim(), ack_prompt: critic.ack_prompt.trim() } : null,
  };
}
