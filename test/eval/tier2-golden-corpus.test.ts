import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import {
  emitTree,
  listDeepenSubjects,
  renderGlossary,
  renderFeatureSpec,
  renderAdr,
  renderTestStrategy,
} from '../../src/core/index.js';
import type { RenderedArtifact, Tier2RenderInput } from '../../src/core/index.js';
import type { DeepenModuleId } from '../../src/core/schemas/deepenState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const templatesDir = join(projectRoot, 'Design/Content/doc-templates');
const fixture = JSON.parse(readFileSync(join(projectRoot, 'test/fixtures/de-self-answers.json'), 'utf8'));
const goldenMap = JSON.parse(readFileSync(join(projectRoot, 'test/fixtures/de-golden-map.json'), 'utf8'));

// Ngưỡng KHOÁ TẠI ĐÂY (đổi = amend contract B21b + đo lại từ đầu, KHÔNG chốt hậu nghiệm).
const THRESHOLDS = {
  structuralCoverage: 0.7, // ≥
  groundingRate: 1.0, // =
  hallucinatedRationale: 0, // =
  unknownRate: 0.3, // ≤
  substanceFloorPerFile: 3, // mỗi file ≥ N khối nguồn thật
};

const RENDERERS: Record<DeepenModuleId, (i: Tier2RenderInput) => RenderedArtifact[]> = {
  glossary: renderGlossary,
  'feature-spec': renderFeatureSpec,
  adr: renderAdr,
  'test-strategy': renderTestStrategy,
};

function buildTier1Docs(answers: Record<string, string>): Record<string, string> {
  const tree = emitTree(answers, 'cli', templatesDir);
  const docs: Record<string, string> = {};
  for (const d of tree) {
    if (!d.file.startsWith('.design-everything/')) docs[`docs/${d.file}`] = d.content;
  }
  return docs;
}

function renderAll(answers: Record<string, string>, tier1Docs: Record<string, string>): RenderedArtifact[] {
  const out: RenderedArtifact[] = [];
  for (const module of Object.keys(RENDERERS) as DeepenModuleId[]) {
    const subjects = listDeepenSubjects(module, { answers, tier1Docs });
    out.push(...RENDERERS[module]({ answers, profile: null, tier1Docs, subjects }));
  }
  return out;
}

interface Metrics {
  structuralCoverage: number;
  groundingRate: number;
  hallucinatedRationale: number;
  unknownRate: number;
  substanceFloor: { path: string; realBlocks: number; pass: boolean }[];
  totalBlocks: number;
  unknownBlocks: number;
  presentAnchors: string[];
}

const RATIONALE_RE = /(vì sao|bởi vì|\bđể\b|lý do)/i;

