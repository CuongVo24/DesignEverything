import type { Progress, Script } from './schemas/index.js';

/**
 * B24a (D59) — the compensating control for dropping the mandatory
 * translate-back confirmation card: instead of blocking commit until the
 * user confirms, the interview commits immediately and lets the user undo
 * the single most recent answer if it was wrong. Pure, no I/O — mirrors
 * commitStep's shape (advanceState.ts) so the two are easy to read side by
 * side: both take/return a whole Progress, both throw a
 * `Undo failed (CODE): message` string the CLI layer regex-parses the same
 * way commitStep's failures are parsed.
 *
 * Only ever undoes ONE step — the last entry in `answered` — and only while
 * still mid-interview. Once `emit` has run (phase is no longer 'interview'),
 * docs have already been generated from the answer being undone would
 * remove; that is out of scope for a single-step undo and fails closed
 * instead of silently leaving stale docs.
 */
export function undoStep(progress: Progress, script: Script): Progress {
  if (progress.phase !== 'interview') {
    throw new Error(
      'Undo failed (UNDO_DENIED_AFTER_EMIT): Cannot undo once the interview phase has advanced past interview (docs may already reflect this answer).'
    );
  }

  if (progress.answered.length === 0) {
    throw new Error(
      'Undo failed (UNDO_DENIED_NOTHING_ANSWERED): No answered question to undo.'
    );
  }

  const qid = progress.answered[progress.answered.length - 1];
  const answered = progress.answered.slice(0, -1);

  const question = script.questions.find((q) => q.id === qid);

  // Gate rollback — mirrors commitStep's step 3b (H6, v8-hotfix): if the
  // undone question declared a gate (e.g. S3's scope-locked), that gate is
  // no longer satisfied by the answered set.
  const gatesPassed = question?.gate
    ? progress.gates_passed.filter((g) => g !== question.gate)
    : [...progress.gates_passed];

  const nextProgress: Progress = {
    ...progress,
    state_revision: (progress.state_revision || 0) + 1,
    answered,
    gates_passed: gatesPassed,
    emitted_docs: [...progress.emitted_docs],
    current_step: qid,
    // Undoing S7/CAL0 rolls back the one-way choices commitStep records
    // for them, so re-answering the question is a genuine re-decision, not
    // a no-op blocked by "Cannot change branch once set".
    branch: qid === 'S7' ? null : progress.branch,
    calibrate_mode: qid === 'CAL0' ? null : progress.calibrate_mode,
    // Fail-closed: undo does not hand back a usable capability. Answering
    // the reopened question again requires a fresh token from
    // UserPromptSubmit — i.e. a real human turn — same as any other
    // question. Leaving the previous (now-stale) capability in place would
    // let a replay of the OLD token re-commit qid without a new turn ever
    // having happened.
    pending_turn_capability: null,
    // Keeps checkRate's invariant intact for the NEXT issuePromptCapability
    // call: answered_len_at_last_turn must track answered.length after this
    // rollback, or the next turn's rate check would see a stale, too-high
    // baseline (checkRate is one-sided — `<= 1` — so a decrease here is
    // never itself flagged, but leaving the baseline unstamped would let
    // the accounting drift out from under the next real commit).
    answered_len_at_last_turn: answered.length,
    updated_at: new Date().toISOString(),
  };

  // Note: `current_step` is set directly to qid (the question being
  // reopened), not recomputed via advanceState.ts's selectNextStep — that
  // eligibility loop could, in principle, land on a different question if
  // depends_on/branch shifted, which is not what "undo the last answer"
  // means.
  return nextProgress;
}
