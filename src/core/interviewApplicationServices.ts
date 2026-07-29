import { join } from 'path';
import { loadInterviewStore, transactInterviewStore, initializeInterviewStore } from './interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';
import { loadScript } from './loadScript.js';
import { commitStep, checkRate, stampTurn } from './advanceState.js';
import { issueTurnCapability } from './turnCapability.js';
import { validateAnswer } from './validateAnswer.js';
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
    /** Explicit re-submission after the caller has shown the user the
     * warnings from a prior needs_user_ack result. The model can never set
     * this on the first attempt — it only becomes meaningful once
     * validateAnswer has already returned needs_user_ack once for this
     * exact answer text. */
    ackWarnings?: boolean;
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
    if (valRes.outcome === 'needs_user_ack' && !args.ackWarnings) {
      return {
        ok: false,
        reason_code: 'ANSWER_NEEDS_USER_ACK',
        message:
          `${valRes.message} Hỏi lại người dùng và chỉ commit lại với --ack-warnings sau khi họ xác nhận, ` +
          'không tự ý bỏ qua cảnh báo.',
      };
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
        slots[key] = { value, provenance: `interview:${stepId}`, updated_at: now };
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
