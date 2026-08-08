import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { loadDeepenScript } from './loadDeepenScript.js';
import {
  loadDeepenState,
  transactDeepenStore,
  listDeepenSubjects,
  expandQuestionInstances,
  optInModule,
  commitDeepenAnswer,
  canEmitModule,
  computeSourceDigest,
  fillTargetDoc,
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

const ANSWER_HISTORY_REL_PATH = 'Design/.interview/deepen-answer-history.json';

export interface DeepenAnswerHistoryEntry {
  module: DeepenModuleId;
  question_id: string;
  subject_id: string | null;
  generation: number;
  value: string;
  committed_at: string;
}

/**
 * B3e §3 — "raw confirmed answer cũ không bị overwrite." answers.json still
 * holds only the CURRENT value per instance (every existing reader —
 * emitTier2, renderers, computeSourceDigest — keeps working off that flat
 * projection unchanged); this append-only log is where the generation this
 * value is replacing stays readable forever. Same best-effort-on-corrupt
 * shape as emitTier1.ts's WARNING_ACK log: a corrupt history file starts a
 * fresh array rather than blocking the commit that's about to append to it.
 */
function appendDeepenAnswerHistory(workspace: string, entry: DeepenAnswerHistoryEntry): void {
  const p = join(workspace, ANSWER_HISTORY_REL_PATH);
  let existing: unknown[] = [];
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
  }
  existing.push(entry);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
  renameSync(tmp, p);
}

/**
 * Atomic tmp+rename, mirroring saveDeepenState's write discipline. Appends
 * to the history log BEFORE overwriting the current-value projection, so a
 * reader can never observe a new current value without its generation
 * already being in history.
 */
