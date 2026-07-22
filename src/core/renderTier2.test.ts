import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync } from 'fs';
import { renderGlossary } from './renderGlossary.js';
import { renderFeatureSpec } from './renderFeatureSpec.js';
import { renderAdr } from './renderAdr.js';
import { renderTestStrategy } from './renderTestStrategy.js';
import { listDeepenSubjects } from './deepenState.js';
import type { Tier2RenderInput } from './schemas/tier2Render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DOCS = join(__dirname, '../../Design/Content/golden-example-web/docs');

function loadGoldenTier1(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      const fp = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(fp).isDirectory()) walk(fp, r);
      else if (name.endsWith('.md')) out[`docs/${r}`] = readFileSync(fp, 'utf8');
    }
  };
  walk(GOLDEN_DOCS, '');
  return out;
}

const tier1Docs = loadGoldenTier1();
const ARCH_SLOTS = {
  data_sensitivity_and_security: 'Chỉ thông tin đăng nhập cơ bản',
  expected_scale_and_performance: 'Vài trăm người dùng năm đầu',
  client_and_rendering_strategy: 'Next.js SSR cho SEO',
  architecture_overview: 'Responsive mobile-first',
  auth_and_access_strategy: 'NextAuth Google OAuth',
  realtime_push_or_sync_strategy: 'Không realtime ở MVP',
};
const baseAnswers: Record<string, string> = {
  S3: 'Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List.',
  ...ARCH_SLOTS,
};
const input = (answers: Record<string, string>, subjects: string[]): Tier2RenderInput => ({
  answers,
  profile: null,
  tier1Docs,
  subjects,
});

describe('renderGlossary', () => {
  it('entity từ data-model cite doc; DS1 thiếu → cờ unknown', () => {
    const [art] = renderGlossary(input(baseAnswers, []));
    expect(art.path).toBe('design/glossary.md');
    expect(art.sources).toContain('doc:docs/03-data-model.md#03-data-model/core-entities');
    expect(art.content).toContain('User, Recipe, ShoppingList');
    expect(art.unknown_blocks).toBe(2); // DS1a + DS1b chưa trả lời
  });

  it('DS1 có nguồn → cite answers, hết unknown', () => {
    const answers = { ...baseAnswers, DS1a: 'Recipe, ShoppingList', DS1b: 'Recipe = công thức nấu ăn' };
    const [art] = renderGlossary(input(answers, []));
    expect(art.sources).toContain('answers:DS1a');
    expect(art.sources).toContain('answers:DS1b');
    expect(art.unknown_blocks).toBe(0);
  });
});

describe('renderFeatureSpec', () => {
  const subjects = listDeepenSubjects('feature-spec', { answers: baseAnswers, tier1Docs });

  it('đúng 1 file mỗi Must, slug khớp slugify', () => {
    const arts = renderFeatureSpec(input(baseAnswers, subjects));
    expect(arts.length).toBe(4);
    expect(arts.map((a) => a.path).sort()).toEqual(
      ['ng-nh-p', 't-m-ki-m', 't-o-c-ng-th-c', 'xem-c-ng-th-c'].map((s) => `design/features/${s}.md`).sort()
    );
  });

  it('DS2 của must A không rò sang must B', () => {
    const answers = {
      ...baseAnswers,
      'DS2a@ng-nh-p': 'Sai mật khẩu quá 5 lần',
      'DS2b@ng-nh-p': 'Hiện thông báo lỗi rõ',
      'DS2c@ng-nh-p': 'Trả JWT hợp lệ',
    };
    const arts = renderFeatureSpec(input(answers, subjects));
    const dangNhap = arts.find((a) => a.path === 'design/features/ng-nh-p.md')!;
    const timKiem = arts.find((a) => a.path === 'design/features/t-m-ki-m.md')!;
    expect(dangNhap.content).toContain('Sai mật khẩu quá 5 lần');
    expect(dangNhap.sources).toContain('answers:DS2a@ng-nh-p');
    // B chưa trả lời → không chứa nội dung của A, và có cờ unknown.
    expect(timKiem.content).not.toContain('Sai mật khẩu quá 5 lần');
    expect(timKiem.unknown_blocks).toBe(3);
  });
});

describe('renderAdr', () => {
  it('numbering positional adr-001.. ổn định qua 2 lần render cùng input', () => {
    const subjects = listDeepenSubjects('adr', { answers: baseAnswers, tier1Docs });
    const a1 = renderAdr(input(baseAnswers, subjects));
    const a2 = renderAdr(input(baseAnswers, subjects));
    expect(a1.map((x) => x.path)).toEqual(a2.map((x) => x.path));
    expect(a1[0].path).toMatch(/^design\/adr\/ADR-001-/);
    expect(a1.length).toBeGreaterThanOrEqual(2);
  });

  it('bỏ 1 quyết định (rendering) → các số dịch theo thứ tự mới', () => {
    const withRender = renderAdr(input(baseAnswers, [])).length;
    const noRender = { ...baseAnswers };
    delete (noRender as Record<string, string>).client_and_rendering_strategy;
    const withoutRender = renderAdr(input(noRender, [])).length;
    expect(withoutRender).toBe(withRender - 1);
  });

  it('DS3 thiếu → rationale/alternatives ra cờ unknown', () => {
    const subjects = listDeepenSubjects('adr', { answers: baseAnswers, tier1Docs });
    const arts = renderAdr(input(baseAnswers, subjects));
    expect(arts[0].unknown_blocks).toBe(2);
    const answered = {
      ...baseAnswers,
      'DS3a@adr-001': 'Đã cân nhắc SPA thuần',
      'DS3b@adr-001': 'Xem lại nếu chi phí server tăng',
    };
    const arts2 = renderAdr(input(answered, subjects));
    expect(arts2[0].unknown_blocks).toBe(0);
    expect(arts2[0].sources).toContain('answers:DS3a@adr-001');
  });
});

describe('renderTestStrategy', () => {
  it('conventions/test-tiers.md thiếu → khối scope unknown; DS4 có → cite answers', () => {
    const answers = { ...baseAnswers, DS4a: 'Hỏng đăng nhập là đau nhất', DS4b: 'Module đồng bộ dữ liệu' };
    const [art] = renderTestStrategy(input(answers, []));
    expect(art.path).toBe('design/test-strategy.md');
    expect(art.sources).toContain('answers:DS4a');
    expect(art.sources).toContain('doc:docs/04-flows.md#04-flows/main-flow-steps');
    expect(art.unknown_blocks).toBe(1); // scope (không có conventions/test-tiers.md)
  });
});
