import { join } from 'path';
import { createHash } from 'crypto';
import { loadInterviewStore, transactInterviewStore, initializeInterviewStore } from './interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';
import { loadScript } from './loadScript.js';
import { commitStep, checkRate, stampTurn } from './advanceState.js';
import { undoStep } from './undoStep.js';
import { issueTurnCapability } from './turnCapability.js';
import { validateAnswer } from './validateAnswer.js';
import { issueAckCapability, consumeAckCapability, type AckWarningInput } from './ackCapability.js';
import { SLOT_ENVELOPE_SCHEMA_VERSION } from './schemas/interviewStore.js';
import type { InterviewStoreEnvelope } from './schemas/interviewStore.js';
import type { Progress } from './schemas/index.js';

const SCRIPT_REL_PATH = 'Design/Content/interview-script/script.yaml';

function classifyLoadError(err: unknown): 'STORE_MISSING' | 'STORE_CORRUPT' {
  const msg = (err as Error).message || '';
  return msg.startsWith('STORE_MISSING') ? 'STORE_MISSING' : 'STORE_CORRUPT';
}

export type EnsureStoreOutcome =
  | { status: 'ready'; envelope: InterviewStoreEnvelope }
  | { status: 'uninvolved' }
  | { status: 'corrupt'; message: string };

/**
 * Migrates legacy state into the canonical store if legacy state exists, and
 * reports 'uninvolved' (never fabricates state) if neither canonical nor
 * legacy state exists. Safe to call unconditionally from init/repair/status
 * handlers — it is the read side of the P2.2a authority cutover, not an
 * initializer.
 */
export function ensureCanonicalStore(workspaceRoot: string): EnsureStoreOutcome {
  try {
    const migrated = migrateInterviewStore(workspaceRoot);
    if (migrated === 'no-legacy') {
      return { status: 'uninvolved' };
    }
    return { status: 'ready', envelope: loadInterviewStore(workspaceRoot) };
  } catch (err: unknown) {
    return { status: 'corrupt', message: (err as Error).message };
  }
}

export { initializeInterviewStore };

export interface IssuePromptCapabilityOk {
  ok: true;
  reason_code: 'CAPABILITY_ISSUED';
  token: string;
  progress: Progress;
  revision: number;
  committedAnswers: Record<string, string>;
}
export interface IssuePromptCapabilityFail {
  ok: false;
  reason_code: 'STORE_MISSING' | 'STORE_CORRUPT' | 'NO_ACTIVE_STEP' | 'RATE_LIMIT_VIOLATION' | 'REVISION_CONFLICT';
  message: string;
}
export type IssuePromptCapabilityResult = IssuePromptCapabilityOk | IssuePromptCapabilityFail;

/**
 * The sole authority for issuing an interview-turn capability token. Loads
 * the canonical store (never progress.json), stamps the turn, issues a
 * capability bound to the current step + revision, and persists it in one
 * CAS transaction keyed off the revision it just observed — no caller-
 * supplied expectedRevision is needed because this function is the one that
 * establishes it. Session id comes from the canonical progress itself (the
 * host has no independent session concept to inject) — never a
 * caller-supplied override, so it can't drift from what commitStep verifies.
 */
