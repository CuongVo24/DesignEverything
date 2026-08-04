import { allowedRemediation } from '../advanceExecutionState.js';
import { matchesPathPattern } from '../pathPolicy.js';
import type { PreActionDecision } from '../schemas/index.js';
import type { PhaseContext } from './types.js';

/**
 * P3.2 — `blocked` no longer means deny-everything. The typed BlockRecord
 * declares an exact remediation scope via allowedRemediation(); only that
 * declared scope is allowed, everything else denies. Not a blanket recovery
 * allow — allowedRemediation itself fails closed to read-only when the block
 * has no usable reason.
 */
export function phaseBlocked(ctx: PhaseContext): PreActionDecision {
  const { request, resolvedPaths, commandStr, execState } = ctx;
  const remediation = allowedRemediation(execState!);

  if (request.action_kind === 'read' && remediation.allowed_actions.includes('read')) {
    return {
      decision: 'allow',
      reason_code: 'blocked-remediation-read-allowed',
      user_message: 'Đọc tệp được phép trong khi quy trình đang blocked.',
      enforcement: 'hard',
    };
  }

  if (request.action_kind === 'write') {
    const canWriteDocs =
      remediation.allowed_actions.includes('write-docs') || remediation.allowed_actions.includes('write-task-scope');
    const pathsMatchRemediation =
      resolvedPaths.length > 0 &&
      resolvedPaths.every((p) => remediation.allowed_paths.some((pattern) => matchesPathPattern(p, pattern)));
    if (canWriteDocs && pathsMatchRemediation) {
      return {
        decision: 'allow',
        reason_code: 'blocked-remediation-write-allowed',
        user_message: 'Ghi trong phạm vi khắc phục được khai báo cho block hiện tại là được phép.',
        enforcement: 'hard',
      };
    }
  }

  if (request.action_kind === 'shell' && remediation.allowed_actions.includes('run-command')) {
    const trimmedCmd = commandStr.trim();
    const trimmedRecoverCmd = (remediation.next_command || '').trim();
    if (trimmedCmd && trimmedRecoverCmd && trimmedCmd === trimmedRecoverCmd) {
      return {
        decision: 'allow',
        reason_code: 'blocked-remediation-verify-allowed',
        user_message: 'Lệnh khắc phục chính xác (recoverable_by) được phép.',
        enforcement: 'hard',
      };
    }
  }

  return {
    decision: 'deny',
    reason_code: 'state-blocked',
    user_message: `Quy trình thực thi đang bị chặn (blocked). Lý do: ${execState!.block_reason?.detail || 'Không rõ lý do.'}. Vui lòng chạy đúng lệnh khắc phục được chỉ định.`,
    enforcement: 'hard',
  };
}
