import { classifyCommand } from '../classifyCommand.js';
import type { PreActionDecision } from '../schemas/index.js';
import type { PhaseContext } from './types.js';
import { authorizeMutation, collectCatalogEntries } from './shared.js';

/**
 * `plan-validating` phase: reads allowed; writes limited to design/docs/engine
 * scope but routed through the same catalog-aware authorizeMutation the other
 * phases use (P4.2/DEBT2 — not a bare 3-prefix blanket allow); non-CLI shell
 * must prove read-only.
 */
export function phasePlanValidating(ctx: PhaseContext): PreActionDecision {
  const { request, workspace, resolvedPaths, commandStr, baseCmd } = ctx;

  if (request.action_kind === 'read') {
    return { decision: 'allow', reason_code: 'read-only-allowed', user_message: 'Đọc tệp được phép.', enforcement: 'hard' };
  }

  if (request.action_kind === 'write') {
    const isAllDocs = resolvedPaths.every(
      (p) => p.startsWith('Design/') || p.startsWith('docs/') || p.startsWith('.design-everything/')
    );
    if (!isAllDocs) {
      return {
        decision: 'deny',
        reason_code: 'PLAN_VALIDATION_REQUIRED',
        user_message: 'Không có task hoạt động (active_task) nào đang chạy. Vui lòng chạy lệnh "validate" để bắt đầu quy trình.',
        enforcement: 'hard',
      };
    }

    // A catalog that fails to load degrades to empty entries (best-effort, same
    // as the interview-phase branch) — every path falls through to user-owned.
    const catalogEntries = collectCatalogEntries(workspace);
    for (const targetPath of resolvedPaths) {
      const auth = authorizeMutation('write', 'agent-host', targetPath, undefined, catalogEntries);
      if (auth.decision === 'deny') {
        return { decision: 'deny', reason_code: auth.reason_code, user_message: auth.user_message, enforcement: 'hard' };
      }
    }
    return {
      decision: 'allow',
      reason_code: 'plan-validating-write-allowed',
      user_message: 'Được phép sửa đổi kế hoạch và tài liệu thiết kế.',
      enforcement: 'hard',
    };
  }

  if (request.action_kind === 'shell') {
    // CLI-shaped invocations are already decided by the orchestrator.
    const classification = classifyCommand({ argv: request.command_argv, raw: commandStr, cwd: request.workspace });
    if (classification.outcome === 'proven_read_only') {
      return { decision: 'allow', reason_code: classification.reason_code, user_message: classification.message, enforcement: 'hard' };
    }
    return {
      decision: 'deny',
      reason_code: classification.reason_code,
      user_message: `Lệnh "${baseCmd}" bị chặn trong pha validate kế hoạch (${classification.message}). Vui lòng chạy lệnh "validate" trước.`,
      enforcement: 'hard',
    };
  }

  return { decision: 'deny', reason_code: 'unsupported-action', user_message: 'Hành động không được hỗ trợ.', enforcement: 'hard' };
}
