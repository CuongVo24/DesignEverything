import { expect, test, describe } from 'vitest';
import { questionSchema } from './interviewScript.js';

// B24c (D61) — multi_select is additive/optional (schema 2.1.0 -> 2.2.0),
// but its two cross-field rules (needs options/option_hints; incompatible
// with a fixed recommendation) are enforced here at the schema layer, not
// just documented — CAL0/S7 must be structurally unable to declare it.
const base = {
  id: 'X1',
  ask: 'Câu hỏi thử.',
  default: null,
  target_doc: 'foo.md',
  branch: 'core',
  gate: null,
  translate_back: 'Dịch ngược thử.',
  depends_on: [],
};

describe('B24c (D61) — questionSchema multi_select rules', () => {
  test('multi_select defaults to absent (not set) when omitted', () => {
    const result = questionSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.multi_select).toBeUndefined();
    }
  });

  test('multi_select: true on a plain free-text question is rejected — nothing to select multiple of', () => {
    const result = questionSchema.safeParse({ ...base, multi_select: true });
    expect(result.success).toBe(false);
  });

  test('multi_select: true is accepted on a question with option_hints', () => {
    const result = questionSchema.safeParse({
      ...base,
      option_hints: { synthesize_from: ['S0'], hint_count: 3, hint_style: 'test' },
      multi_select: true,
    });
    expect(result.success).toBe(true);
  });

  test('multi_select: true is accepted on a question with contextual-recommendation options', () => {
    const result = questionSchema.safeParse({
      ...base,
      options: [
        { value: 'a', label: 'A', description: 'Option A.' },
        { value: 'b', label: 'B', description: 'Option B.' },
      ],
      recommendation: { mode: 'contextual' },
      multi_select: true,
    });
    expect(result.success).toBe(true);
  });

  test('multi_select: true is rejected on a question with a fixed recommendation (the CAL0/S7 shape)', () => {
    const result = questionSchema.safeParse({
      ...base,
      options: [
        { value: 'web', label: 'Web', description: 'Ứng dụng web.' },
        { value: 'cli', label: 'CLI', description: 'Công cụ dòng lệnh.' },
      ],
      recommendation: { mode: 'fixed', value: 'web' },
      multi_select: true,
    });
    expect(result.success).toBe(false);
  });

  test('multi_select: false is always accepted, even on a fixed-recommendation question', () => {
    const result = questionSchema.safeParse({
      ...base,
      options: [
        { value: 'web', label: 'Web', description: 'Ứng dụng web.' },
        { value: 'cli', label: 'CLI', description: 'Công cụ dòng lệnh.' },
      ],
      recommendation: { mode: 'fixed', value: 'web' },
      multi_select: false,
    });
    expect(result.success).toBe(true);
  });
});
