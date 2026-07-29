import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { loadDeepenScript } from './loadDeepenScript.js';
import {
  loadDeepenState,
  saveDeepenState,
  listDeepenSubjects,
  expandQuestionInstances,
  optInModule,
  commitDeepenAnswer,
  canEmitModule,
  computeSourceDigest,
  type QuestionInstance,
} from './deepenState.js';
import { issueTurnCapability } from './turnCapability.js';
import { loadInterviewStore } from './interviewStore.js';
import { loadExecutionState } from './advanceExecutionState.js';
import { manifestPath } from './emitTransactionActivate.js';
import { emitManifestSchema, type EmitManifest, type ExecutionState, type DeepenModuleId } from './schemas/index.js';
import { canStartDeepen, type DeepenRuntimeSnapshot } from './deepenLifecycle.js';

export type DeepenServiceError = { ok: false; reason_code: string; message: string };

export interface DeepenModuleStatus {
  module: DeepenModuleId;
  opted_in: boolean;
  answered: number;
  expected: number;
  emitted_at: string | null;
  stale: boolean;
}

export interface DeepenNextSuccess {
  ok: true;
  module: DeepenModuleId;
  instance: QuestionInstance;
  question_text: string;
  capability_token: string;
}

export interface DeepenCommitArgs {
  module: DeepenModuleId;
  questionId: string;
  subjectId: string | null;
  capabilityToken: string;
  answerText: string;
}

const ALL_MODULES: DeepenModuleId[] = ['glossary', 'feature-spec', 'adr', 'test-strategy'];

function resolveDeepenScriptPath(workspace: string): string {
  return join(workspace, 'Design/Content/interview-script/deepen-script.yaml');
}

