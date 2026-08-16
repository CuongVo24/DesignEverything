import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Progress, Script } from './schemas/index.js';
import { loadShapes } from './loadShapes.js';

function getRegistryBranchIds(): string[] {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let shapesPath = join(process.cwd(), 'Design/Content/interview-script/shapes.yaml');
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
  }
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../../Design/Content/interview-script/shapes.yaml');
  }
  if (existsSync(shapesPath)) {
    const registry = loadShapes(shapesPath);
    return registry.shapes.map(s => s.id);
  }
  return ['web', 'mobile', 'hybrid', 'cli'];
}

function isQuestionCompatible(qBranch: string, progressBranch: string | null): boolean {
  if (qBranch === 'core') return true;
  if (progressBranch === 'hybrid') return qBranch === 'web' || qBranch === 'mobile';
  return qBranch === progressBranch;
}

// B24a — extracted so undoStep.ts and computeBatch (B24b) can recompute the
// same "what question comes next" decision commitStep makes, instead of
// each re-implementing the eligibility loop (already-answered + branch
// compatibility + depends_on) a second and third time. Pure, no I/O.
export function selectNextStep(
  answered: string[],
  branch: string | null,
  script: Script
): string | null {
  for (const q of script.questions) {
    if (answered.includes(q.id)) {
      continue;
    }
    if (!isQuestionCompatible(q.branch, branch)) {
      continue;
    }
    const depsSatisfied = q.depends_on.every((dep) => answered.includes(dep));
    if (!depsSatisfied) {
      continue;
    }
    return q.id;
  }
  return null;
}

export { isQuestionCompatible };

import { verifyTurnCapability } from './turnCapability.js';

