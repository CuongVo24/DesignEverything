import { describe, it, expect, vi } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import {
  loadDeepenState,
  saveDeepenState,
  listDeepenSubjects,
  expandQuestionInstances,
  optInModule,
  commitDeepenAnswer,
  canEmitModule,
  computeSourceDigest,
} from './deepenState.js';
import { defaultDeepenState } from './schemas/deepenState.js';
import { loadDeepenScript } from './loadDeepenScript.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = loadDeepenScript(join(__dirname, '../../Design/Content/interview-script/deepen-script.yaml'));

function ws(): string {
  return mkdtempSync(join(tmpdir(), 'de-ws-'));
}

describe('loadDeepenState / saveDeepenState', () => {
  it('workspace không có state → mặc định (mọi module opted_in:false)', () => {
    const state = loadDeepenState(ws());
    expect(Object.values(state.modules).every((m) => m.opted_in === false)).toBe(true);
  });

  it('file hỏng → state mặc định + warn, không crash', () => {
    const dir = ws();
    const p = join(dir, '.design-everything/deepen-state.json');
    saveDeepenState(dir, defaultDeepenState()); // tạo thư mục
    writeFileSync(p, '{ khong-phai-json', 'utf8');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = loadDeepenState(dir);
    expect(state.modules.glossary.opted_in).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('save atomic: không còn file .tmp, đọc lại đúng', () => {
    const dir = ws();
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    saveDeepenState(dir, s);
    const p = join(dir, '.design-everything/deepen-state.json');
    expect(existsSync(`${p}.tmp`)).toBe(false);
    expect(loadDeepenState(dir).modules.glossary.opted_in).toBe(true);
    expect(JSON.parse(readFileSync(p, 'utf8')).modules.glossary.activation).toBe('explicit');
  });
});

describe('optInModule', () => {
  it('idempotent — opt-in lại không reset answered, giữ activation đầu', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' });
    const again = optInModule(s, 'glossary', 'condition');
    expect(again.modules.glossary.answered.length).toBe(1);
    expect(again.modules.glossary.activation).toBe('explicit');
  });
});

describe('commitDeepenAnswer — 5 ca throw', () => {
  it('module chưa opt-in', () => {
    expect(() =>
      commitDeepenAnswer(defaultDeepenState(), script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' })
    ).toThrow(/chưa opt-in/);
  });

  it('question không thuộc module', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS2a', subjectId: null, userTurnId: 't1' })
    ).toThrow(/không thuộc module/);
  });

  it('subjectId không khớp per_subject (none nhưng có subject)', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: 'x', userTurnId: 't1' })
    ).toThrow(/per_subject:none/);
  });

  it('per_subject:must nhưng thiếu subjectId', () => {
    const s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'feature-spec', questionId: 'DS2a', subjectId: null, userTurnId: 't1' })
    ).toThrow(/thiếu subjectId/);
  });

  it('instance đã commit', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' });
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't2' })
    ).toThrow(/đã được commit/);
  });

  it('duplicate turn', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' });
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1b', subjectId: null, userTurnId: 't1' })
    ).toThrow(/Duplicate turn/);
  });
});

describe('per-subject completeness', () => {
  const subjects = ['dang-nhap', 'tim-kiem'];

  it('DS2a của A không tính cho B; canEmitModule liệt kê missing theo instance', () => {
    let s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    // Trả đủ 3 câu cho A, chưa gì cho B.
    let turn = 0;
    for (const q of ['DS2a', 'DS2b', 'DS2c']) {
      s = commitDeepenAnswer(s, script, { module: 'feature-spec', questionId: q, subjectId: 'dang-nhap', userTurnId: `t${turn++}` });
    }
    const res = canEmitModule(s, script, 'feature-spec', subjects);
    expect(res.ok).toBe(false);
    // Tất cả missing đều thuộc subject B.
    expect(res.missing.length).toBe(3);
    expect(res.missing.every((m) => m.subject_id === 'tim-kiem')).toBe(true);
  });

  it('đủ mọi instance → ok:true', () => {
    let s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    let turn = 0;
    for (const subj of subjects) {
      for (const q of ['DS2a', 'DS2b', 'DS2c']) {
        s = commitDeepenAnswer(s, script, { module: 'feature-spec', questionId: q, subjectId: subj, userTurnId: `t${turn++}` });
      }
    }
    expect(canEmitModule(s, script, 'feature-spec', subjects).ok).toBe(true);
  });
});