export function issuePromptCapability(workspaceRoot: string): IssuePromptCapabilityResult {
  let envelope: InterviewStoreEnvelope;
  try {
    envelope = loadInterviewStore(workspaceRoot);
  } catch (err: unknown) {
    return { ok: false, reason_code: classifyLoadError(err), message: (err as Error).message };
  }

  const progress = envelope.payload.progress;

  // Rate-check applies unconditionally, even once the interview has no
  // active step left — an extra unstamped `answered` entry must still be
  // caught, not silently waved through because current_step is null.
  const rateCheck = checkRate(progress, progress.answered.length);
  if (!rateCheck.ok) {
    return {
      ok: false,
      reason_code: 'RATE_LIMIT_VIOLATION',
      message: rateCheck.reason ?? 'Rate limit violation',
    };
  }

  // The capability's expected_revision must match the revision the store
  // will hold AFTER this transaction commits — transactInterviewStore always
  // stamps payload.progress.state_revision to its own post-increment value,
  // so issuing the token against the pre-transaction revision (current
  // envelope.state_revision) would be off by one and every subsequent
  // commitStep call would fail closed with TURN_CAPABILITY_WRONG_REVISION.
  // Building the capability inside the mutator, from the revision the
  // mutator itself is about to be stamped with, keeps the two in lockstep.
  // The turn is stamped (answered_len_at_last_turn) unconditionally, whether
  // or not there is an active step to issue a capability for.
  let issuedToken = '';
  let transactErr: Error | null = null;
  let newEnvelope: InterviewStoreEnvelope | null = null;
  try {
    newEnvelope = transactInterviewStore(workspaceRoot, envelope.state_revision, (env) => {
      const currentProgress = env.payload.progress;
      const stamped = stampTurn(currentProgress, currentProgress.answered.length);
      if (stamped.current_step === null) {
        return { ...env, payload: { ...env.payload, progress: stamped } };
      }
      const nextRevision = env.state_revision + 1;
      const issued = issueTurnCapability(nextRevision, {
        sessionId: stamped.session_id || 'default-session',
        operationKind: 'interview',
        questionId: stamped.current_step,
      });
      issuedToken = issued.token;
      const updatedProgress: Progress = { ...stamped, pending_turn_capability: issued.capability };
      return { ...env, payload: { ...env.payload, progress: updatedProgress } };
    });
  } catch (err: unknown) {
    transactErr = err as Error;
  }

  if (transactErr || !newEnvelope) {
    const msg = transactErr?.message ?? 'Failed to persist turn stamp.';
    return {
      ok: false,
      reason_code: msg.startsWith('REVISION_CONFLICT') ? 'REVISION_CONFLICT' : 'STORE_CORRUPT',
      message: msg,
    };
  }

  if (newEnvelope.payload.progress.current_step === null) {
    return {
      ok: false,
      reason_code: 'NO_ACTIVE_STEP',
      message: 'Interview has no active step (already complete).',
    };
  }

  return {
    ok: true,
    reason_code: 'CAPABILITY_ISSUED',
    token: issuedToken,
    progress: newEnvelope.payload.progress,
    revision: newEnvelope.state_revision,
    committedAnswers: { ...newEnvelope.payload.answers },
  };
}

export interface CommitInterviewAnswerOk {
  ok: true;
  reason_code: 'COMMIT_SUCCESS';
  progress: Progress;
  revision: number;
}
export interface CommitInterviewAnswerFail {
  ok: false;
  reason_code: string;
  message: string;
  /**
   * A1-03b (Wave A1) — present only on ANSWER_NEEDS_USER_ACK: a freshly
   * issued AckCapability token (ackCapability.ts) bound to this exact
   * answer text, warning set, and interview revision. The caller shows the
   * warnings to the user and, only after they confirm, resubmits with
   * `ackToken` set to this value. Always reissued on every needs_user_ack
   * response (including a failed retry) so the caller always has a valid
   * token to act on next, mirroring turnCapability's reissue-on-challenge
   * pattern.
   */
  ack_token?: string;
}
export type CommitInterviewAnswerResult = CommitInterviewAnswerOk | CommitInterviewAnswerFail;

/**
 * The sole authority for committing an interview answer. Verifies the
 * capability token against the canonical store's own pending capability
 * (never a caller-supplied turn id), advances progress via commitStep, and
 * persists progress + raw answer text in one CAS transaction.
 */
