import { join } from 'path';
import { existsSync } from 'fs';
import { getActiveManagedPaths } from '../gateSnapshot.js';
import { classifyCommand } from '../classifyCommand.js';
import type { PreActionDecision } from '../schemas/index.js';
import type { PhaseContext } from './types.js';
import { authorizeMutation, collectCatalogEntries } from './shared.js';
import { evaluateInterviewGate } from './phaseInterviewGate.js';

/**
 * Interview phase (no execution-state.json yet). Reads are allowed; doc writes
 * route through the catalog-aware authorizeMutation (pre-create only for a not
 * yet claimed managed path); non-CLI shell must prove read-only. A non-doc
 * write that survives ownership falls through to the gate-policy fallback.
 */
export function phaseInterview(ctx: PhaseContext): PreActionDecision {
  const { request, workspace, resolvedPaths, progress } = ctx;

  if (request.action_kind === 'read') {
    return { decision: 'allow', reason_code: 'read-only-allowed', user_message: 'Đọc tệp được phép.', enforcement: 'hard' };
  }

  if (request.action_kind === 'write') {
    const isDocWrite = resolvedPaths.every(
      (p) => p.startsWith('Design/') || p.startsWith('docs/') || p.startsWith('.design-everything/scratch/') || p === 'progress.json'
    );
    // P4.2/X02 — a managed-output path only denies when already "claimed" (on
    // disk, or part of the active tier-1 emit manifest). A managed path that is
    // neither is a genuine interview-phase pre-create, which stays allowed.
    const catalogEntries = collectCatalogEntries(workspace);
    const activeManagedPaths = isDocWrite ? getActiveManagedPaths(workspace) : new Set<string>();
    // P4.2/R07 — bind scratch writes to the caller's real session and the
    // interview's actual current question, not just any well-shaped pair.
    const scratchContext = isDocWrite ? { sessionId: request.session_id, questionId: progress?.current_step ?? null } : undefined;
    for (const targetPath of resolvedPaths) {
      const options = isDocWrite
        ? {
            preCreateAllowed: !activeManagedPaths.has(targetPath) && !existsSync(join(workspace, targetPath)),
            scratchContext,
            contentSizeBytes: request.content_size_bytes,
          }
        : undefined;
      const auth = authorizeMutation('write', 'agent-host', targetPath, undefined, catalogEntries, options);
      if (auth.decision === 'deny') {
        return { decision: 'deny', reason_code: auth.reason_code, user_message: auth.user_message, enforcement: 'hard' };
      }
    }
    if (isDocWrite) {
      return { decision: 'allow', reason_code: 'interview-doc-write-allowed', user_message: 'Ghi tài liệu được phép.', enforcement: 'hard' };
    }
  }

  if (request.action_kind === 'shell') {
    // CLI-shaped invocations are already decided by the universal check in the
    // orchestrator; anything reaching here is confirmed non-CLI.
    const reqExt = request as unknown as { shell_kind?: string; command?: string };
    const classification = classifyCommand({
      shell: reqExt.shell_kind,
      raw: request.command_raw ?? reqExt.command,
      argv: request.command_argv,
      cwd: request.workspace,
    });

    if (classification.outcome === 'proven_read_only') {
      return { decision: 'allow', reason_code: classification.reason_code, user_message: classification.message, enforcement: 'hard' };
    }
    return { decision: 'deny', reason_code: classification.reason_code, user_message: classification.message, enforcement: 'hard' };
  }

  // Non-doc write that survived ownership → gate-policy fallback.
  return evaluateInterviewGate(ctx);
}