describe('canEmitModule — stale', () => {
  it('emitted_at set + digest khác → stale; digest khớp → không stale', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, userTurnId: 't1' });
    s = commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1b', subjectId: null, userTurnId: 't2' });
    s.modules.glossary.emitted_at = '2026-07-21T00:00:00Z';
    s.modules.glossary.source_digest = 'DIGEST_A';
    expect(canEmitModule(s, script, 'glossary', [], 'DIGEST_B').stale).toBe(true);
    expect(canEmitModule(s, script, 'glossary', [], 'DIGEST_A').stale).toBe(false);
    // Chưa emit → không bao giờ stale.
    s.modules.glossary.emitted_at = null;
    expect(canEmitModule(s, script, 'glossary', [], 'DIGEST_B').stale).toBe(false);
  });
});

describe('computeSourceDigest', () => {
  const tier1Docs = { 'docs/03-data-model.md': '# entities\nUser, Recipe' };
  it('ổn định với cùng input; đổi 1 ký tự answer → digest khác', () => {
    const a = computeSourceDigest('glossary', { deepenAnswers: { 'DS1a': 'x' }, tier1Docs });
    const b = computeSourceDigest('glossary', { deepenAnswers: { 'DS1a': 'x' }, tier1Docs });
    const c = computeSourceDigest('glossary', { deepenAnswers: { 'DS1a': 'y' }, tier1Docs });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('bỏ qua doc/answer không thuộc nguồn module', () => {
    const base = computeSourceDigest('glossary', { deepenAnswers: { 'DS1a': 'x' }, tier1Docs });
    // Thêm answer DS4 (test-strategy) + doc 05-architecture: không đổi digest glossary.
    const withNoise = computeSourceDigest('glossary', {
      deepenAnswers: { 'DS1a': 'x', 'DS4a': 'noise' },
      tier1Docs: { ...tier1Docs, 'docs/05-architecture.md': 'noise' },
    });
    expect(withNoise).toBe(base);
  });
});

describe('listDeepenSubjects', () => {
  it('feature-spec → slug từng Must', () => {
    const subjects = listDeepenSubjects('feature-spec', {
      answers: { S3: 'Must: Đăng nhập, Tìm kiếm. Should: Shopping List.' },
      tier1Docs: {},
    });
    expect(subjects).toEqual(['ng-nh-p', 't-m-ki-m']);
  });

  it('glossary / test-strategy → [] (per_subject none)', () => {
    expect(listDeepenSubjects('glossary', { answers: {}, tier1Docs: {} })).toEqual([]);
    expect(listDeepenSubjects('test-strategy', { answers: {}, tier1Docs: {} })).toEqual([]);
  });

  it('adr → id positional adr-00N theo số quyết định 05-architecture của branch', () => {
    const subjects = listDeepenSubjects('adr', {
      answers: {
        client_and_rendering_strategy: 'Next.js SSR',
        auth_and_access_strategy: 'NextAuth',
      },
      tier1Docs: { 'docs/07-deployment.md': '# deploy' }, // → branch web
    });
    expect(subjects.length).toBeGreaterThanOrEqual(2);
    expect(subjects[0]).toBe('adr-001');
    expect(subjects.every((s, i) => s === `adr-${String(i + 1).padStart(3, '0')}`)).toBe(true);
  });
});

describe('expandQuestionInstances', () => {
  it('none → 1 instance null; must → 1 instance mỗi subject, target_doc thay {subject-slug}', () => {
    const gloss = expandQuestionInstances(script, 'glossary', []);
    expect(gloss.every((i) => i.subject_id === null)).toBe(true);

    const feat = expandQuestionInstances(script, 'feature-spec', ['ng-nh-p']);
    expect(feat.length).toBe(3);
    expect(feat[0].subject_id).toBe('ng-nh-p');
    expect(feat[0].target_doc).toBe('design/features/ng-nh-p.md');
  });
});
