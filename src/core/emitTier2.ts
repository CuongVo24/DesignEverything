import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { DeepenScript, DeepenModuleId } from './schemas/deepenScript.js';
import type { DeepenState } from './schemas/deepenState.js';
import type { RenderedArtifact, ConsistencyIssue, Tier2RenderInput } from './schemas/tier2Render.js';
import type { QuestionInstance } from './deepenState.js';
import {
  saveDeepenState,
  listDeepenSubjects,
  canEmitModule,
  computeSourceDigest,
} from './deepenState.js';
import { checkTier2Consistency } from './checkDocsConsistency.js';
import { renderGlossary } from './renderGlossary.js';
import { renderFeatureSpec } from './renderFeatureSpec.js';
import { renderAdr } from './renderAdr.js';
import { renderTestStrategy } from './renderTestStrategy.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { prepareEmit, type StagedGeneration } from './emitTransactionStage.js';
import { activateEmit, manifestPath, type EmitChannel } from './emitTransactionActivate.js';
import { emitManifestSchema } from './schemas/emitManifest.js';
import type { EmittedDoc } from './emit.js';
import { loadExecutionState, saveExecutionState } from './advanceExecutionState.js';
import { isPlanAffectingModule, invalidateSnapshotForTier2 } from './deepenLifecycle.js';

export type EmitTier2SkipReason =
  | 'not-opted-in'
  | 'missing-answers'
  | 'consistency-error'
  | 'catalog-load-failed'
  | 'stage-failed'
  | 'activation-blocked';

export interface EmitTier2Result {
  emitted: { module: DeepenModuleId; files: string[]; warnings: ConsistencyIssue[]; removed?: string[] }[];
  skipped: {
    module: DeepenModuleId;
    reason: EmitTier2SkipReason;
    missing?: QuestionInstance[];
    issues?: ConsistencyIssue[];
    detail?: string;
  }[];
}

const RENDERERS: Record<DeepenModuleId, (input: Tier2RenderInput) => RenderedArtifact[]> = {
  glossary: renderGlossary,
  'feature-spec': renderFeatureSpec,
  adr: renderAdr,
  'test-strategy': renderTestStrategy,
};

