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

/**
 * B24c (D61) — the prose a `multi_select` commit must carry when the user
 * chose more than one option: each selected option's `deriveAnswerText`,
 * joined. Never the raw `value`s (same D58 rule deriveAnswerText itself
 * follows) — a multi-select answer still has to read as a sentence a human
 * wrote once it lands in a doc slot (emit.ts), not a token list.
 */
export function deriveMultiAnswerText(options: Pick<ScriptOption, 'label' | 'description'>[]): string {
  return options.map(deriveAnswerText).join('; ');
}

export type QuestionInteraction =
  | { kind: 'free_text'; allowFreeText: true }
  | {
      kind: 'static';
      allowFreeText: true;
      multiSelect: boolean;
      options: NonNullable<Question['options']>;
      recommendation: NonNullable<Question['recommendation']>;
    }
  | {
      kind: 'hints';
      allowFreeText: true;
      multiSelect: boolean;
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
      multiSelect: question.multi_select ?? false,
      options: question.options,
      recommendation: question.recommendation!,
    };
  }
  if (question.option_hints) {
    return {
      kind: 'hints',
      allowFreeText: true,
      multiSelect: question.multi_select ?? false,
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
