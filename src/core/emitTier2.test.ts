import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { emitTier2 } from './emitTier2.js';
import { checkTier2Consistency } from './checkDocsConsistency.js';
import { loadDeepenScript } from './loadDeepenScript.js';
import {
  loadDeepenState,
  saveDeepenState,
  optInModule,
  commitDeepenAnswer,
} from './deepenState.js';
import { defaultDeepenState } from './schemas/deepenState.js';
import type { DeepenState } from './schemas/deepenState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = loadDeepenScript(join(__dirname, '../../Design/Content/interview-script/deepen-script.yaml'));
const GOLDEN_DOCS = join(__dirname, '../../Design/Content/golden-example-web/docs');

const ARCH = {
  data_sensitivity_and_security: 'Chỉ thông tin đăng nhập',
  expected_scale_and_performance: 'Vài trăm user',
  client_and_rendering_strategy: 'Next.js SSR',
  architecture_overview: 'Responsive',
  auth_and_access_strategy: 'NextAuth',
  realtime_push_or_sync_strategy: 'Không realtime',
};

function buildWorkspace(answers: Record<string, string>): string {
  const ws = mkdtempSync(join(tmpdir(), 'emit2-'));
  // copy golden docs
  const copy = (src: string, relRoot: string) => {
    for (const name of readdirSync(src)) {
      const fp = join(src, name);
      const rel = relRoot ? `${relRoot}/${name}` : name;
      if (statSync(fp).isDirectory()) copy(fp, rel);
      else {
        const dest = join(ws, 'docs', rel);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, readFileSync(fp, 'utf8'));
      }
    }
  };
  copy(GOLDEN_DOCS, '');
  const ansDir = join(ws, 'Design/.interview');
  mkdirSync(ansDir, { recursive: true });
  writeFileSync(join(ansDir, 'answers.json'), JSON.stringify(answers, null, 2));
  return ws;
}

const baseAnswers: Record<string, string> = {
  S3: 'Must: Đăng nhập, Tìm kiếm. Should: Shopping List.',
  ...ARCH,
};

describe('emitTier2 transaction', () => {
  it('module chưa opt-in → skipped not-opted-in, không ghi file', () => {
    const ws = buildWorkspace(baseAnswers);
    const res = emitTier2({ workspace: ws, modules: ['glossary'], script, state: defaultDeepenState() });
    expect(res.skipped[0]).toMatchObject({ module: 'glossary', reason: 'not-opted-in' });
    expect(existsSync(join(ws, 'docs/design/glossary.md'))).toBe(false);
  });

  it('opt-in nhưng thiếu câu → skipped missing-answers, không ghi file, state không đổi', () => {
    const ws = buildWorkspace(baseAnswers);
    const state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    saveDeepenState(ws, state);
    const res = emitTier2({ workspace: ws, modules: ['glossary'], script, state });
    expect(res.skipped[0].reason).toBe('missing-answers');
    expect(res.skipped[0].missing!.length).toBeGreaterThan(0);
    expect(existsSync(join(ws, 'docs/design/glossary.md'))).toBe(false);
    expect(loadDeepenState(ws).modules.glossary.emitted_at).toBeNull();
  });

  it('đủ câu → ghi file + cập nhật state (emitted_at, digest, artifacts)', () => {
    const answers = { ...baseAnswers, DS1a: 'Recipe, ShoppingList', DS1b: 'Định nghĩa' };
    const ws = buildWorkspace(answers);
    let state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    state = commitDeepenAnswer(state, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' });
    state = commitDeepenAnswer(state, script, { module: 'glossary', questionId: 'DS1b', subjectId: null, userTurnId: 't2' });
    saveDeepenState(ws, state);

    const res = emitTier2({ workspace: ws, modules: ['glossary'], script, state });
    expect(res.emitted[0].files).toEqual(['design/glossary.md']);
    expect(existsSync(join(ws, 'docs/design/glossary.md'))).toBe(true);
    const persisted = loadDeepenState(ws);
    expect(persisted.modules.glossary.emitted_at).not.toBeNull();
    expect(persisted.modules.glossary.source_digest).not.toBeNull();
    expect(persisted.modules.glossary.artifacts).toEqual(['design/glossary.md']);
  });

  it('re-emit dọn file mồ côi khi Must bị xoá khỏi answers', () => {
    // Ban đầu 2 Must → 2 feature file.
    const answers2: Record<string, string> = {
      ...baseAnswers,
      'DS2a@ng-nh-p': 'a', 'DS2b@ng-nh-p': 'b', 'DS2c@ng-nh-p': 'c',
      'DS2a@t-m-ki-m': 'a', 'DS2b@t-m-ki-m': 'b', 'DS2c@t-m-ki-m': 'c',
    };
    const ws = buildWorkspace(answers2);
    let state: DeepenState = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    let turn = 0;
    for (const subj of ['ng-nh-p', 't-m-ki-m']) {
      for (const q of ['DS2a', 'DS2b', 'DS2c']) {
        state = commitDeepenAnswer(state, script, { module: 'feature-spec', questionId: q, subjectId: subj, userTurnId: `t${turn++}` });
      }
    }
    saveDeepenState(ws, state);
    const first = emitTier2({ workspace: ws, modules: ['feature-spec'], script, state });
    expect(first.emitted[0].files.length).toBe(2);
    expect(existsSync(join(ws, 'docs/design/features/t-m-ki-m.md'))).toBe(true);

    // Bỏ Must "Tìm kiếm" khỏi answers rồi re-emit.
    const answers1 = { ...answers2, S3: 'Must: Đăng nhập. Should: Shopping List.' };
    writeFileSync(join(ws, 'Design/.interview/answers.json'), JSON.stringify(answers1));
    const state2 = loadDeepenState(ws);
    const second = emitTier2({ workspace: ws, modules: ['feature-spec'], script, state: state2 });
    expect(second.emitted[0].removed).toContain('design/features/t-m-ki-m.md');
    expect(existsSync(join(ws, 'docs/design/features/t-m-ki-m.md'))).toBe(false);
    expect(existsSync(join(ws, 'docs/design/features/ng-nh-p.md'))).toBe(true);
  });
});

describe('checkTier2Consistency', () => {
  it('feature ngoài Must → error; entity lạ trong glossary → warning', () => {
    const tier1Docs = {
      'docs/02-scope.md': '## Must Have\nMust: Đăng nhập.\n',
      'docs/03-data-model.md': '## Thực Thể Chính\nUser, Recipe\n',
    };
    const renders = [
      { path: 'design/features/khong-phai-must.md', content: '', sources: [], unknown_blocks: 0 },
      {
        path: 'design/glossary.md',
        content: '## Thực Thể Từ Data Model\nUser, Recipe, GhostEntity\n',
        sources: [],
        unknown_blocks: 0,
      },
    ];
    const issues = checkTier2Consistency(renders, tier1Docs, { S3: 'Must: Đăng nhập.' });
    expect(issues.find((i) => i.code === 'feature-not-in-must')?.severity).toBe('error');
    expect(issues.find((i) => i.code === 'entity-not-in-data-model')?.severity).toBe('warning');
    // Entity hợp lệ không bị cảnh báo.
    expect(issues.filter((i) => i.message.includes('User')).length).toBe(0);
  });
});