function loadAnswers(workspace: string): Record<string, string> {
  const p = join(workspace, 'Design/.interview/answers.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function loadTier1Docs(workspace: string): Record<string, string> {
  const root = join(workspace, 'docs');
  const out: Record<string, string> = {};
  if (!existsSync(root)) return out;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const fp = join(dir, name);
      if (statSync(fp).isDirectory()) walk(fp);
      else if (name.endsWith('.md')) {
        const rel = fp.slice(join(workspace, '').length).replace(/\\/g, '/').replace(/^\/*/, '');
        out[rel] = readFileSync(fp, 'utf8');
      }
    }
  };
  walk(root);
  return out;
}

// Each module gets its own manifest/journal/backup namespace (P7.2.1) so
// re-emitting one module's docs can never treat another module's managed
// files as stale, and each module's activation is independently CAS-guarded.
function tier2ChannelFor(module: DeepenModuleId): EmitChannel {
  return `tier2-${module}`;
}

/**
 * Emit tầng 2, all-or-nothing theo module. Thứ tự BẮT BUỘC: check opt-in/đủ câu →
 * render thuần → consistency → chỉ khi sạch mới stage → activate qua transaction
 * kernel dùng chung với tier-1 (prepareEmit/activateEmit — stage→CAS-guarded
 * backup→promote→manifest, không còn writeFileSync loop trực tiếp vào docs/ sống).
 *
 * Deliberately does NOT call tier-1's validateStagedEmit: that function's
 * catalog-completeness check is hardcoded to tier:1, and its cross-doc
 * consistency check is tier-1-shaped. Tier-2 already has its own gate
 * (checkTier2Consistency) run before staging even begins.
 */
export function emitTier2(args: {
  workspace: string;
  modules: DeepenModuleId[];
  script: DeepenScript;
  state: DeepenState;
}): EmitTier2Result {
  const { workspace, modules, script } = args;
  const state: DeepenState = structuredClone(args.state);
  const answers = loadAnswers(workspace);
  const tier1Docs = loadTier1Docs(workspace);

  const result: EmitTier2Result = { emitted: [], skipped: [] };
  let stateChanged = false;

  for (const module of modules) {
    const mod = state.modules[module];
    if (!mod.opted_in) {
      result.skipped.push({ module, reason: 'not-opted-in' });
      continue;
    }

    const subjects = listDeepenSubjects(module, { answers, tier1Docs });
    const digest = computeSourceDigest(module, { deepenAnswers: answers, tier1Docs });
    const can = canEmitModule(state, script, module, subjects, digest);
    if (!can.ok) {
      result.skipped.push({ module, reason: 'missing-answers', missing: can.missing });
      continue;
    }

    // (2) render thuần trong bộ nhớ.
    const artifacts = RENDERERS[module]({ answers, profile: null, tier1Docs, subjects });

    // (3) consistency trên bản render (chưa ghi đĩa).
    const issues = checkTier2Consistency(artifacts, tier1Docs, answers);
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      result.skipped.push({ module, reason: 'consistency-error', issues });
      continue;
    }

    let catalog;
    try {
      catalog = loadRuntimeCatalogFor(workspace);
    } catch (err: unknown) {
      result.skipped.push({ module, reason: 'catalog-load-failed', detail: (err as Error).message });
      continue;
    }

    const channel = tier2ChannelFor(module);
    const docs: EmittedDoc[] = artifacts.map((a) => ({ file: a.path, content: a.content }));

    let generation: StagedGeneration;
    try {
      generation = prepareEmit(workspace, { docs, shape: module, inputDigest: digest }, catalog);
    } catch (err: unknown) {
      result.skipped.push({ module, reason: 'stage-failed', detail: (err as Error).message });
      continue;
    }

    const manifestFile = manifestPath(workspace, channel);
    let expectedRevision: string | null = null;
    if (existsSync(manifestFile)) {
      const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(manifestFile, 'utf8')));
      if (parsed.success) {
        expectedRevision = parsed.data.generation_id;
      }
    }

    const activation = activateEmit(workspace, generation, expectedRevision, channel);
    if (activation.status === 'blocked') {
      result.skipped.push({
        module,
        reason: 'activation-blocked',
        detail: `${activation.reason}: ${activation.details.join('; ')}`,
      });
      continue;
    }

    // (5) sạch lỗi + activated → cập nhật state. Xoá file mồ côi giờ do
    // activateEmit tự làm (diff staleManagedPaths so với manifest active
    // TRƯỚC của đúng channel này); `removed` ở đây chỉ để báo cáo, so với
    // danh sách DeepenState đã ghi nhận trước đó.
    const newPaths = artifacts.map((a) => a.path);
    const removed = mod.artifacts.filter((p) => !newPaths.includes(p));

    mod.emitted_at = new Date().toISOString();
    mod.source_digest = digest;
    mod.artifacts = newPaths;
    stateChanged = true;

    // (6) P7.2.5 — a plan-affecting module (adr/test-strategy) that just
    // activated can contradict architecture/test assumptions a validated
    // execution plan relied on. invalidateSnapshotForTier2 already existed
    // (deepenLifecycle.ts) and was fully unit-tested, but had zero
    // production caller — this is its first one. Best-effort: no
    // execution-state.json yet (build hasn't started) is not an error.
    if (isPlanAffectingModule(module)) {
      const execStatePath = join(workspace, '.design-everything/execution-state.json');
      if (existsSync(execStatePath)) {
        try {
          const execState = loadExecutionState(execStatePath);
          const invalidated = invalidateSnapshotForTier2(execState, module);
          if (invalidated !== execState) {
            saveExecutionState(execStatePath, invalidated);
          }
        } catch {
          // Corrupt/unreadable execution state is a separate concern
          // (surfaced by health checks elsewhere) — must never block an
          // otherwise-successful tier-2 activation.
        }
      }
    }

    result.emitted.push({
      module,
      files: newPaths,
      warnings: issues.filter((i) => i.severity === 'warning'),
      ...(removed.length > 0 ? { removed } : {}),
    });
  }

  if (stateChanged) saveDeepenState(workspace, state);
  return result;
}