// Dòng nguồn hợp lệ theo grammar SourceRef B19a.
const VALID_SOURCE_RE = /^> Nguồn: (answers:\S+|doc:docs\/\S+#\S+)$/m;
const UNKNOWN_RE = /^> ⚠ unknown — cần hỏi người$/m;

function measure(artifacts: RenderedArtifact[]): Metrics {
  const allAnchors: string[] = [];
  let totalBlocks = 0;
  let groundedBlocks = 0;
  let unknownBlocks = 0;
  let hallucinated = 0;
  const substanceFloor: Metrics['substanceFloor'] = [];

  for (const art of artifacts) {
    for (const m of art.content.matchAll(/id=([^\s]+)/g)) allAnchors.push(m[1]);
    substanceFloor.push({
      path: art.path,
      realBlocks: art.sources.length,
      pass: art.sources.length >= THRESHOLDS.substanceFloorPerFile,
    });

    // Đo TRỰC TIẾP trên nội dung (không tin số renderer tự khai): mỗi khối có anchor
    // phải mang đúng một dòng grammar hợp lệ hoặc cờ unknown.
    const blocks = art.content.split(/(?=^## )/m).filter((b) => /<!-- anchor:/.test(b));
    for (const b of blocks) {
      totalBlocks += 1;
      const hasSource = VALID_SOURCE_RE.test(b);
      const hasUnknown = UNKNOWN_RE.test(b);
      if (hasSource || hasUnknown) groundedBlocks += 1;
      if (hasUnknown) unknownBlocks += 1;
      // Hallucinated-rationale: có từ khoá lý do nhưng không truy được nguồn và không gắn cờ.
      if (RATIONALE_RE.test(b) && !hasSource && !hasUnknown) hallucinated += 1;
    }
  }

  // Structural coverage: prefix-match anchor sinh ra với expected_anchors trong map.
  const expected: string[] = goldenMap.mappings.flatMap((m: { expected_anchors: string[] }) => m.expected_anchors);
  const present = expected.filter((e) => allAnchors.some((a) => a === e || a.startsWith(e)));

  return {
    structuralCoverage: present.length / expected.length,
    groundingRate: totalBlocks === 0 ? 0 : groundedBlocks / totalBlocks,
    hallucinatedRationale: hallucinated,
    unknownRate: totalBlocks === 0 ? 0 : unknownBlocks / totalBlocks,
    substanceFloor,
    totalBlocks,
    unknownBlocks,
    presentAnchors: present,
  };
}

describe('B21b — eval tầng 2 trên golden corpus DE', () => {
  const answers = fixture.answers as Record<string, string>;
  const tier1Docs = buildTier1Docs(answers);
  const artifacts = renderAll(answers, tier1Docs);
  const metrics = measure(artifacts);

  it('deterministic: render 2 lần ra nội dung y hệt', () => {
    const again = renderAll(answers, buildTier1Docs(answers));
    expect(again.map((a) => a.content)).toEqual(artifacts.map((a) => a.content));
  });

  it('1. Structural coverage ≥ 70%', () => {
    expect(metrics.structuralCoverage).toBeGreaterThanOrEqual(THRESHOLDS.structuralCoverage);
  });

  it('2. Grounding rate = 100% (cờ unknown hợp lệ được tính)', () => {
    expect(metrics.groundingRate).toBe(THRESHOLDS.groundingRate);
  });

  it('3. Hallucinated-rationale = 0', () => {
    expect(metrics.hallucinatedRationale).toBe(THRESHOLDS.hallucinatedRationale);
  });

  it('4. Unknown rate ≤ 30%', () => {
    expect(metrics.unknownRate).toBeLessThanOrEqual(THRESHOLDS.unknownRate);
  });

  it('5. Substance floor: mỗi file ≥ 3 khối nguồn thật', () => {
    const failed = metrics.substanceFloor.filter((f) => !f.pass);
    expect(failed, `Files fail substance floor: ${failed.map((f) => f.path).join(', ')}`).toEqual([]);
  });

  it('ghi báo cáo evidence', () => {
    const evidenceDir = join(projectRoot, 'Design/RoadMap/evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const lines = [
      '# Eval tầng 2 — Golden corpus (DesignEverything tự thiết kế)',
      '',
      `> Ngày đo: ${new Date().toISOString().slice(0, 10)} · ref_sha: \`${goldenMap.ref_sha}\` · fixture: test/fixtures/de-self-answers.json`,
      '',
      '## 5 số liệu (ngưỡng khoá ở test)',
      '',
      '| # | Số liệu | Kết quả | Ngưỡng | Đạt |',
      '|---|---|---|---|---|',
      `| 1 | Structural coverage | ${(metrics.structuralCoverage * 100).toFixed(1)}% | ≥70% | ${metrics.structuralCoverage >= 0.7 ? '✅' : '❌'} |`,
      `| 2 | Grounding rate | ${(metrics.groundingRate * 100).toFixed(1)}% | 100% | ${metrics.groundingRate === 1 ? '✅' : '❌'} |`,
      `| 3 | Hallucinated-rationale | ${metrics.hallucinatedRationale} | 0 | ${metrics.hallucinatedRationale === 0 ? '✅' : '❌'} |`,
      `| 4 | Unknown rate | ${(metrics.unknownRate * 100).toFixed(1)}% | ≤30% | ${metrics.unknownRate <= 0.3 ? '✅' : '❌'} |`,
      `| 5 | Substance floor | ${metrics.substanceFloor.filter((f) => f.pass).length}/${metrics.substanceFloor.length} file đạt | mỗi file ≥3 | ${metrics.substanceFloor.every((f) => f.pass) ? '✅' : '❌'} |`,
      '',
      `Tổng khối: ${metrics.totalBlocks} · khối unknown: ${metrics.unknownBlocks}`,
      '',
      '## File sinh ra & khối nguồn thật',
      '',
      ...metrics.substanceFloor.map((f) => `- \`${f.path}\` — ${f.realBlocks} khối nguồn thật ${f.pass ? '✅' : '❌ (dưới sàn)'}`),
      '',
      '## Khối mẫu',
      '',
      '- **Khối có nguồn thật:** xem `design/glossary.md` §Thực Thể Từ Data Model → `doc:docs/03-data-model.md#03-data-model/core-entities`.',
      '- **Khối unknown:** `design/test-strategy.md` §Phạm Vi & Tầng Kiểm Thử → `⚠ unknown` (chưa có conventions/test-tiers.md).',
      '',
      '## Nhận xét tay của manager',
      '',
      '_(Điền khi review: chọn ≥5 khối ngẫu nhiên, đối chiếu rubric B19a — grounding, chống bịa, đúng cardinality.)_',
      '',
    ];
    writeFileSync(join(evidenceDir, 'v6-tier2-eval.md'), lines.join('\n'), 'utf8');
    expect(true).toBe(true);
  });
});
