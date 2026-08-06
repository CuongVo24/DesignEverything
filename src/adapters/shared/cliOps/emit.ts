import {
  ensureCanonicalStore,
  loadSlotsFile,
  transactInterviewStore,
  activateTier1Emit,
  SLOT_ENVELOPE_SCHEMA_VERSION,
} from '../../../core/index.js';
import { CliResultEnvelope } from '../cliResult.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../../../version.js';
import { getArg } from './support.js';

export function handleEmit(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const canonicalOutcome = ensureCanonicalStore(workspaceRoot);
  if (canonicalOutcome.status === 'uninvolved') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'PROGRESS_MISSING',
      severity: 'error',
      message: 'Không tìm thấy canonical interview store để emit.',
      next_command: TARGET_LOCAL_INIT_COMMAND,
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (canonicalOutcome.status === 'corrupt') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'CORRUPT_PROGRESS_STATE',
      severity: 'error',
      message: `Không thể nạp canonical interview store: ${canonicalOutcome.message}`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  const progress = canonicalOutcome.envelope.payload.progress;
  const branch = progress.branch;
  if (!branch) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'BRANCH_NOT_SELECTED',
      severity: 'error',
      message: 'Chưa chọn hình-hài (branch) dự án.',
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (progress.phase !== 'ready-for-validation' || progress.current_step !== null) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'INTERVIEW_NOT_READY_FOR_VALIDATION',
      severity: 'error',
      message: 'Phỏng vấn chưa ở trạng thái ready-for-validation; hãy hoàn tất đúng các bước trước khi emit.',
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P10 — tier-1 answers come from the canonical interview store
  // (payload.answers keyed by step id, plus payload.slots keyed by the
  // fine-grained slot names doc-templates actually read), never the legacy
  // Design/.interview/answers.json file: that file has been dead for tier-1
  // purposes since the P2.2a canonical-authority cutover (commit only ever
  // writes payload.answers/slots now) and today is exclusively owned by tier-2
  // deepen answers (see deepenApplicationServices.ts / emitTier2.ts's
  // loadAnswers, which never run before a tier-1 emit).
  let answers: Record<string, string> = { ...canonicalOutcome.envelope.payload.answers };
  let handoffRevision = canonicalOutcome.envelope.state_revision;
  for (const [key, rec] of Object.entries(canonicalOutcome.envelope.payload.slots)) {
    answers[key] = rec.value;
  }

  // --slots-file: build-plan-derived slots computed by the model AFTER the
  // interview is complete (SKILL.md's handoff step) — they can't have been
  // committed as part of any single question, so this is the one place they're
  // merged in. Same load pipeline as `commit --slots-file`. Also persisted into
  // canonical payload.slots (own transaction, best-effort) for the same
  // audit/provenance trail per-question slots already get.
  const slotsFileArg = getArg(argv, '--slots-file');
  if (slotsFileArg) {
    // A1-P6 (B3a) — canonicalization + scratch-path containment now live
    // inside loadSlotsFile itself, shared with `commit --slots-file`.
    const loaded = loadSlotsFile(workspaceRoot, slotsFileArg);
    if (!loaded.ok) {
      return {
        ok: false,
        operation: 'emit',
        reason_code: loaded.reason_code,
        severity: 'error',
        message: loaded.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    answers = { ...answers, ...loaded.slots };

    try {
      const now = new Date().toISOString();
      const updatedEnvelope = transactInterviewStore(workspaceRoot, canonicalOutcome.envelope.state_revision, (env) => {
        const slots = { ...env.payload.slots };
        for (const [key, value] of Object.entries(loaded.slots)) {
          // A1-P6 (B3a) — question_id/source_answer_revisions stay unset: this
          // content is model-synthesized post-interview (SKILL.md build-plan
          // handoff step), not derived from any single question's answer.
          slots[key] = { value, provenance: 'emit:slots-file', updated_at: now, slot_schema_version: SLOT_ENVELOPE_SCHEMA_VERSION };
        }
        return { ...env, payload: { ...env.payload, slots } };
      });
      handoffRevision = updatedEnvelope.state_revision;
    } catch {
      // best-effort — a concurrent writer already advanced the revision; the
      // emit still proceeds with the in-memory merged answers, only the
      // canonical audit trail for these slots is skipped this time.
    }
  }

  // P7.1 — the sole production authority for tier-1 emit is activateTier1Emit's
  // render->stage->validate->activate transaction kernel. There is no direct
  // writeFileSync loop here anymore, and no catch branch that turns a thrown
  // render/validation error into a fabricated success by reading a stale manifest.
  const result = activateTier1Emit(workspaceRoot, answers, branch, {
    interview_state_revision: handoffRevision,
  });
  if (!result.ok) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: result.reason_code,
      severity: 'error',
      message: result.message,
      data: 'issues' in result && result.issues ? { issues: result.issues } : undefined,
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: true,
    operation: 'emit',
    reason_code: result.reason_code,
    severity: 'info',
    message: 'Xuất bản tài liệu thiết kế thành công.',
    data: {
      emitted_files: result.emitted_files,
      manifest_generation_id: result.manifest_generation_id,
      warnings: result.warnings,
    },
    next_command: targetLocalCliCommand('validate'),
    runtime_version: RUNTIME_VERSION,
  };
}
