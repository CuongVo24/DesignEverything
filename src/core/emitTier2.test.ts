import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, cpSync } from 'fs';
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
import { issueTurnCapability } from './turnCapability.js';
import { defaultDeepenState } from './schemas/deepenState.js';
import type { DeepenState, DeepenModuleId } from './schemas/deepenState.js';
import { loadExecutionState, saveExecutionState } from './advanceExecutionState.js';
import type { ExecutionState } from './schemas/executionState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = loadDeepenScript(join(__dirname, '../../Design/Content/interview-script/deepen-script.yaml'));
const GOLDEN_DOCS = join(__dirname, '../../Design/Content/golden-example-web/docs');

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
  // P7.2.3 — emitTier2 now stages/activates through the shared transaction
  // kernel, which needs a real compiled catalog (artifact-catalog.yaml +
  // script.yaml + shapes.yaml), not just docs/.
  const contentDir = join(ws, 'Design/Content');
  mkdirSync(contentDir, { recursive: true });
  cpSync(join(__dirname, '../../Design/Content'), contentDir, { recursive: true });
  return ws;
}

const baseAnswers: Record<string, string> = {
  S3: 'Must: Đăng nhập, Tìm kiếm. Should: Shopping List.',
  ...ARCH,
};

function baseExecState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    version: '1.0.0',
    phase: 'ready-to-execute',
    active_task: null,
    active_milestone: null,
    completed_tasks: [],
    evidence: [],
    block_reason: null,
    validated_plan_digest: 'digest',
    validated_docs_digest: 'digest',
    validation_result_digest: 'digest',
    plan_revision: 1,
    amendment_history: [],
    open_break_tasks: [],
    reviewed_milestones: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

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
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1b', subjectId: null });
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
    for (const subj of ['ng-nh-p', 't-m-ki-m']) {
      for (const q of ['DS2a', 'DS2b', 'DS2c']) {
        state = commitDeepen(state, { module: 'feature-spec', questionId: q, subjectId: subj });
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

  it('P7.2.3 — re-emitting module glossary does not touch module feature-spec\'s manifest/generation', () => {
    const answers: Record<string, string> = {
      ...baseAnswers,
      DS1a: 'Recipe, ShoppingList',
      DS1b: 'Định nghĩa',
      'DS2a@ng-nh-p': 'a',
      'DS2b@ng-nh-p': 'b',
      'DS2c@ng-nh-p': 'c',
      'DS2a@t-m-ki-m': 'a',
      'DS2b@t-m-ki-m': 'b',
      'DS2c@t-m-ki-m': 'c',
    };
    const ws = buildWorkspace(answers);
    let state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    state = optInModule(state, 'feature-spec', 'explicit');
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1b', subjectId: null });
    for (const subj of ['ng-nh-p', 't-m-ki-m']) {
      for (const q of ['DS2a', 'DS2b', 'DS2c']) {
        state = commitDeepen(state, { module: 'feature-spec', questionId: q, subjectId: subj });
      }
    }
    saveDeepenState(ws, state);

    const first = emitTier2({ workspace: ws, modules: ['glossary', 'feature-spec'], script, state });
    expect(first.emitted.map((e) => e.module).sort()).toEqual(['feature-spec', 'glossary']);

    const featureSpecManifestPath = join(ws, '.design-everything/emit-manifest-tier2-feature-spec.json');
    const glossaryManifestPath = join(ws, '.design-everything/emit-manifest-tier2-glossary.json');
    expect(existsSync(featureSpecManifestPath)).toBe(true);
    expect(existsSync(glossaryManifestPath)).toBe(true);
    const featureSpecManifestBefore = readFileSync(featureSpecManifestPath, 'utf8');
    const glossaryGenerationBefore = JSON.parse(readFileSync(glossaryManifestPath, 'utf8')).generation_id;

    // Re-emit glossary ONLY, with a changed glossary-affecting answer so it
    // actually produces a new generation.
    const state2 = loadDeepenState(ws);
    const answers2 = { ...answers, DS1a: 'Recipe, ShoppingList, Order' };
    writeFileSync(join(ws, 'Design/.interview/answers.json'), JSON.stringify(answers2));
    const second = emitTier2({ workspace: ws, modules: ['glossary'], script, state: state2 });
    expect(second.emitted[0].module).toBe('glossary');

    const glossaryGenerationAfter = JSON.parse(readFileSync(glossaryManifestPath, 'utf8')).generation_id;
    expect(glossaryGenerationAfter).not.toBe(glossaryGenerationBefore);

    // feature-spec's own manifest/generation must be completely untouched.
    const featureSpecManifestAfter = readFileSync(featureSpecManifestPath, 'utf8');
    expect(featureSpecManifestAfter).toBe(featureSpecManifestBefore);
    expect(existsSync(join(ws, 'docs/design/features/ng-nh-p.md'))).toBe(true);
    expect(existsSync(join(ws, 'docs/design/features/t-m-ki-m.md'))).toBe(true);
  });

  it('P7.2.5 — a plan-affecting module (test-strategy) invalidates execution state past plan-validating', () => {
    const ws = buildWorkspace(baseAnswers);
    const execStatePath = join(ws, '.design-everything/execution-state.json');
    mkdirSync(dirname(execStatePath), { recursive: true });
    saveExecutionState(execStatePath, baseExecState());

    let state = optInModule(defaultDeepenState(), 'test-strategy', 'explicit');
    state = commitDeepen(state, { module: 'test-strategy', questionId: 'DS4a', subjectId: null });
    state = commitDeepen(state, { module: 'test-strategy', questionId: 'DS4b', subjectId: null });
    saveDeepenState(ws, state);

    const res = emitTier2({ workspace: ws, modules: ['test-strategy'], script, state });
    expect(res.emitted[0]?.module).toBe('test-strategy');

    const after = loadExecutionState(execStatePath);
    expect(after.phase).toBe('blocked');
    expect(after.block_reason).toMatchObject({
      kind: 'snapshot-stale',
      reason_code: 'TIER2_PLAN_AFFECTING_CHANGE',
    });
  });

  it('P7.2.5 — a non-plan-affecting module (glossary) does not touch execution state', () => {
    const answers = { ...baseAnswers, DS1a: 'Recipe, ShoppingList', DS1b: 'Định nghĩa' };
    const ws = buildWorkspace(answers);
    const execStatePath = join(ws, '.design-everything/execution-state.json');
    mkdirSync(dirname(execStatePath), { recursive: true });
    saveExecutionState(execStatePath, baseExecState());

    let state = optInModule(defaultDeepenState(), 'glossary', 'explicit');
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1a', subjectId: null });
    state = commitDeepen(state, { module: 'glossary', questionId: 'DS1b', subjectId: null });
    saveDeepenState(ws, state);

    const res = emitTier2({ workspace: ws, modules: ['glossary'], script, state });
    expect(res.emitted[0]?.module).toBe('glossary');

    const after = loadExecutionState(execStatePath);
    expect(after.phase).toBe('ready-to-execute');
    expect(after.block_reason).toBeNull();
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
