import { expect, test, describe, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'fs';
import {
  loadDeepenScript,
  loadDeepenState,
  optInModule,
  commitDeepenAnswer,
  expandQuestionInstances,
  listDeepenSubjects,
  canEmitModule,
  computeSourceDigest,
  emitTier2,
  renderNextStep,
} from '../../src/core/index.js';
import { defaultDeepenState } from '../../src/core/schemas/deepenState.js';
import type { DeepenState } from '../../src/core/schemas/deepenState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const GOLDEN_DOCS = join(projectRoot, 'Design/Content/golden-example-web/docs');
const script = loadDeepenScript(join(projectRoot, 'Design/Content/interview-script/deepen-script.yaml'));
const ws = join(__dirname, '../fixtures/progress/e2e-deepen-workspace');

const answers: Record<string, string> = {
  S3: 'Must: Đăng nhập, Tìm kiếm. Should: Shopping List.',
  data_sensitivity_and_security: 'Chỉ thông tin đăng nhập',
  expected_scale_and_performance: 'Vài trăm user',
  client_and_rendering_strategy: 'Next.js SSR',
  architecture_overview: 'Responsive',
  auth_and_access_strategy: 'NextAuth',
  realtime_push_or_sync_strategy: 'Không realtime',
};

function setup(ans: Record<string, string>): void {
  rmSync(ws, { recursive: true, force: true });
  const copy = (src: string, rel: string) => {
    for (const name of readdirSync(src)) {
      const fp = join(src, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(fp).isDirectory()) copy(fp, r);
      else {
        const dest = join(ws, 'docs', r);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, readFileSync(fp, 'utf8'));
      }
    }
  };
  copy(GOLDEN_DOCS, '');
  mkdirSync(join(ws, 'Design/.interview'), { recursive: true });
  writeFileSync(join(ws, 'Design/.interview/answers.json'), JSON.stringify(ans, null, 2));
}

function tier1Docs(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      const fp = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(fp).isDirectory()) walk(fp, r);
      else if (name.endsWith('.md')) out[`docs/${r}`] = readFileSync(fp, 'utf8');
    }
  };
  walk(join(ws, 'docs'), '');
  return out;
}

describe('E2E deepen flow', () => {
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  test('happy path: opt-in feature-spec → commit đủ 2 Must → emit ra 2 file đúng slug', () => {
    setup(answers);
    const docs = tier1Docs();
    let state: DeepenState = optInModule(defaultDeepenState(), 'feature-spec', 'explicit');

    const subjects = listDeepenSubjects('feature-spec', { answers, tier1Docs: docs });
    expect(subjects.sort()).toEqual(['ng-nh-p', 't-m-ki-m']);

    // Mô phỏng --next/--commit từng instance.
    const instances = expandQuestionInstances(script, 'feature-spec', subjects);
    let turn = 0;
    for (const inst of instances) {
      state = commitDeepenAnswer(state, script, {
        module: 'feature-spec',
        questionId: inst.question_id,
        subjectId: inst.subject_id,
        userTurnId: `t${turn++}`,
      });
      writeFileSync(
        join(ws, 'Design/.interview/answers.json'),
        JSON.stringify(
          { ...answers, [`${inst.question_id}@${inst.subject_id}`]: `Trả lời ${inst.question_id} cho ${inst.subject_id}` },
          null,
          2
        )
      );
    }
    // Ghi lại đầy đủ answers cho emit.
    const full = { ...answers };
    for (const inst of instances) full[`${inst.question_id}@${inst.subject_id}`] = `Trả lời ${inst.question_id} cho ${inst.subject_id}`;
    writeFileSync(join(ws, 'Design/.interview/answers.json'), JSON.stringify(full, null, 2));

    const digest = computeSourceDigest('feature-spec', { deepenAnswers: full, tier1Docs: docs });
    expect(canEmitModule(state, script, 'feature-spec', subjects, digest).ok).toBe(true);

    const res = emitTier2({ workspace: ws, modules: ['feature-spec'], script, state });
    expect(res.emitted[0].files.sort()).toEqual(['design/features/ng-nh-p.md', 'design/features/t-m-ki-m.md']);
    expect(existsSync(join(ws, 'docs/design/features/ng-nh-p.md'))).toBe(true);
    expect(existsSync(join(ws, 'docs/design/features/t-m-ki-m.md'))).toBe(true);
    expect(loadDeepenState(ws).modules['feature-spec'].emitted_at).not.toBeNull();
  });

  test('thiếu câu → emit bị chặn (missing-answers), không sinh file', () => {
    setup(answers);
    const state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    const res = emitTier2({ workspace: ws, modules: ['glossary'], script, state });
    expect(res.skipped[0].reason).toBe('missing-answers');
    expect(existsSync(join(ws, 'docs/design/glossary.md'))).toBe(false);
  });

  test('workspace không opt-in: không sinh docs/design, không card deepen', () => {
    setup(answers);
    const res = emitTier2({ workspace: ws, modules: ['glossary', 'feature-spec', 'adr', 'test-strategy'], script, state: defaultDeepenState() });
    expect(res.emitted.length).toBe(0);
    expect(existsSync(join(ws, 'docs/design'))).toBe(false);

    const cardNoDeepen = renderNextStep(null, null, null, []);
    expect(cardNoDeepen.state).not.toBe('deepen');
  });

  test('renderNextStep: card deepen chỉ hiện khi có module opted_in dở dang', () => {
    const withPending = renderNextStep(null, null, null, ['glossary']);
    expect(withPending.state).toBe('deepen');
    expect(withPending.enforcement).toBe('soft');
    expect(withPending.nextCommand).toContain('deepen --module glossary --emit');
  });
});
