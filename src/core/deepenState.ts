import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  deepenStateSchema,
  defaultDeepenState,
  type DeepenState,
  type DeepenModuleId,
} from './schemas/deepenState.js';
import type { DeepenScript, DeepenQuestion } from './schemas/deepenScript.js';
import { extractMustFeatures } from './validatePlan.js';
import { slugifyList } from './slugify.js';
import { collectDecisions } from './renderDecisionLog.js';
import { verifyTurnCapability } from './turnCapability.js';
import { acquireLock, releaseLock } from './interviewStore.js';

const STATE_REL_PATH = '.design-everything/deepen-state.json';

export interface QuestionInstance {
  module: DeepenModuleId;
  question_id: string;
  subject_id: string | null;
  target_doc: string | null;
}

/** Nguồn mỗi module đọc — dùng cho computeSourceDigest và (sau này) renderer B20b. */
const MODULE_SOURCES: Record<DeepenModuleId, { docs: string[]; dsPrefix: string }> = {
  glossary: { docs: ['03-data-model.md'], dsPrefix: 'DS1' },
  'feature-spec': { docs: ['02-scope.md', '04-flows.md'], dsPrefix: 'DS2' },
  adr: { docs: ['05-architecture.md'], dsPrefix: 'DS3' },
  'test-strategy': { docs: ['04-flows.md', 'conventions/test-tiers.md'], dsPrefix: 'DS4' },
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function loadDeepenState(workspace: string): DeepenState {
  const path = join(workspace, STATE_REL_PATH);
  if (!existsSync(path)) return defaultDeepenState();
  try {
    const parsed = deepenStateSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    if (!parsed.success) {
      console.warn(`deepen-state.json không hợp lệ tại ${path}; dùng state mặc định.`);
      return defaultDeepenState();
    }
    return parsed.data;
  } catch (error: unknown) {
    console.warn(`Không đọc được deepen-state.json (${(error as Error).message}); dùng state mặc định.`);
    return defaultDeepenState();
  }
}

/** Ghi atomic: tmp cùng thư mục rồi rename đè — không bao giờ để file dở dang. */
export function saveDeepenState(workspace: string, state: DeepenState): void {
  const path = join(workspace, STATE_REL_PATH);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  renameSync(tmp, path);
}

/**
 * B3e §3 — "Mỗi deepen commit cần transaction B1b... không tạo một authority
 * store thứ hai." Before this, every deepen-state.json writer (opt-in,
 * capability issue, commit) did its own unprotected load -> mutate -> save
 * with no compare-and-swap and no lock — two concurrent writers could race
 * a lost update exactly like interview-state.json could before B1b's
 * transactInterviewStore existed. This reuses that SAME workspace lock
 * (interviewStore.ts's acquireLock/releaseLock, `.design-everything/
 * interview-state.lock`) rather than inventing a second lock file, so an
 * interview commit and a deepen commit can never race each other either —
 * one shared serialization point for every canonical-state write in the
 * workspace, matching the checklist's "không tạo một authority store thứ
 * hai" instead of merely relocating the race into a deepen-only lock.
 *
 * `sideEffect` runs INSIDE the lock, after `mutator` computes the next
 * state but BEFORE it is durably written — so a caller that also needs to
 * persist something else in the same logical commit (commitDeepen's
 * answers.json write) fails closed in the safe direction: if the side
 * effect throws, deepen-state.json is never updated, so the capability
 * stays unconsumed and the instance stays uncommitted (retryable). The
 * previous, unprotected ordering could do the opposite — state marked
 * answered/capability consumed with the answer text write still pending —
 * which is unrecoverable (`commitDeepenAnswer` rejects a second commit of
 * an already-answered instance).
 */
export function transactDeepenStore(
  workspaceRoot: string,
  expectedRevision: number,
  mutator: (state: DeepenState) => DeepenState,
  sideEffect?: (nextState: DeepenState) => void
): DeepenState {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error(
      `INVALID_EXPECTED_REVISION: expectedRevision must be a non-negative integer, got ${String(expectedRevision)}`
    );
  }
  const lockNonce = acquireLock(workspaceRoot);
  try {
    const current = loadDeepenState(workspaceRoot);
    const currentRevision = current.state_revision || 0;
    if (currentRevision !== expectedRevision) {
      throw new Error(
        `REVISION_CONFLICT: Expected deepen state revision ${expectedRevision}, but found ${currentRevision}`
      );
    }
    const mutated = mutator(current);
    if (sideEffect) sideEffect(mutated);
    saveDeepenState(workspaceRoot, mutated);
    return mutated;
  } finally {
    releaseLock(workspaceRoot, lockNonce);
  }
}