// Deliberate small duplicates of emitTier2.ts's private loadAnswers/
// loadTier1Docs helpers (same read-only, best-effort-on-missing shape) —
// this module needs the same inputs to compute subjects/instances/digests
// ahead of an actual emit, and emitTier2.ts does not export them.
function loadDeepenAnswers(workspace: string): Record<string, string> {
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

function loadTier1ManifestSafe(workspace: string): EmitManifest | null {
  const p = manifestPath(workspace, 'tier1');
  if (!existsSync(p)) return null;
  try {
    const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function loadExecutionStateSafe(workspace: string): ExecutionState | null {
  const p = join(workspace, '.design-everything/execution-state.json');
  if (!existsSync(p)) return null;
  try {
    return loadExecutionState(p);
  } catch {
    return null;
  }
}

function buildRuntimeSnapshot(workspace: string): { ok: true; snapshot: DeepenRuntimeSnapshot } | DeepenServiceError {
  try {
    const progress = loadInterviewStore(workspace).payload.progress;
    return {
      ok: true,
      snapshot: {
        progress,
        tier1Manifest: loadTier1ManifestSafe(workspace),
        executionState: loadExecutionStateSafe(workspace),
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      reason_code: 'PROGRESS_MISSING',
      message: `Không tải được canonical interview store: ${(err as Error).message}`,
    };
  }
}

function answerKey(questionId: string, subjectId: string | null): string {
  return subjectId ? `${questionId}@${subjectId}` : questionId;
}

/** Atomic tmp+rename, mirroring saveDeepenState's write discipline. */
function persistDeepenAnswerText(workspace: string, questionId: string, subjectId: string | null, answerText: string): void {
  const p = join(workspace, 'Design/.interview/answers.json');
  let current: Record<string, string> = {};
  if (existsSync(p)) {
    try {
      current = JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      current = {};
    }
  }
  current[answerKey(questionId, subjectId)] = answerText;
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(current, null, 2), 'utf8');
  renameSync(tmp, p);
}

export function listDeepenStatus(workspace: string): DeepenModuleStatus[] | DeepenServiceError {
  const scriptPath = resolveDeepenScriptPath(workspace);
  if (!existsSync(scriptPath)) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_MISSING', message: 'Không tìm thấy deepen-script.yaml.' };
  }
  let script;
  try {
    script = loadDeepenScript(scriptPath);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_INVALID', message: (err as Error).message };
  }
  const state = loadDeepenState(workspace);
  const answers = loadDeepenAnswers(workspace);
  const tier1Docs = loadTier1Docs(workspace);

  return ALL_MODULES.map((moduleId) => {
    const mod = state.modules[moduleId];
    const subjects = listDeepenSubjects(moduleId, { answers, tier1Docs });
    const expected = expandQuestionInstances(script, moduleId, subjects);
    const digest = computeSourceDigest(moduleId, { deepenAnswers: answers, tier1Docs });
    const can = canEmitModule(state, script, moduleId, subjects, digest);
    return {
      module: moduleId,
      opted_in: mod.opted_in,
      answered: expected.length - can.missing.length,
      expected: expected.length,
      emitted_at: mod.emitted_at,
      stale: can.stale,
    };
  });
}

export function optInDeepenModule(workspace: string, moduleId: DeepenModuleId): { ok: true } | DeepenServiceError {
  const snap = buildRuntimeSnapshot(workspace);
  if (!snap.ok) return snap;
  const gate = canStartDeepen(snap.snapshot, moduleId);
  if (!gate.allowed) {
    return { ok: false, reason_code: gate.reason_code, message: gate.message };
  }
  const state = loadDeepenState(workspace);
  saveDeepenState(workspace, optInModule(state, moduleId, 'explicit'));
  return { ok: true };
}

export function issueDeepenCapability(workspace: string, moduleId: DeepenModuleId): DeepenNextSuccess | DeepenServiceError {
  const snap = buildRuntimeSnapshot(workspace);
  if (!snap.ok) return snap;
  const gate = canStartDeepen(snap.snapshot, moduleId);
  if (!gate.allowed) {
    return { ok: false, reason_code: gate.reason_code, message: gate.message };
  }

  const scriptPath = resolveDeepenScriptPath(workspace);
  if (!existsSync(scriptPath)) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_MISSING', message: 'Không tìm thấy deepen-script.yaml.' };
  }
  let script;
  try {
    script = loadDeepenScript(scriptPath);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_INVALID', message: (err as Error).message };
  }

  const state = loadDeepenState(workspace);
  const mod = state.modules[moduleId];
  if (!mod.opted_in) {
    return {
      ok: false,
      reason_code: 'DEEPEN_NOT_OPTED_IN',
      message: `Module ${moduleId} chưa opt-in. Chạy "deepen --module ${moduleId} --opt-in" trước.`,
    };
  }

  const answers = loadDeepenAnswers(workspace);
  const tier1Docs = loadTier1Docs(workspace);
  const subjects = listDeepenSubjects(moduleId, { answers, tier1Docs });
  const instances = expandQuestionInstances(script, moduleId, subjects);
  const next = instances.find(
    (inst) => !mod.answered.some((a) => a.question_id === inst.question_id && a.subject_id === inst.subject_id)
  );
  if (!next) {
    return {
      ok: false,
      reason_code: 'DEEPEN_ALL_ANSWERED',
      message: `Mọi câu deepen của module ${moduleId} đã được trả lời. Chạy "deepen --module ${moduleId} --emit".`,
    };
  }

  const question = script.questions.find((q) => q.id === next.question_id)!;
  // Token is issued against the CURRENT (pre-bump) state_revision —
  // commitDeepenAnswer/verifyTurnCapability checks expected_revision against
  // state.state_revision as it stands before commit bumps it, not after.
  const issued = issueTurnCapability(state.state_revision || 0, {
    sessionId: state.session_id || 'default-session',
    operationKind: 'deepen',
    questionId: next.question_id,
    subjectId: next.subject_id,
  });
  saveDeepenState(workspace, { ...state, pending_turn_capability: issued.capability });

  return {
    ok: true,
    module: moduleId,
    instance: next,
    question_text: question.ask,
    capability_token: issued.token,
  };
}

export function commitDeepen(workspace: string, args: DeepenCommitArgs): { ok: true } | DeepenServiceError {
  const scriptPath = resolveDeepenScriptPath(workspace);
  if (!existsSync(scriptPath)) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_MISSING', message: 'Không tìm thấy deepen-script.yaml.' };
  }
  let script;
  try {
    script = loadDeepenScript(scriptPath);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'DEEPEN_SCRIPT_INVALID', message: (err as Error).message };
  }

  const state = loadDeepenState(workspace);
  let updated;
  try {
    updated = commitDeepenAnswer(state, script, {
      module: args.module,
      questionId: args.questionId,
      subjectId: args.subjectId,
      capabilityToken: args.capabilityToken,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    // commitDeepenAnswer's own capability-failure messages carry an
    // explicit `(TURN_CAPABILITY_*)` code — extract it verbatim so the CLI
    // surfaces the exact same typed reason as the interview commit path.
    const codeMatch = msg.match(/\(([A-Z_]+)\)/);
    if (codeMatch) {
      return { ok: false, reason_code: codeMatch[1], message: msg };
    }
    if (/chưa opt-in/.test(msg)) {
      return { ok: false, reason_code: 'DEEPEN_NOT_OPTED_IN', message: msg };
    }
    if (/đã được commit trước đó/.test(msg)) {
      return { ok: false, reason_code: 'DEEPEN_ANSWER_ALREADY_COMMITTED', message: msg };
    }
    return { ok: false, reason_code: 'DEEPEN_COMMIT_REJECTED', message: msg };
  }

  saveDeepenState(workspace, updated);
  persistDeepenAnswerText(workspace, args.questionId, args.subjectId, args.answerText);
  return { ok: true };
}
