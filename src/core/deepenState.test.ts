import { describe, it, expect, vi } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import {
  loadDeepenState,
  saveDeepenState,
  transactDeepenStore,
  listDeepenSubjects,
  expandQuestionInstances,
  optInModule,
  commitDeepenAnswer,
  canEmitModule,
  computeSourceDigest,
} from './deepenState.js';
import { issueTurnCapability } from './turnCapability.js';
import { defaultDeepenState, type DeepenState, type DeepenModuleId } from './schemas/deepenState.js';
import { loadDeepenScript } from './loadDeepenScript.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = loadDeepenScript(join(__dirname, '../../Design/Content/interview-script/deepen-script.yaml'));

function ws(): string {
  return mkdtempSync(join(tmpdir(), 'de-ws-'));
}

/** Issues a real deepen capability then commits it in one call (mirrors production flow). */
function commitDeepen(
  s: DeepenState,
  args: { module: DeepenModuleId; questionId: string; subjectId: string | null }
): DeepenState {
  const issued = issueTurnCapability(s.state_revision || 0, {
    sessionId: s.session_id || 'default-session',
    operationKind: 'deepen',
    questionId: args.questionId,
    subjectId: args.subjectId,
  });
  const withCap: DeepenState = { ...s, pending_turn_capability: issued.capability };
  return commitDeepenAnswer(withCap, script, { ...args, capabilityToken: issued.token });
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
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    const again = optInModule(s, 'glossary', 'condition');
    expect(again.modules.glossary.answered.length).toBe(1);
    expect(again.modules.glossary.activation).toBe('explicit');
  });
});

describe('commitDeepenAnswer — capability + validation cases', () => {
  it('thiếu capability token', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    expect(() =>
      commitDeepenAnswer(s, script, { module: 'glossary', questionId: 'DS1a', subjectId: null, capabilityToken: '' })
    ).toThrow(/TURN_CAPABILITY_MISSING/);
  });

  it('module chưa opt-in', () => {
    expect(() =>
      commitDeepen(defaultDeepenState(), { module: 'glossary', questionId: 'DS1a', subjectId: null })
    ).toThrow(/chưa opt-in/);
  });

  it('question không thuộc module', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    expect(() =>
      commitDeepen(s, { module: 'glossary', questionId: 'DS2a', subjectId: null })
    ).toThrow(/không thuộc module/);
  });

  it('subjectId không khớp per_subject (none nhưng có subject)', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    expect(() =>
      commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: 'x' })
    ).toThrow(/per_subject:none/);
  });

  it('per_subject:must nhưng thiếu subjectId', () => {
    const s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    expect(() =>
      commitDeepen(s, { module: 'feature-spec', questionId: 'DS2a', subjectId: null })
    ).toThrow(/thiếu subjectId/);
  });

  it('instance đã commit', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    expect(() =>
      commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null })
    ).toThrow(/đã được commit/);
  });

  it('rerun trên instance chưa từng commit bị chặn', () => {
    const s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    const issued = issueTurnCapability(s.state_revision || 0, {
      sessionId: s.session_id || 'default-session',
      operationKind: 'deepen',
      questionId: 'DS1a',
      subjectId: null,
    });
    expect(() =>
      commitDeepenAnswer(
        { ...s, pending_turn_capability: issued.capability },
        script,
        { module: 'glossary', questionId: 'DS1a', subjectId: null, capabilityToken: issued.token, rerun: true }
      )
    ).toThrow(/chưa được commit — không thể rerun/);
  });

  it('rerun: generation tăng, supersedes trỏ đúng, entry cũ không bị xoá', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    const first = s.modules.glossary.answered.find((a) => a.question_id === 'DS1a')!;
    expect(first.generation).toBe(1);
    expect(first.supersedes).toBe(null);

    const issued = issueTurnCapability(s.state_revision || 0, {
      sessionId: s.session_id || 'default-session',
      operationKind: 'deepen',
      questionId: 'DS1a',
      subjectId: null,
    });
    s = commitDeepenAnswer(
      { ...s, pending_turn_capability: issued.capability },
      script,
      { module: 'glossary', questionId: 'DS1a', subjectId: null, capabilityToken: issued.token, rerun: true }
    );

    const entries = s.modules.glossary.answered.filter((a) => a.question_id === 'DS1a');
    expect(entries.length).toBe(2);
    const second = entries.find((a) => a.generation === 2)!;
    expect(second.supersedes).toBe(1);
    // Entry gốc (generation 1) vẫn còn nguyên trong lịch sử.
    expect(entries.some((a) => a.generation === 1)).toBe(true);
  });

  it('rerun không phá completeness: instance vẫn tính là answered', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1b', subjectId: null });
    const beforeRerun = canEmitModule(s, script, 'glossary', []);
    expect(beforeRerun.ok).toBe(true);

    const issued = issueTurnCapability(s.state_revision || 0, {
      sessionId: s.session_id || 'default-session',
      operationKind: 'deepen',
      questionId: 'DS1a',
      subjectId: null,
    });
    s = commitDeepenAnswer(
      { ...s, pending_turn_capability: issued.capability },
      script,
      { module: 'glossary', questionId: 'DS1a', subjectId: null, capabilityToken: issued.token, rerun: true }
    );
    expect(canEmitModule(s, script, 'glossary', []).ok).toBe(true);
  });

  it('replay của capability token đã tiêu thụ bị chặn', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    const issued = issueTurnCapability(s.state_revision || 0, {
      sessionId: s.session_id || 'default-session',
      operationKind: 'deepen',
      questionId: 'DS1a',
      subjectId: null,
    });
    s = { ...s, pending_turn_capability: issued.capability };
    s = commitDeepenAnswer(s, script, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: issued.token,
    });
    // Same (now-consumed) token reused for a different question must fail —
    // there is no more userTurnId-based bypass to fall back on (X17/R01).
    expect(() =>
      commitDeepenAnswer(s, script, {
        module: 'glossary',
        questionId: 'DS1b',
        subjectId: null,
        capabilityToken: issued.token,
      })
    ).toThrow(/TURN_CAPABILITY_REPLAY|TURN_CAPABILITY_WRONG_QUESTION/);
  });
});