// ---------------------------------------------------------------------------
// Subjects & instances
// ---------------------------------------------------------------------------

function asAnswerRecord(answers: unknown): Record<string, string> {
  if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    return answers as Record<string, string>;
  }
  return {};
}

/** Suy hình-hài từ các file phát hành 07-* đã emit trong tier1Docs. */
export function deriveBranch(tier1Docs: Record<string, string>): string {
  const has = (name: string) => Object.keys(tier1Docs).some((p) => p.replace(/\\/g, '/').endsWith(name));
  const web = has('07-deployment.md');
  const mobile = has('07-release.md');
  const cli = has('07-distribution.md');
  if (web && mobile) return 'hybrid';
  if (web) return 'web';
  if (mobile) return 'mobile';
  if (cli) return 'cli';
  return 'web';
}

export function listDeepenSubjects(
  module: DeepenModuleId,
  input: { answers: unknown; tier1Docs: Record<string, string> }
): string[] {
  const answers = asAnswerRecord(input.answers);
  if (module === 'feature-spec') {
    return slugifyList(extractMustFeatures(answers));
  }
  if (module === 'adr') {
    const branch = deriveBranch(input.tier1Docs ?? {});
    const decisions = collectDecisions({ branch, slots: answers }).filter(
      (d) => d.detail_doc === '05-architecture.md' && d.value.trim().length > 0
    );
    return decisions.map((_, i) => `adr-${String(i + 1).padStart(3, '0')}`);
  }
  // glossary | test-strategy → per_subject: none
  return [];
}

/**
 * Sinh danh sách instance NỘI DUNG của một module. Chỉ câu `kind: anchored` sinh
 * nội dung/anchor; câu `kind: meta` (DS0-*) là cổng opt-in, không neo doc → loại khỏi
 * completeness và render.
 */
export function expandQuestionInstances(
  script: DeepenScript,
  module: DeepenModuleId,
  subjects: string[]
): QuestionInstance[] {
  const questions = script.questions.filter((q) => q.module === module && q.kind !== 'meta');
  const instances: QuestionInstance[] = [];
  for (const q of questions) {
    if (q.per_subject === 'none') {
      instances.push({ module, question_id: q.id, subject_id: null, target_doc: q.target_doc });
    } else {
      for (const subject of subjects) {
        instances.push({
          module,
          question_id: q.id,
          subject_id: subject,
          target_doc: fillTargetDoc(q, subject),
        });
      }
    }
  }
  return instances;
}

/** Thay {subject-slug}/{NNN} trong target_doc của một câu per_subject. */
export function fillTargetDoc(q: DeepenQuestion, subject: string): string | null {
  if (!q.target_doc) return null;
  let doc = q.target_doc.replace(/\{subject-slug\}/g, subject);
  const nnn = subject.match(/(\d{3})$/);
  if (nnn) doc = doc.replace(/\{NNN\}/g, nnn[1]);
  return doc;
}

// ---------------------------------------------------------------------------
// State transitions (pure)
// ---------------------------------------------------------------------------

export function optInModule(
  state: DeepenState,
  module: DeepenModuleId,
  activation: 'explicit' | 'condition'
): DeepenState {
  const next: DeepenState = structuredClone(state);
  const mod = next.modules[module];
  mod.opted_in = true;
  // opt-in idempotent — không reset answered; chỉ set activation lần đầu.
  if (mod.activation === null) mod.activation = activation;
  return next;
}

