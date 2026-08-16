import type { Question } from './schemas/index.js';

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
