import { test, expect, describe } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { type Script } from './schemas/index.js';
import { loadScript as loadScriptFile } from './loadScript.js';
import { validateAnswer } from './validateAnswer.js';

const SCRIPT_PATH = join(process.cwd(), 'Design/Content/interview-script/script.yaml');
const RECIPES_PATH = join(process.cwd(), 'Design/Content/interview-script/derived-recipes.yaml');

function loadScript(): Script {
  return loadScriptFile(SCRIPT_PATH);
}

function findQuestion(script: Script, id: string) {
  const q = script.questions.find((question) => question.id === id);
  if (!q) throw new Error(`Question ${id} not found in script.yaml`);
  return q;
}

describe('B3b — content quality and derived provenance contract', () => {
  test('script.yaml parses against scriptSchema including answer_contract', () => {
    const script = loadScript();
    expect(script.questions.length).toBeGreaterThan(0);
    const withContract = script.questions.filter((q) => q.answer_contract);
    const ids = withContract.map((q) => q.id).sort();
    expect(ids).toEqual(
      ['C5', 'M2', 'M5', 'R1', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S8', 'W5'].sort()
    );
  });

  test('derived-recipes.yaml is well-formed and every recipe has source coverage + unknown fallback', () => {
    const raw = YAML.parse(readFileSync(RECIPES_PATH, 'utf8')) as {
      version: string;
      recipes: Array<{
        id: string;
        target_doc: string;
        inputs: Record<string, string[]>;
        coverage: { rule: string; min_source_refs_per_item: number };
        unknown_policy: string;
        fallback: { on_missing_source: string };
      }>;
    };
    expect(raw.recipes.length).toBeGreaterThan(0);
    for (const recipe of raw.recipes) {
      expect(recipe.unknown_policy).toBe('flag');
      expect(recipe.coverage.min_source_refs_per_item).toBeGreaterThanOrEqual(1);
      expect(recipe.fallback.on_missing_source).toContain('unknown');
      expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
    }
  });

  test('S0 rejects generic elevator pitch as needs_user_ack, accepts specific pitch as valid', () => {
    const script = loadScript();
    const s0 = findQuestion(script, 'S0');
    const generic = validateAnswer(s0.answer_contract, 'Nền tảng kết nối mọi người.');
    expect(generic.outcome).toBe('needs_user_ack');
    expect(generic.reason_code).toBe('WARNING_RULES_TRIGGERED');

    const specific = validateAnswer(
      s0.answer_contract,
      'Ứng dụng giúp sinh viên HCMUS theo dõi lịch học và deadline đồ án.'
    );
    expect(specific.outcome).toBe('valid');
  });

  test('S2 flags "ai cũng dùng" persona for user acknowledgement', () => {
    const script = loadScript();
    const s2 = findQuestion(script, 'S2');
    const generic = validateAnswer(s2.answer_contract, 'Ai cũng dùng được sản phẩm này.');
    expect(generic.outcome).toBe('needs_user_ack');

    const specific = validateAnswer(
      s2.answer_contract,
      'Sinh viên năm 3 muốn nộp đồ án đúng hạn không quên deadline.'
    );
    expect(specific.outcome).toBe('valid');
  });

  test('S3 flags missing Won\'t section and "everything is Must" for acknowledgement', () => {
    const script = loadScript();
    const s3 = findQuestion(script, 'S3');

    const missingWont = validateAnswer(s3.answer_contract, 'Must:\n- Đăng nhập\nShould:\n- Thông báo đẹp');
    expect(missingWont.outcome).toBe('needs_user_ack');

    const everythingMust = validateAnswer(
      s3.answer_contract,
      'Must:\n- Đăng nhập\nMọi tính năng đều là Must vì đều quan trọng cả.'
    );
    expect(everythingMust.outcome).toBe('needs_user_ack');

    const wellFormed = validateAnswer(
      s3.answer_contract,
      "Must:\n- Đăng nhập\nShould:\n- Thông báo\nWon't (MVP):\n- Mạng xã hội"
    );
    expect(wellFormed.outcome).toBe('valid');
  });

  test('M2 flags offline/sync choice, M5 flags real store release, W5 flags realtime', () => {
    const script = loadScript();
    const m2 = findQuestion(script, 'M2');
    expect(validateAnswer(m2.answer_contract, 'Cần offline khi mất mạng.').outcome).toBe(
      'needs_user_ack'
    );
    expect(
      validateAnswer(m2.answer_contract, 'Chỉ cần có mạng ổn định là đủ, không có yêu cầu đặc biệt.')
        .outcome
    ).toBe('valid');

    const m5 = findQuestion(script, 'M5');
    expect(validateAnswer(m5.answer_contract, 'Muốn lên store thật ngay từ đầu.').outcome).toBe(
      'needs_user_ack'
    );

    const w5 = findQuestion(script, 'W5');
    expect(validateAnswer(w5.answer_contract, 'Cần realtime cho chat.').outcome).toBe(
      'needs_user_ack'
    );
    expect(validateAnswer(w5.answer_contract, 'Không cần, chưa có admin riêng.').outcome).toBe(
      'valid'
    );
  });

  test('C5 flags multi-platform binary distribution for acknowledgement', () => {
    const script = loadScript();
    const c5 = findQuestion(script, 'C5');
    expect(
      validateAnswer(c5.answer_contract, 'Phân phối binary biên dịch sẵn qua GitHub Releases.')
        .outcome
    ).toBe('needs_user_ack');
    expect(validateAnswer(c5.answer_contract, 'Chạy cục bộ qua npx trước.').outcome).toBe('valid');
  });
});