export function commitDeepenAnswer(
  state: DeepenState,
  script: DeepenScript,
  args: {
    module: DeepenModuleId;
    questionId: string;
    subjectId: string | null;
    capabilityToken: string;
    /**
     * B3e §3 — false/omitted (default) is the original one-shot commit:
     * rejects if this instance was ever answered before. true is an
     * explicit amendment: requires a prior answer to exist and pushes a
     * NEW generation rather than rejecting or overwriting it — the old
     * entry stays in `answered` untouched.
     */
    rerun?: boolean;
  }
): DeepenState {
  const mod = state.modules[args.module];
  if (!mod.opted_in) {
    throw new Error(`Module ${args.module} chưa opt-in — không thể commit câu deepen.`);
  }
  const question = script.questions.find((q) => q.id === args.questionId);
  if (!question || question.module !== args.module) {
    throw new Error(`Câu ${args.questionId} không thuộc module ${args.module}.`);
  }
  if (question.per_subject === 'none') {
    if (args.subjectId !== null) {
      throw new Error(`Câu ${args.questionId} là per_subject:none nhưng nhận subjectId=${args.subjectId}.`);
    }
  } else if (!args.subjectId) {
    throw new Error(`Câu ${args.questionId} là per_subject:${question.per_subject} nhưng thiếu subjectId.`);
  }
  const priorGenerations = mod.answered.filter(
    (a) => a.question_id === args.questionId && a.subject_id === args.subjectId
  );
  const currentEntry =
    priorGenerations.length > 0
      ? priorGenerations.reduce((a, b) => (a.generation > b.generation ? a : b))
      : null;
  if (args.rerun) {
    if (!currentEntry) {
      throw new Error(
        `Instance ${args.questionId}@${args.subjectId ?? '-'} chưa được commit — không thể rerun.`
      );
    }
  } else if (currentEntry) {
    throw new Error(`Instance ${args.questionId}@${args.subjectId ?? '-'} đã được commit trước đó.`);
  }
  if (!args.capabilityToken) {
    throw new Error('Commit deepen failed (TURN_CAPABILITY_MISSING): No capability token provided.');
  }
  const verifyRes = verifyTurnCapability(
    state.pending_turn_capability,
    args.capabilityToken,
    {
      sessionId: state.session_id || 'default-session',
      operationKind: 'deepen',
      questionId: args.questionId,
      subjectId: args.subjectId,
      currentRevision: state.state_revision || 0,
    }
  );
  if (!verifyRes.valid) {
    throw new Error(`Commit deepen failed (${verifyRes.reason_code}): ${verifyRes.message}`);
  }

  const next: DeepenState = structuredClone(state);
  next.state_revision = (next.state_revision || 0) + 1;
  // verifyRes.valid guarantees pending_turn_capability is non-null.
  next.pending_turn_capability = {
    ...state.pending_turn_capability!,
    consumed_at: new Date().toISOString(),
    status: 'consumed',
  };
  const nmod = next.modules[args.module];
  nmod.answered.push({
    question_id: args.questionId,
    subject_id: args.subjectId,
    generation: currentEntry ? currentEntry.generation + 1 : 1,
    supersedes: currentEntry ? currentEntry.generation : null,
  });
  return next;
}

// ---------------------------------------------------------------------------
// Completeness & staleness
// ---------------------------------------------------------------------------

/**
 * Amend B20a (2026-07-21): chữ ký gốc `(state, script, subjects)` không đủ —
 *  (1) thiếu `module` nên không phân biệt được module có cùng subjects rỗng
 *      (glossary vs test-strategy); (2) không có nguồn để tính `stale`.
 * Bổ sung `module` (bắt buộc) và `currentDigest` (tuỳ chọn, do caller tính bằng
 * computeSourceDigest); vắng currentDigest → không kết luận stale (false).
 */
export function canEmitModule(
  state: DeepenState,
  script: DeepenScript,
  module: DeepenModuleId,
  subjects: string[],
  currentDigest?: string
): { ok: boolean; missing: QuestionInstance[]; stale: boolean } {
  const mod = state.modules[module];
  const expected = expandQuestionInstances(script, module, subjects);
  const missing = expected.filter(
    (inst) =>
      !mod.answered.some((a) => a.question_id === inst.question_id && a.subject_id === inst.subject_id)
  );
  const ok = expected.length > 0 && missing.length === 0;
  const stale =
    mod.emitted_at !== null &&
    currentDigest !== undefined &&
    mod.source_digest !== currentDigest;
  return { ok, missing, stale };
}

export function computeSourceDigest(
  module: DeepenModuleId,
  input: { deepenAnswers: unknown; tier1Docs: Record<string, string> }
): string {
  const sources = MODULE_SOURCES[module];
  const answers = asAnswerRecord(input.deepenAnswers);
  const docs = input.tier1Docs ?? {};

  const docPart: Record<string, string> = {};
  for (const [path, content] of Object.entries(docs)) {
    const norm = path.replace(/\\/g, '/');
    if (sources.docs.some((d) => norm.endsWith(d))) docPart[norm] = content;
  }
  const dsPart: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    // key dạng '<qid>' hoặc '<qid>@<sid>'
    const qid = key.split('@')[0];
    if (qid.startsWith(sources.dsPrefix)) dsPart[key] = value;
  }

  const canonical = JSON.stringify({
    module,
    docs: sortObject(docPart),
    deepen: sortObject(dsPart),
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}