export function commitInterviewAnswer(
  workspaceRoot: string,
  args: {
    capabilityToken: string;
    branchChoice?: string;
    calibrateChoice?: string;
    answerText?: string;
    /** A1-03b (Wave A1) — the token from a prior ANSWER_NEEDS_USER_ACK
     * response's `ack_token`, presented back after the caller has shown
     * the user the warnings and they confirmed. Verified via
     * consumeAckCapability, bound to this exact answer text, warning set,
     * and interview revision — presenting a stale/forged/wrong-revision
     * token is rejected the same as presenting none at all, it does not
     * silently fall through. Replaces the old bare `ackWarnings: boolean`
     * (plan-v1-bonus-tasks.md:919-925 already flagged that nothing bound
     * it to the warning content or made it single-use). */
    ackToken?: string;
    /** Parsed content of --slots-file (adapter/claude-code/skill/SKILL.md's
     * documented flat slot-key -> value map), already read off disk by the
     * caller. Each value is quality-checked the same way the main answer
     * is, then merged into payload.slots in the same CAS transaction as
     * answers[stepId] — one revision bump, not two. */
    slotsPayload?: Record<string, string>;
  }
): CommitInterviewAnswerResult {
  let envelope: InterviewStoreEnvelope;
  try {
    envelope = loadInterviewStore(workspaceRoot);
  } catch (err: unknown) {
    return { ok: false, reason_code: classifyLoadError(err), message: (err as Error).message };
  }

  if (!args.capabilityToken) {
    return {
      ok: false,
      reason_code: 'TURN_CAPABILITY_MISSING',
      message:
        'Thiếu --capability-token. Commit chỉ được phép bằng token do UserPromptSubmit phát hành ' +
        'cho đúng lượt/câu hỏi hiện tại — không dùng --turn tự đặt.',
    };
  }

  const scriptPath = join(workspaceRoot, SCRIPT_REL_PATH);
  let script;
  try {
    script = loadScript(scriptPath);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'SCRIPT_MISSING', message: (err as Error).message };
  }

  const progress = envelope.payload.progress;
  const stepId = progress.current_step;

  if (args.answerText) {
    // P6.1 — the current question's real answer_contract (min length,
    // pattern, enum, warning_rules from script.yaml) must gate the commit,
    // not a hardcoded null that only ever catches empty/placeholder text.
    const question = stepId ? script.questions.find((q) => q.id === stepId) : undefined;
    const contract = question?.answer_contract ?? null;
    const valRes = validateAnswer(contract, args.answerText);
    if (valRes.outcome === 'invalid') {
      return { ok: false, reason_code: valRes.reason_code, message: valRes.message };
    }
    if (valRes.outcome === 'needs_user_ack') {
      const warningItems: AckWarningInput[] = (valRes.warnings ?? [valRes.message]).map((w, i) => ({
        id: `${valRes.reason_code}-${i}`,
        message: w,
      }));
      const ackExpectation = {
        workspaceRoot,
        sessionId: progress.session_id,
        warnings: warningItems,
        interviewStateRevision: envelope.state_revision,
        inputDigest: createHash('sha256').update(args.answerText).digest('hex'),
        generationId: null,
      };

      const consumed = args.ackToken ? consumeAckCapability(args.ackToken, ackExpectation) : null;
      if (!consumed || !consumed.valid) {
        // Always reissue on failure too (including "no token presented at
        // all") — the caller must never be left with a needs_user_ack
        // response and nothing actionable to retry with.
        const { token } = issueAckCapability(ackExpectation);
        return {
          ok: false,
          reason_code: 'ANSWER_NEEDS_USER_ACK',
          message:
            `${valRes.message} Hỏi lại người dùng và chỉ commit lại với --ack-token sau khi họ xác nhận, ` +
            `không tự ý bỏ qua cảnh báo.${consumed ? ` (Token trước đó bị từ chối: ${consumed.reason_code}.)` : ''}`,
          ack_token: token,
        };
      }
      // consumed.valid === true — the user's explicit ack for this exact
      // answer/warning-set/revision is now spent (single-use); fall
      // through to commit.
    }
  }

  if (args.slotsPayload && !stepId) {
    return {
      ok: false,
      reason_code: 'SLOTS_WITHOUT_CURRENT_STEP',
      message: 'Không có câu hỏi hiện tại để gắn slots — không có gì để commit.',
    };
  }

  if (args.slotsPayload) {
    // P4.2/P6 (R07/U05) — a question that declares `slot_keys` in
    // script.yaml only accepts writes to that exact set; a question with no
    // `slot_keys` declared keeps the old behavior (any key accepted), so
    // this is additive and does not regress questions this field hasn't
    // been backfilled for. `stepId` is guaranteed non-null here (checked
    // just above).
    const currentQuestion = script.questions.find((q) => q.id === stepId);
    const allowedSlotKeys = currentQuestion?.slot_keys;
    if (allowedSlotKeys) {
      for (const key of Object.keys(args.slotsPayload)) {
        if (!allowedSlotKeys.includes(key)) {
          return {
            ok: false,
            reason_code: 'SLOT_KEY_NOT_ALLOWLISTED',
            message: `Slot key "${key}" không thuộc danh sách slot_keys của câu hỏi hiện tại (${stepId}): ${allowedSlotKeys.join(', ')}.`,
          };
        }
      }
    }

    // Slot values get the same basic quality bar as the main answer text
    // (empty/placeholder rejection) — they don't carry a per-key
    // answer_contract of their own, so contract-specific rules
    // (min_trimmed_chars/pattern/enum/warning_rules) don't apply here.
    for (const [key, value] of Object.entries(args.slotsPayload)) {
      const slotRes = validateAnswer(null, value);
      if (slotRes.outcome === 'invalid') {
        return {
          ok: false,
          reason_code: slotRes.reason_code,
          message: `Slot "${key}": ${slotRes.message}`,
        };
      }
    }
  }

  let updatedProgress: Progress;
  try {
    updatedProgress = commitStep(progress, script, {
      capabilityToken: args.capabilityToken,
      branchChoice: args.branchChoice,
      calibrateChoice: args.calibrateChoice,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const codeMatch = msg.match(/^Commit failed \(([A-Z_]+)\):/);
    return { ok: false, reason_code: codeMatch ? codeMatch[1] : 'COMMIT_FAILED', message: msg };
  }

  const newEnvelope = transactInterviewStore(workspaceRoot, envelope.state_revision, (env) => {
    const now = new Date().toISOString();
    const answers = { ...env.payload.answers };
    if (stepId && args.answerText) {
      answers[stepId] = args.answerText;
    }

    // P6 10.1 — a slot key resubmitted with a different value (legitimately
    // reachable across two different steps in the same session, unlike
    // answers[stepId] — see interviewStoreCorrectionsSchema's doc comment)
    // appends what it replaces instead of silently destroying it.
    const correctionSlots = { ...(env.payload.corrections?.slots ?? {}) };
    const slots = { ...env.payload.slots };
    if (stepId && args.slotsPayload) {
      for (const [key, value] of Object.entries(args.slotsPayload)) {
        const priorSlot = slots[key];
        if (priorSlot !== undefined && priorSlot.value !== value) {
          correctionSlots[key] = [
            ...(correctionSlots[key] ?? []),
            { previous_value: priorSlot.value, previous_revision: env.state_revision, corrected_at: now },
          ];
        }
        slots[key] = {
          value,
          provenance: `interview:${stepId}`,
          updated_at: now,
          slot_schema_version: SLOT_ENVELOPE_SCHEMA_VERSION,
          question_id: stepId,
          source_answer_revisions: [`${stepId}@${env.state_revision}`],
        };
      }
    }

    return {
      ...env,
      payload: {
        ...env.payload,
        progress: updatedProgress,
        answers,
        slots,
        corrections: { slots: correctionSlots },
      },
    };
  });

  return {
    ok: true,
    reason_code: 'COMMIT_SUCCESS',
    progress: newEnvelope.payload.progress,
    revision: newEnvelope.state_revision,
  };
}

export interface UndoLastAnswerOk {
  ok: true;
  reason_code: 'UNDO_SUCCESS';
  progress: Progress;
  revision: number;
  undone_question_id: string;
}
export interface UndoLastAnswerFail {
  ok: false;
  reason_code: string;
  message: string;
}
export type UndoLastAnswerResult = UndoLastAnswerOk | UndoLastAnswerFail;

/**
 * B24a (D59) — the sole authority for undoing the most recently answered
 * interview question. Mirrors commitInterviewAnswer's shape: the pure
 * engine (undoStep) runs outside any transaction, then a single
 * transactInterviewStore fold applies progress + removes answers[qid] +
 * removes every slot this question produced + records what was removed in
 * corrections, all in one CAS write (one revision bump, not several).
 */
export function undoLastAnswer(workspaceRoot: string): UndoLastAnswerResult {
  let envelope: InterviewStoreEnvelope;
  try {
    envelope = loadInterviewStore(workspaceRoot);
  } catch (err: unknown) {
    return { ok: false, reason_code: classifyLoadError(err), message: (err as Error).message };
  }

  let script;
  try {
    script = loadScript(join(workspaceRoot, SCRIPT_REL_PATH));
  } catch (err: unknown) {
    return { ok: false, reason_code: 'SCRIPT_MISSING', message: (err as Error).message };
  }

  const progress = envelope.payload.progress;
  const qid = progress.answered.length > 0 ? progress.answered[progress.answered.length - 1] : null;

  let updatedProgress: Progress;
  try {
    updatedProgress = undoStep(progress, script);
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const codeMatch = msg.match(/^Undo failed \(([A-Z_]+)\):/);
    return { ok: false, reason_code: codeMatch ? codeMatch[1] : 'UNDO_FAILED', message: msg };
  }

  // qid is guaranteed non-null here: undoStep only returns successfully
  // when progress.answered was non-empty (otherwise it throws
  // UNDO_DENIED_NOTHING_ANSWERED, caught above).
  const undoneQuestionId = qid as string;

  const newEnvelope = transactInterviewStore(workspaceRoot, envelope.state_revision, (env) => {
    const now = new Date().toISOString();
    const answers = { ...env.payload.answers };
    const removedAnswer = answers[undoneQuestionId];
    delete answers[undoneQuestionId];

    const correctionAnswers = { ...(env.payload.corrections?.answers ?? {}) };
    if (removedAnswer !== undefined) {
      correctionAnswers[undoneQuestionId] = [
        ...(correctionAnswers[undoneQuestionId] ?? []),
        { previous_value: removedAnswer, previous_revision: env.state_revision, corrected_at: now },
      ];
    }

    // Remove every slot this question produced (slotProvenanceRecordSchema's
    // question_id field, populated by commitInterviewAnswer above) — a slot
    // left behind after its owning answer is undone would silently keep
    // feeding emit with stale content nothing in `answered` justifies
    // anymore.
    const slots = { ...env.payload.slots };
    const correctionSlots = { ...(env.payload.corrections?.slots ?? {}) };
    for (const [key, record] of Object.entries(env.payload.slots)) {
      if (record.question_id === undoneQuestionId) {
        correctionSlots[key] = [
          ...(correctionSlots[key] ?? []),
          { previous_value: record.value, previous_revision: env.state_revision, corrected_at: now },
        ];
        delete slots[key];
      }
    }

    return {
      ...env,
      payload: {
        ...env.payload,
        progress: updatedProgress,
        answers,
        slots,
        corrections: { slots: correctionSlots, answers: correctionAnswers },
      },
    };
  });

  return {
    ok: true,
    reason_code: 'UNDO_SUCCESS',
    progress: newEnvelope.payload.progress,
    revision: newEnvelope.state_revision,
    undone_question_id: undoneQuestionId,
  };
}
