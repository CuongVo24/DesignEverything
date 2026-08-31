import { expect, test, describe } from 'vitest';
import { generateAgentsMd } from './generateAgentsMd.js';
import { loadScript } from '../../core/loadScript.js';
import { loadGatePolicy } from '../../core/loadGatePolicy.js';
import { deriveAnswerText } from '../../core/index.js';
import type { Script } from '../../core/schemas/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

describe('generateAgentsMd adapter', () => {
  const scriptPath = join(projectRoot, 'Design/Content/interview-script/script.yaml');
  const policyPath = join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml');

  test('should generate markdown with 5 required sections and soft enforcement statements', () => {
    const script = loadScript(scriptPath);
    const policy = loadGatePolicy(policyPath);

    const markdown = generateAgentsMd({ script, policy });

    // Assert 5 headings are present
    expect(markdown).toContain('## 1. Tại sao repo này dùng chế độ phỏng vấn trước');
    expect(markdown).toContain('## 2. Nguồn sự thật phải đọc');
    expect(markdown).toContain('## 3. Cách hỏi từng bước');
    expect(markdown).toContain('## 4. Gate mềm trước khi code');
    expect(markdown).toContain('## 5. Cách emit docs');

    // Assert soft enforcement disclaimer is present
    expect(markdown).toContain(
      'Trên harness chỉ đọc `AGENTS.md`, gate là chỉ dẫn mạnh chứ không phải chặn cứng bằng cơ chế.'
    );
    // B24e (8.2, D59/D60) — cadence disclaimer updated: batch + commit-then-
    // translate-back-after, both best-effort on a rules-only harness.
    expect(markdown).toContain('"ghi nhận trước, dịch ngược sau" chỉ là chỉ dẫn best-effort cho agent');

    // Assert scope-locked gate requirements are correctly listed
    expect(markdown).toContain('Gate `scope-locked`');
    expect(markdown).toContain('`00-vision.md`');
    expect(markdown).toContain('`01-personas.md`');
    expect(markdown).toContain('`02-scope.md`');
  });

  describe('3a. Lựa chọn dạng text (fallback) — options/option_hints (8.1)', () => {
    test('lists all 19 assisted questions in script order, marks exactly one recommended entry per fixed question', () => {
      const script = loadScript(scriptPath);
      const policy = loadGatePolicy(policyPath);
      const markdown = generateAgentsMd({ script, policy });

      expect(markdown).toContain('## 3a. Lựa chọn dạng text (fallback)');
      expect(markdown).toContain('Không được tuyên bố có AskUserQuestion/native card.');

      const staticIds = ['CAL0', 'S7', 'W1', 'W2', 'W3', 'W4', 'M1', 'M2', 'M4', 'M5', 'C1', 'C2', 'C4', 'C5'];
      const hintIds = ['S1', 'S2', 'S3', 'S4', 'S5'];
      const section3a = markdown.split('## 3a.')[1].split('## 4.')[0];
      const orderedIds = [...section3a.matchAll(/\*\*([A-Z0-9]+)\*\*/g)].map((m) => m[1]);
      expect(orderedIds).toEqual([...staticIds, ...hintIds].sort(
        (a, b) => script.questions.findIndex((q) => q.id === a) - script.questions.findIndex((q) => q.id === b)
      ));

      for (const id of staticIds) {
        const question = script.questions.find((q) => q.id === id)!;
        if (question.recommendation?.mode === 'fixed') {
          expect((section3a.match(/\*\*\(khuyến nghị\)\*\*/g) ?? []).length).toBeGreaterThan(0);
        } else {
          expect(section3a).toContain('Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.');
        }
      }
    });

    test('uses Core\'s deriveAnswerText verbatim for every option, matching what render-inject.ts commits for the same option', () => {
      const script = loadScript(scriptPath);
      const policy = loadGatePolicy(policyPath);
      const markdown = generateAgentsMd({ script, policy });

      const cal0 = script.questions.find((q) => q.id === 'CAL0')!;
      for (const option of cal0.options!) {
        expect(markdown).toContain(deriveAnswerText(option));
      }
    });

    test('every option_hints question documents hint_count, hint_style, and its sources', () => {
      const script = loadScript(scriptPath);
      const policy = loadGatePolicy(policyPath);
      const markdown = generateAgentsMd({ script, policy });

      const s1 = script.questions.find((q) => q.id === 'S1')!;
      expect(markdown).toContain(`tạo ${s1.option_hints!.hint_count} gợi ý theo “${s1.option_hints!.hint_style}”`);
      expect(markdown).toContain('từ S0 đã commit');
    });

    test('regression: a script with no options/option_hints renders section 3a with no choice entries, other sections unaffected', () => {
      const policy = loadGatePolicy(policyPath);
      const plainScript: Script = {
        version: '2.1.0',
        questions: [
          {
            id: 'S0',
            ask: 'Question S0',
            default: 'Default S0',
            kind: 'anchored',
            translate_back: 'Translate S0',
            target_doc: '00-vision.md',
            depends_on: [],
            branch: 'core',
            gate: null,
          },
        ],
      } as unknown as Script;

      const markdown = generateAgentsMd({ script: plainScript, policy });

      expect(markdown).toContain('## 3a. Lựa chọn dạng text (fallback)');
      expect(markdown).not.toMatch(/- \*\*[A-Z0-9]+\*\*:/);
      expect(markdown).toContain('## 1. Tại sao repo này dùng chế độ phỏng vấn trước');
      expect(markdown).toContain('## 5. Cách emit docs');
    });
  });
});
