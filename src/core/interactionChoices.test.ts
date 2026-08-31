import { expect, test, describe } from 'vitest';
import { deriveAnswerText, deriveMultiAnswerText, resolveQuestionInteraction } from './interactionChoices.js';
import { loadScript } from './loadScript.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const script = loadScript(scriptPath);

describe('B24c (D61) — deriveMultiAnswerText', () => {
  test('joins multiple options\' deriveAnswerText with "; ", never raw value', () => {
    const options = [
      { value: 'a', label: 'Nhóm A', description: 'Mô tả A.' },
      { value: 'b', label: 'Nhóm B', description: 'Mô tả B.' },
    ];
    expect(deriveMultiAnswerText(options)).toBe('Nhóm A: Mô tả A.; Nhóm B: Mô tả B.');
    expect(deriveMultiAnswerText(options)).not.toContain('a');
  });

  test('a single option collapses to exactly deriveAnswerText\'s own output', () => {
    const option = { value: 'a', label: 'Nhóm A', description: 'Mô tả A.' };
    expect(deriveMultiAnswerText([option])).toBe(deriveAnswerText(option));
  });

  test('an empty selection produces an empty string, not a throw', () => {
    expect(deriveMultiAnswerText([])).toBe('');
  });
});

describe('B24c (D61) — resolveQuestionInteraction carries multiSelect from the real script', () => {
  test('S1 (option_hints, multi_select: true in script.yaml) resolves with multiSelect: true', () => {
    const s1 = script.questions.find((q) => q.id === 'S1')!;
    const interaction = resolveQuestionInteraction(s1, { S0: 'Vision' });
    expect(interaction.kind).toBe('hints');
    if (interaction.kind === 'hints') {
      expect(interaction.multiSelect).toBe(true);
    }
  });

  test('CAL0 (options, fixed recommendation, no multi_select) resolves with multiSelect: false', () => {
    const cal0 = script.questions.find((q) => q.id === 'CAL0')!;
    const interaction = resolveQuestionInteraction(cal0);
    expect(interaction.kind).toBe('static');
    if (interaction.kind === 'static') {
      expect(interaction.multiSelect).toBe(false);
    }
  });

  test('S7 (options, fixed recommendation) resolves with multiSelect: false — schema forbids it being anything else', () => {
    const s7 = script.questions.find((q) => q.id === 'S7')!;
    const interaction = resolveQuestionInteraction(s7);
    expect(interaction.kind).toBe('static');
    if (interaction.kind === 'static') {
      expect(interaction.multiSelect).toBe(false);
    }
  });

  test('a free-text question (S0) resolves to kind free_text with no multiSelect field at all', () => {
    const s0 = script.questions.find((q) => q.id === 'S0')!;
    const interaction = resolveQuestionInteraction(s0);
    expect(interaction).toEqual({ kind: 'free_text', allowFreeText: true });
  });
});
