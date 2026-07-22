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
function fillTargetDoc(q: DeepenQuestion, subject: string): string | null {
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
  args: { module: DeepenModuleId; questionId: string; subjectId: string | null; userTurnId: string }
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
  const already = mod.answered.some(
    (a) => a.question_id === args.questionId && a.subject_id === args.subjectId
  );
  if (already) {
    throw new Error(`Instance ${args.questionId}@${args.subjectId ?? '-'} đã được commit trước đó.`);
  }
  if (args.userTurnId === mod.last_user_turn_id) {
    throw new Error(`Duplicate turn: ${args.userTurnId} đã dùng cho lượt trước của module ${args.module}.`);
  }

  const next: DeepenState = structuredClone(state);
  const nmod = next.modules[args.module];
  nmod.answered.push({ question_id: args.questionId, subject_id: args.subjectId });
  nmod.last_user_turn_id = args.userTurnId;
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