export function commitStep(
  progress: Progress,
  script: Script,
  args: { capabilityToken: string; branchChoice?: string; calibrateChoice?: string }
): Progress {
  const currentStepId = progress.current_step;
  if (currentStepId === null) {
    throw new Error('Interview is already completed; no active step to commit');
  }

  // Capability Verification (B1a) — mandatory. There is no legacy
  // self-declared-turn-id fallback: a caller-supplied identifier can never
  // authorize a commit, only a capability issued by UserPromptSubmit for
  // this exact session/question/revision can.
  if (!args.capabilityToken) {
    throw new Error('Commit failed (TURN_CAPABILITY_MISSING): No capability token provided.');
  }
  const verifyRes = verifyTurnCapability(
    progress.pending_turn_capability,
    args.capabilityToken,
    {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: currentStepId,
      currentRevision: progress.state_revision || 0,
    }
  );
  if (!verifyRes.valid) {
    throw new Error(`Commit failed (${verifyRes.reason_code}): ${verifyRes.message}`);
  }

  // B24b (D60) — partial consumption for a batch token: only mark the whole
  // record 'consumed' once every question in its batch has been committed.
  // A single-question token has batchIds.length === 1, so
  // newlyConsumed.length (1) >= batchIds.length (1) is immediately true —
  // this is exactly the old always-consume-on-first-commit behavior when
  // there is no batch.
  const cap = progress.pending_turn_capability!; // verifyRes.valid guarantees non-null.
  const batchIds = cap.question_ids ?? [cap.question_id];
  const newlyConsumed = [...(cap.consumed_question_ids ?? []), currentStepId];
  const batchFullyConsumed = newlyConsumed.length >= batchIds.length;

  const nextProgress: Progress = {
    ...progress,
    state_revision: (progress.state_revision || 0) + 1,
    answered: [...progress.answered],
    emitted_docs: [...progress.emitted_docs],
    gates_passed: [...progress.gates_passed],
    pending_turn_capability: {
      ...cap,
      consumed_question_ids: newlyConsumed,
      consumed_at: batchFullyConsumed ? new Date().toISOString() : null,
      status: batchFullyConsumed ? 'consumed' : 'active',
    },
  };

  // 3. Append current_step to answered
  nextProgress.answered.push(currentStepId);

  // 3b (H6, v8-hotfix) — record this question's declared `gate` as passed
  // (e.g. S3's `scope-locked`). Before this, NOTHING in the commit pipeline
  // ever appended to `gates_passed` — it stayed `[]` for the entire
  // interview — so step 6 below's `hasAllGates` check could never be
  // satisfied whenever a branch declared a required gate (every branch
  // does, via S3), and phase could never advance past 'docs-emitted' to
  // 'ready-for-validation' through the real commit flow. `emit` requires
  // exactly that phase (emit.ts), so this made emit permanently
  // unreachable for any interview driven through the documented
  // commit/UserPromptSubmit flow — only synthetic test fixtures that seed
  // gates_passed directly (advanceState.test.ts's own 'ready-for-validation'
  // case does exactly that) ever exercised the phase this unlocks.
  const committedQuestion = script.questions.find((q) => q.id === currentStepId);
  if (committedQuestion?.gate && !nextProgress.gates_passed.includes(committedQuestion.gate)) {
    nextProgress.gates_passed.push(committedQuestion.gate);
  }

  // 4. Branch logic at S7
  if (currentStepId === 'S7') {
    if (!args.branchChoice) {
      throw new Error('branchChoice must be provided when committing step S7');
    }
    const validBranches = getRegistryBranchIds();
    if (!validBranches.includes(args.branchChoice)) {
      throw new Error(`Invalid branch choice: ${args.branchChoice}. Must be one of: ${validBranches.join(', ')}`);
    }
    if (progress.branch !== null && progress.branch !== args.branchChoice) {
      throw new Error(`Cannot change branch once set. Current: ${progress.branch}, New: ${args.branchChoice}`);
    }
    nextProgress.branch = args.branchChoice;
  } else {
    // If not S7, but branch is already set, ensure branchChoice doesn't try to change it
    if (progress.branch !== null && args.branchChoice && progress.branch !== args.branchChoice) {
      throw new Error(`Cannot change branch once set. Current: ${progress.branch}, New: ${args.branchChoice}`);
    }
  }

  // 4b. Calibrate logic at CAL0 — mirrors the S7 branch pattern above.
  // Unlike branch, a calibrate choice is never required: script.yaml gives
  // CAL0 a "fast" default, so an omitted --calibrate commits that default
  // rather than failing the step.
  if (currentStepId === 'CAL0') {
    const calibrateChoice = args.calibrateChoice ?? 'fast';
    if (calibrateChoice !== 'deep' && calibrateChoice !== 'fast') {
      throw new Error(`Invalid calibrate choice: ${calibrateChoice}. Must be one of: deep, fast`);
    }
    nextProgress.calibrate_mode = calibrateChoice;
  }

  // 5. Calculate next current_step (B24a — via the shared selectNextStep,
  // same eligibility loop undoStep.ts and computeBatch use).
  const nextStepId = selectNextStep(nextProgress.answered, nextProgress.branch, script);

  nextProgress.current_step = nextStepId;

  // 6. Update phase and updated_at
  if (nextStepId === null) {
    // Interview complete, determine phase based on doc coverage and gates passed.
    //
    // H7 (v8-hotfix) — hasAllDocs used to check `nextProgress.emitted_docs`,
    // a field NOTHING in the commit pipeline ever writes to (only `emit`
    // itself populates it, once it has already run). That made hasAllDocs
    // false by construction at the exact moment this code runs (right after
    // the LAST question of the interview, before any emit has ever
    // happened), so phase could never land on 'ready-for-validation' here —
    // and `emit` requires exactly that phase (emit.ts, emitTier1.ts's
    // handoff check) to run at all. The result was a closed loop: emit
    // needs 'ready-for-validation', which needs emitted_docs, which only
    // emit ever writes. Checking doc coverage against `answered` instead
    // asks the question this code can actually answer at this point in
    // time — "did the interview cover every question that feeds a required
    // doc" — which the eligibility loop above already guarantees true the
    // moment `nextStepId` lands on null (every branch-compatible,
    // dependency-satisfied question is answered by definition once no
    // eligible question remains). See advanceState.test.ts's H6/H7
    // regression tests, which walk a real 'cli' branch through this exact
    // transition with no hand-seeded emitted_docs/gates_passed.
    const requiredDocQuestions = script.questions.filter(
      (q) => isQuestionCompatible(q.branch, nextProgress.branch) && q.target_doc !== null
    );
    const requiredGates = new Set(
      script.questions
        .filter(
          (q) => isQuestionCompatible(q.branch, nextProgress.branch) && q.gate !== null
        )
        .map((q) => q.gate as string)
    );

    const hasAllDocs = requiredDocQuestions.every((q) => nextProgress.answered.includes(q.id));
    const hasAllGates = Array.from(requiredGates).every((gate) =>
      nextProgress.gates_passed.includes(gate)
    );

    if (hasAllDocs && hasAllGates) {
      // Interview completion does not open the code gate. The only honest
      // canonical handoff is to validation; execution-state then moves to
      // ready-to-execute after a semantic validation pass.
      nextProgress.phase = 'ready-for-validation';
    } else {
      nextProgress.phase = 'docs-emitted';
    }
  } else {
    nextProgress.phase = 'interview';
  }

  nextProgress.updated_at = new Date().toISOString();

  return nextProgress;
}

export function checkRate(
  progress: Progress,
  incomingAnsweredLen: number
): { ok: boolean; reason?: string } {
  // B24b (D60) — the allowed delta is the size of the batch the LAST
  // issued token covered (still sitting in pending_turn_capability at the
  // moment this runs, from before the new token is issued), not always 1.
  // Absent question_ids (no batch ever issued, or a pre-B24b token) keeps
  // the original single-question trần.
  const allowance = progress.pending_turn_capability?.question_ids?.length ?? 1;
  const allowed = incomingAnsweredLen - progress.answered_len_at_last_turn <= allowance;
  if (!allowed) {
    return {
      ok: false,
      reason: `Answered length increased by too much. Incoming length: ${incomingAnsweredLen}, length at last turn: ${progress.answered_len_at_last_turn}, allowed: ${allowance}`,
    };
  }
  return { ok: true };
}

export function stampTurn(progress: Progress, answeredLen: number): Progress {
  return {
    ...progress,
    answered: [...progress.answered],
    emitted_docs: [...progress.emitted_docs],
    gates_passed: [...progress.gates_passed],
    answered_len_at_last_turn: answeredLen,
    updated_at: new Date().toISOString(),
  };
}
