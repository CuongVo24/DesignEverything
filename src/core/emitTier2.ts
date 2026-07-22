import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, renameSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
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

export interface EmitTier2Result {
  emitted: { module: DeepenModuleId; files: string[]; warnings: ConsistencyIssue[]; removed?: string[] }[];
  skipped: {
    module: DeepenModuleId;
    reason: 'not-opted-in' | 'missing-answers' | 'consistency-error';
    missing?: QuestionInstance[];
    issues?: ConsistencyIssue[];
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

/** Ghi atomic một file (tmp cùng thư mục + rename), tự tạo thư mục cha. */
function writeAtomic(absPath: string, content: string): void {
  mkdirSync(dirname(absPath), { recursive: true });
  const tmp = `${absPath}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, absPath);
}

/**
 * Emit tầng 2, all-or-nothing theo module. Thứ tự BẮT BUỘC: check opt-in/đủ câu →
 * render thuần → consistency → chỉ khi sạch error mới ghi file + cập nhật state.
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

    // (5) sạch lỗi → ghi file, dọn file mồ côi theo manifest, cập nhật state.
    const newPaths = artifacts.map((a) => a.path);
    for (const art of artifacts) {
      writeAtomic(join(workspace, 'docs', art.path), art.content);
    }
    const removed: string[] = [];
    for (const old of mod.artifacts) {
      if (!newPaths.includes(old)) {
        const abs = join(workspace, 'docs', old);
        if (existsSync(abs)) {
          rmSync(abs);
          removed.push(old);
        }
      }
    }

    mod.emitted_at = new Date().toISOString();
    mod.source_digest = digest;
    mod.artifacts = newPaths;
    stateChanged = true;

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