function persistDeepenAnswerText(
  workspace: string,
  module: DeepenModuleId,
  questionId: string,
  subjectId: string | null,
  answerText: string,
  generation: number
): void {
  appendDeepenAnswerHistory(workspace, {
    module,
    question_id: questionId,
    subject_id: subjectId,
    generation,
    value: answerText,
    committed_at: new Date().toISOString(),
  });
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

/** Shared error-shape mapping for both first-commit and rerun failures. */
function mapDeepenCommitError(err: unknown): DeepenServiceError {
  const msg = (err as Error).message;
  // commitDeepenAnswer's own capability-failure messages carry an explicit
  // `(TURN_CAPABILITY_*)` code — extract it verbatim so the CLI surfaces the
  // exact same typed reason as the interview commit path.
  const codeMatch = msg.match(/\(([A-Z_]+)\)/);
  if (codeMatch) {
    return { ok: false, reason_code: codeMatch[1], message: msg };
  }
  if (/chưa opt-in/.test(msg)) {
    return { ok: false, reason_code: 'DEEPEN_NOT_OPTED_IN', message: msg };
  }
  if (/chưa được commit — không thể rerun/.test(msg)) {
    return { ok: false, reason_code: 'DEEPEN_RERUN_NOT_YET_ANSWERED', message: msg };
  }
  if (/đã được commit trước đó/.test(msg)) {
    return { ok: false, reason_code: 'DEEPEN_ANSWER_ALREADY_COMMITTED', message: msg };
  }
  return { ok: false, reason_code: 'DEEPEN_COMMIT_REJECTED', message: msg };
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
  transactDeepenStore(workspace, state.state_revision || 0, (current) => optInModule(current, moduleId, 'explicit'));
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
  // B3e §3 — capability issuance is one of the deepen-state.json writers the
  // shared workspace lock/CAS now covers (same as opt-in and commit below),
  // so it can never race a concurrent deepen or interview mutation.
  transactDeepenStore(workspace, state.state_revision || 0, (current) => ({
    ...current,
    pending_turn_capability: issued.capability,
  }));

  return {
    ok: true,
    module: moduleId,
    instance: next,
    question_text: question.ask,
    capability_token: issued.token,
  };
}

/**
 * B3e §3 — issues a capability to RERUN an already-answered instance
 * (as opposed to issueDeepenCapability, which only finds the next
 * NOT-yet-answered one). Requires the instance to already have at least one
 * committed generation; the actual amendment happens in rerunDeepen.
 */
export function issueDeepenRerunCapability(
  workspace: string,
  moduleId: DeepenModuleId,
  questionId: string,
  subjectId: string | null
): DeepenNextSuccess | DeepenServiceError {
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

  const question = script.questions.find((q) => q.id === questionId);
  if (!question || question.module !== moduleId) {
    return {
      ok: false,
      reason_code: 'DEEPEN_QUESTION_NOT_FOUND',
      message: `Câu ${questionId} không thuộc module ${moduleId}.`,
    };
  }
  const alreadyAnswered = mod.answered.some(
    (a) => a.question_id === questionId && a.subject_id === subjectId
  );
  if (!alreadyAnswered) {
    return {
      ok: false,
      reason_code: 'DEEPEN_RERUN_NOT_YET_ANSWERED',
      message: `Instance ${questionId}@${subjectId ?? '-'} chưa từng commit — không thể rerun. Dùng "deepen --module ${moduleId} --next" để commit lần đầu.`,
    };
  }

  const instance: QuestionInstance = {
    module: moduleId,
    question_id: questionId,
    subject_id: subjectId,
    target_doc: subjectId ? fillTargetDoc(question, subjectId) : question.target_doc,
  };

  const issued = issueTurnCapability(state.state_revision || 0, {
    sessionId: state.session_id || 'default-session',
    operationKind: 'deepen',
    questionId,
    subjectId,
  });
  transactDeepenStore(workspace, state.state_revision || 0, (current) => ({
    ...current,
    pending_turn_capability: issued.capability,
  }));

  return {
    ok: true,
    module: moduleId,
    instance,
    question_text: question.ask,
    capability_token: issued.token,
  };
}

/**
 * B3e §3 — "Mỗi deepen commit cần transaction B1b... capability consumption,
 * answer append, module/question advance và provenance update phải nằm
 * trong cùng canonical B1b transaction/revision." commitDeepenAnswer (the
 * capability check + state mutation) now runs INSIDE transactDeepenStore's
 * mutator against a freshly lock-reloaded state — not against a snapshot
 * read before the lock was taken — so a concurrent writer can never slip a
 * change in between "decide" and "write". persistDeepenAnswerText runs as
 * the sideEffect, inside the same lock, before deepen-state.json is
 * written: if it throws, the whole transaction aborts and the capability
 * stays unconsumed (retryable) instead of leaving state marked
 * answered/consumed with the answer text never persisted.
 */
function commitOrRerunDeepen(
  workspace: string,
  args: DeepenCommitArgs,
  rerun: boolean
): { ok: true; generation: number } | DeepenServiceError {
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

  const preState = loadDeepenState(workspace);
  let commitError: DeepenServiceError | null = null;
  let generation = 0;

  try {
    transactDeepenStore(
      workspace,
      preState.state_revision || 0,
      (current) => {
        try {
          const updated = commitDeepenAnswer(current, script, {
            module: args.module,
            questionId: args.questionId,
            subjectId: args.subjectId,
            capabilityToken: args.capabilityToken,
            rerun,
          });
          generation = updated.modules[args.module].answered.at(-1)!.generation;
          return updated;
        } catch (err: unknown) {
          commitError = mapDeepenCommitError(err);
          throw err;
        }
      },
      () => {
        persistDeepenAnswerText(workspace, args.module, args.questionId, args.subjectId, args.answerText, generation);
      }
    );
  } catch (err: unknown) {
    if (commitError) return commitError;
    // REVISION_CONFLICT or any other transaction-level failure (lock
    // timeout, corrupt state) — not a commitDeepenAnswer rejection.
    return { ok: false, reason_code: 'DEEPEN_COMMIT_REJECTED', message: (err as Error).message };
  }

  return { ok: true, generation };
}

export function commitDeepen(workspace: string, args: DeepenCommitArgs): { ok: true } | DeepenServiceError {
  const result = commitOrRerunDeepen(workspace, args, false);
  if (!result.ok) return result;
  return { ok: true };
}

/**
 * B3e §3 — "Re-run module là amendment/version mới... mỗi rerun tạo
 * generation/version mới có supersedes, giữ history/provenance và một
 * current pointer tới generation active; raw confirmed answer cũ không bị
 * overwrite." Requires a capability issued via issueDeepenRerunCapability
 * (issueDeepenCapability's capability can't target an already-answered
 * instance at all). Returns the new generation number so a caller can
 * report/display it.
 */
export function rerunDeepen(
  workspace: string,
  args: DeepenCommitArgs
): { ok: true; generation: number } | DeepenServiceError {
  return commitOrRerunDeepen(workspace, args, true);
}
