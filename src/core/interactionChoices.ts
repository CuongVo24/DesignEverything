import type { Question } from './schemas/index.js';

type ScriptOption = NonNullable<Question['options']>[number];

/**
 * The prose an answer's `commit --answer` must carry when it originated from
 * a card selection (D58, DecisionLog.md). `value` is a short machine token
 * (e.g. `public-seo`) reused only for `--branch`/`--calibrate` and warning
 * rule matching — never for the committed answer text, because answers flow
 * straight into doc slots (see emit.ts) and a bare token there reads as
 * `> Nguồn: ...public-seo...` instead of a sentence a human wrote.
 */
export function deriveAnswerText(option: Pick<ScriptOption, 'label' | 'description'>): string {
  return `${option.label}: ${option.description}`;
}

export type QuestionInteraction =
  | { kind: 'free_text'; allowFreeText: true }
  | {
      kind: 'static';
      allowFreeText: true;
      options: NonNullable<Question['options']>;
      recommendation: NonNullable<Question['recommendation']>;
    }
  | {
      kind: 'hints';
      allowFreeText: true;
      hintCount: 2 | 3;
      hintStyle: string;
      sources: Array<{ id: string; value: string | null }>;
    };

/** Core owns option identity and source grounding; adapters only render it. */
export function resolveQuestionInteraction(
  question: Question,
  committedAnswers: Record<string, string> = {},
): QuestionInteraction {
  if (question.options) {
    return {
      kind: 'static',
      allowFreeText: true,
      options: question.options,
      recommendation: question.recommendation!,
    };
  }
  if (question.option_hints) {
    return {
      kind: 'hints',
      allowFreeText: true,
      hintCount: question.option_hints.hint_count,
      hintStyle: question.option_hints.hint_style,
      sources: question.option_hints.synthesize_from.map((id) => ({
        id,
        value: committedAnswers[id] ?? null,
      })),
    };
  }
  return { kind: 'free_text', allowFreeText: true };
}
