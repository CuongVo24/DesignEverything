import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  loadExecutionState,
  saveExecutionState,
  initExecutionState,
  transitionToReadyToExecute,
  calculatePlanDigest,
  calculateDocsDigest,
  loadEmittedDocs,
  runSemanticValidation,
  manifestPath,
  ExecutionState,
} from '../../../core/index.js';
import { CliResultEnvelope, redactInternalError } from '../cliResult.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../../version.js';

export function handleValidate(workspaceRoot: string): CliResultEnvelope {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');
  const stateExisted = existsSync(execStatePath);
  let state: ExecutionState;

  if (stateExisted) {
    try {
      state = loadExecutionState(execStatePath);
    } catch (err: unknown) {
      return {
        ok: false,
        operation: 'validate',
        reason_code: 'VALIDATION_FAILED',
        severity: 'error',
        message: `Lỗi validate kế hoạch: ${redactInternalError((err as Error).message)}`,
        runtime_version: RUNTIME_VERSION,
      };
    }
  } else {
    // An activated tier-1 manifest without its bound execution state is not an
    // empty workspace. Initializing fresh here would let a damaged handoff turn
    // into a ready-to-execute state without replaying the emit journal.
    if (existsSync(manifestPath(workspaceRoot, 'tier1'))) {
      return {
        ok: false,
        operation: 'validate',
        reason_code: 'EXECUTION_STATE_REQUIRED',
        severity: 'error',
        message: 'Tier-1 emit đã tồn tại nhưng execution-state.json bị thiếu. Hãy repair hoặc emit lại để khôi phục handoff.',
        next_command: targetLocalCliCommand('repair'),
        runtime_version: RUNTIME_VERSION,
      };
    }
    state = initExecutionState();
  }

  // P1 (DEBT1) sticky-block truth: verification-failed/verification-aborted/
  // policy-corrupt blocks are never cleared by validate — transitionToReadyToExecute
  // already returns these unchanged; mirror that in the envelope instead of
  // lying with VALIDATION_PASSED like the old hardcoded-pass code did.
  if (state.phase === 'blocked' && state.block_reason) {
    const kind = state.block_reason.kind;
    if (kind === 'verification-failed' || kind === 'verification-aborted' || kind === 'policy-corrupt') {
      return {
        ok: false,
        operation: 'validate',
        reason_code: state.block_reason.reason_code,
        severity: 'error',
        message: `Không thể validate: trạng thái đang blocked (${kind}). ${state.block_reason.detail}`,
        data: { execState: state },
        next_command: state.block_reason.recoverable_by,
        runtime_version: RUNTIME_VERSION,
      };
    }
  }

  if (state.phase !== 'plan-validating' && state.phase !== 'blocked') {
    // Already past the validation gate (or in a phase validate doesn't govern,
    // e.g. executing/verifying) — refresh digests only, do not re-run the
    // semantic gate or touch phase/block_reason.
    let planDigest = '';
    let docsDigest = '';
    if (existsSync(execPlanPath)) {
      try {
        const planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
        planDigest = calculatePlanDigest(planJson);
        docsDigest = calculateDocsDigest(loadEmittedDocs(workspaceRoot, execPlanPath));
      } catch {
        // ignore
      }
    }
    const updatedState: ExecutionState = {
      ...state,
      validated_plan_digest: planDigest || state.validated_plan_digest,
      validated_docs_digest: docsDigest || state.validated_docs_digest,
    };
    saveExecutionState(execStatePath, updatedState);
    return {
      ok: true,
      operation: 'validate',
      reason_code: 'VALIDATION_PASSED',
      severity: 'info',
      message: 'Kế hoạch thi công đã được validate thành công.',
      data: { execState: updatedState },
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P1 (DEBT1) — real semantic validation: manifest presence/activation,
  // artifact-digest match against bytes on disk, execution-plan.json schema,
  // and required docs for the requires_validation gate(s). Replaces the old
  // hardcoded `transitionToReadyToExecute(state, true, ...)`.
  const result = runSemanticValidation(workspaceRoot);
  const manifestExists = existsSync(manifestPath(workspaceRoot, 'tier1'));

  const updatedState = result.pass
    ? transitionToReadyToExecute(state, true, {
        plan_digest: result.plan_digest,
        docs_digest: result.docs_digest,
        validation_digest: result.validation_digest,
      })
    : transitionToReadyToExecute(state, false);

  // Never materialize a fresh blocked state on a workspace that has neither
  // prior execution state nor a tier-1 manifest — that is "not involved enough
  // to validate yet", not a semantic failure worth persisting.
  if (stateExisted || manifestExists) {
    saveExecutionState(execStatePath, updatedState);
  }

  if (!result.pass) {
    const failedChecks = result.checks.filter((c) => !c.ok);
    return {
      ok: false,
      operation: 'validate',
      reason_code: 'SEMANTIC_VALIDATION_FAILED',
      severity: 'error',
      message: `Kế hoạch không vượt qua kiểm tra ngữ nghĩa: ${failedChecks.map((c) => c.id).join(', ')}.`,
      data: { execState: updatedState, checks: result.checks },
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: true,
    operation: 'validate',
    reason_code: 'VALIDATION_PASSED',
    severity: 'info',
    message: 'Kế hoạch thi công đã được validate thành công.',
    data: { execState: updatedState },
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
  };
}