describe('per-subject completeness', () => {
  const subjects = ['dang-nhap', 'tim-kiem'];

  it('DS2a của A không tính cho B; canEmitModule liệt kê missing theo instance', () => {
    let s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    // Trả đủ 3 câu cho A, chưa gì cho B.
    for (const q of ['DS2a', 'DS2b', 'DS2c']) {
      s = commitDeepen(s, { module: 'feature-spec', questionId: q, subjectId: 'dang-nhap' });
    }
    const res = canEmitModule(s, script, 'feature-spec', subjects);
    expect(res.ok).toBe(false);
    // Tất cả missing đều thuộc subject B.
    expect(res.missing.length).toBe(3);
    expect(res.missing.every((m) => m.subject_id === 'tim-kiem')).toBe(true);
  });

  it('đủ mọi instance → ok:true', () => {
    let s = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');
    for (const subj of subjects) {
      for (const q of ['DS2a', 'DS2b', 'DS2c']) {
        s = commitDeepen(s, { module: 'feature-spec', questionId: q, subjectId: subj });
      }
    }
    expect(canEmitModule(s, script, 'feature-spec', subjects).ok).toBe(true);
  });
});

describe('canEmitModule — stale', () => {
  it('emitted_at set + digest khác → stale; digest khớp → không stale', () => {
    let s = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    s = commitDeepen(s, { module: 'glossary', questionId: 'DS1b', subjectId: null });
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
    expect(subjects).toEqual(['dang-nhap', 'tim-kiem']);
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

describe('transactDeepenStore', () => {
  it('happy path: mutator áp dụng và ghi xuống đĩa, trả về state đã mutate', () => {
    const dir = ws();
    const s0 = loadDeepenState(dir);
    const mutated = transactDeepenStore(dir, s0.state_revision || 0, (current) =>
      optInModule(current, 'glossary', 'explicit')
    );
    expect(mutated.modules.glossary.opted_in).toBe(true);
    expect(loadDeepenState(dir).modules.glossary.opted_in).toBe(true);
  });

  it('expectedRevision không khớp revision trên đĩa → REVISION_CONFLICT, không ghi', () => {
    const dir = ws();
    saveDeepenState(dir, { ...defaultDeepenState(), state_revision: 5 });
    expect(() =>
      transactDeepenStore(dir, 0, (current) => optInModule(current, 'glossary', 'explicit'))
    ).toThrow(/REVISION_CONFLICT/);
    expect(loadDeepenState(dir).modules.glossary.opted_in).toBe(false);
  });

  it('sideEffect throw → transaction abort, deepen-state.json không đổi (fail closed)', () => {
    const dir = ws();
    const before = loadDeepenState(dir);
    expect(() =>
      transactDeepenStore(
        dir,
        before.state_revision || 0,
        (current) => optInModule(current, 'glossary', 'explicit'),
        () => {
          throw new Error('side effect failed');
        }
      )
    ).toThrow(/side effect failed/);
    expect(loadDeepenState(dir).modules.glossary.opted_in).toBe(false);
  });

  it('sideEffect chạy TRƯỚC saveDeepenState với state đã mutate', () => {
    const dir = ws();
    const before = loadDeepenState(dir);
    let sawOptedIn = false;
    transactDeepenStore(
      dir,
      before.state_revision || 0,
      (current) => optInModule(current, 'glossary', 'explicit'),
      (next) => {
        sawOptedIn = next.modules.glossary.opted_in;
      }
    );
    expect(sawOptedIn).toBe(true);
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
