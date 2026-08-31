import { expect, test, describe } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadScript } from './loadScript.js';
import { deriveAnswerText } from './interactionChoices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');

/**
 * B22e — invariants over the REAL script.yaml (parsed through loadScript,
 * never a fixture/mock) for every question that carries options/option_hints
 * (8.1, D53/D55). Catches drift in the content batch (B22a) that the schema
 * layer (B22b) is deliberately loose about — e.g. schema allows any 2-4
 * entries, but this file pins the exact 19-question shape and the
 * warning_rules/option prose interaction that B22b's refine can't see
 * (warning_rules is generic answer_contract, not part of the options shape).
 */
describe('B22e — script.yaml options/option_hints invariants', () => {
  const script = loadScript(scriptPath);
  const staticQuestions = script.questions.filter((q) => q.options);
  const hintQuestions = script.questions.filter((q) => q.option_hints);

  test('sanity: exactly 14 static-catalog and 5 hint questions exist in the real script', () => {
    expect(staticQuestions).toHaveLength(14);
    expect(hintQuestions).toHaveLength(5);
  });

  test('every options array has 2-4 entries with non-empty description, unique value and label', () => {
    for (const question of staticQuestions) {
      const options = question.options!;
      expect(options.length, `${question.id}: options length`).toBeGreaterThanOrEqual(2);
      expect(options.length, `${question.id}: options length`).toBeLessThanOrEqual(4);
      for (const option of options) {
        expect(option.description.trim().length, `${question.id}: ${option.value} description`).toBeGreaterThan(0);
      }
      const values = options.map((o) => o.value);
      const labels = options.map((o) => o.label);
      expect(new Set(values).size, `${question.id}: duplicate value`).toBe(values.length);
      expect(new Set(labels).size, `${question.id}: duplicate label`).toBe(labels.length);
    }
  });

  test('every options question has a recommendation, and a fixed one always points at a real option', () => {
    for (const question of staticQuestions) {
      expect(question.recommendation, `${question.id}: missing recommendation`).toBeDefined();
      if (question.recommendation!.mode === 'fixed') {
        const values = question.options!.map((o) => o.value);
        expect(values, `${question.id}: fixed recommendation must reference a real option`).toContain(question.recommendation!.value);
      }
    }
  });

  test('every option_hints question has hint_count in {2, 3} and a non-empty synthesize_from', () => {
    for (const question of hintQuestions) {
      const hints = question.option_hints!;
      expect([2, 3], `${question.id}: hint_count`).toContain(hints.hint_count);
      expect(hints.synthesize_from.length, `${question.id}: synthesize_from`).toBeGreaterThan(0);
      expect(hints.hint_style.trim().length, `${question.id}: hint_style`).toBeGreaterThan(0);
    }
  });

  test('D55: render-inject.ts and generateAgentsMd.ts both keep the free-text escape hatch for every options question', async () => {
    // Integration, not string-literal inspection (per contract §2): call the
    // two real adapter functions and check their actual output, so this
    // fails if either adapter's free-text reminder line is ever deleted.
    const { renderInject } = await import('../adapters/claude/skill/render-inject.js');
    const { generateAgentsMd } = await import('../adapters/agents/generateAgentsMd.js');
    const { loadGatePolicy } = await import('./loadGatePolicy.js');
    const policyPath = join(__dirname, '../../Design/Content/interview-script/gate-policy.yaml');
    const policy = loadGatePolicy(policyPath);
    const agentsMd = generateAgentsMd({ script, policy });

    for (const question of staticQuestions) {
      const progress = {
        version: '0.1.0',
        session_id: 's',
        state_revision: 0,
        phase: 'interview' as const,
        branch: null,
        current_step: question.id,
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        pending_turn_capability: null,
        last_user_turn_id: null,
        answered_len_at_last_turn: 0,
        updated_at: new Date().toISOString(),
        calibrate_mode: null,
      };
      const injected = renderInject(progress, script);
      expect(injected, `${question.id}: Claude free-text reminder`).toContain('tự nhập');
      expect(agentsMd, `${question.id}: AGENTS.md free-text reminder present anywhere in file`).toContain('Có thể tự nhập phương án khác.');

      // Both adapters must render the SAME derived prose per option — the
      // whole point of putting deriveAnswerText in Core (D53/D58).
      for (const option of question.options!) {
        const text = deriveAnswerText(option);
        expect(injected, `${question.id}: Claude renders "${text}"`).toContain(text);
        expect(agentsMd, `${question.id}: AGENTS.md renders "${text}"`).toContain(text);
      }
    }
  });

  test('warning_rules on an options question must match exactly the intended option set, no more, no fewer', () => {
    // Locks the intent behind the C5/M2 fixes made in B22a (P3): a
    // warning_rules pattern is written against free prose, and once options
    // exist a card answer is `deriveAnswerText(option)` prose too — so the
    // pattern must be re-checked against that exact text, not just trusted.
    // This table is the QA-owned ground truth of "which options SHOULD
    // trigger which warning", replacing the `value === default` machine
    // check dropped from the schema (see b22b §7 deviation #2).
    const expectedMatches: Record<string, Record<string, string[]>> = {
      C5: { C5_MULTIPLATFORM_DISTRIBUTION_REQUESTED: ['release-binary', 'os-package-manager'] },
      M2: { M2_OFFLINE_SYNC_REQUESTED: ['offline-critical', 'offline-first'] },
      M5: { M5_STORE_RELEASE_REQUESTED: ['store-free', 'store-iap', 'store-other'] },
    };

    const questionsWithWarnings = staticQuestions.filter((q) => (q.answer_contract?.warning_rules?.length ?? 0) > 0);
    // Sanity: every question this test knows about still exists with warning_rules,
    // and no *other* options question quietly grew warning_rules this test doesn't know about.
    expect(questionsWithWarnings.map((q) => q.id).sort()).toEqual(Object.keys(expectedMatches).sort());

    for (const question of questionsWithWarnings) {
      const rules = question.answer_contract!.warning_rules!;
      const expectedForQuestion = expectedMatches[question.id];
      expect(rules.map((r) => r.code).sort(), `${question.id}: rule codes`).toEqual(Object.keys(expectedForQuestion).sort());

      for (const rule of rules) {
        expect(rule.pattern, `${question.id}/${rule.code}: rule has no pattern to check`).toBeDefined();
        const regex = new RegExp(rule.pattern!, 'i');
        const actualMatches = question.options!
          .filter((option) => regex.test(deriveAnswerText(option)))
          .map((option) => option.value)
          .sort();
        expect(actualMatches, `${question.id}/${rule.code}: option set the pattern actually matches`).toEqual(
          [...expectedForQuestion[rule.code]].sort()
        );
      }
    }
  });
});
