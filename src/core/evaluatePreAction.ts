import {
  PreActionRequest,
  PreActionDecision,
  AdapterCapability,
  Progress,
} from './schemas/index.js';
import type { PhaseContext } from './preAction/types.js';
import { classifyCliShellCommand, collectDeepenPending, isBootstrapCliInvocation } from './preAction/shared.js';
import {
  checkHealth,
  normalizeTargetPaths,
  scanShellCommand,
  loadExecStateGuard,
  loadProgressGuard,
} from './preAction/guards.js';
import { phaseInterview } from './preAction/phaseInterview.js';
import { phaseBlocked } from './preAction/phaseBlocked.js';
import { phasePlanValidating } from './preAction/phasePlanValidating.js';
import { phaseExecuting } from './preAction/phaseExecuting.js';

/**
 * Pre-action policy entry point. This orchestrator runs the phase-independent
 * guards (health, capability, path canonicalization, shell-operator scan,
 * state/progress load, CLI-shell authority, EXECUTION_STATE_REQUIRED gate),
 * then dispatches to exactly one phase handler in ./preAction/. The heavy
 * per-phase logic lives in those modules (B4a — keep this file a thin
 * orchestrator, never re-gather policy into one giant function).
 */
export function evaluatePreAction(
  request: PreActionRequest,
  capability?: AdapterCapability
): PreActionDecision {
  const decision = evaluatePreActionInner(request, capability);
  if (decision.decision === 'allow') {
    const pending = collectDeepenPending(request.workspace);
    if (pending.length > 0) return { ...decision, deepen_pending: pending };
  }
  return decision;
}

function evaluatePreActionInner(
  request: PreActionRequest,
  capability?: AdapterCapability
): PreActionDecision {
  const workspace = request.workspace;

  // 0. Fail-closed runtime health check.
  const healthDeny = checkHealth(request, workspace);
  if (healthDeny) return healthDeny;

  // 1. Capability interception.
  if (capability && !capability.intercepts.includes(request.tool_name)) {
    return {
      decision: 'allow',
      reason_code: 'unsupported-tool',
      user_message: `Tool "${request.tool_name}" không được hỗ trợ intercept bởi adapter hiện tại.`,
      enforcement: 'unsupported',
    };
  }

  // 2. Path normalization & traversal check.
  const paths = normalizeTargetPaths(workspace, request.target_paths);
  if (!paths.ok) return paths.deny;
  const resolvedPaths = paths.paths;

  // 3. Command argv shell-operator / git-mutation scan.
  const scan = scanShellCommand(request);
  if (!scan.ok) return scan.deny;
  const { commandStr, baseCmd } = scan;

  // 4. Load execution state.
  const stateRes = loadExecStateGuard(request, workspace);
  if (!stateRes.ok) return stateRes.deny;
  const execState = stateRes.execState;

  // 5. Load progress from the canonical interview store. H1 — a bootstrap
  // CLI invocation (`init`/`repair`/`status`/`help`) is exempt from failing
  // closed here: those subcommands exist to diagnose or recover a missing/
  // corrupt store, so requiring a healthy store to reach them deadlocks the
  // exact recovery path Core's own error messages point to. When the store
  // IS actually loadable (e.g. `status` mid-interview, `init` on an already-
  // initialized workspace), still load it — the phase dispatch below needs
  // real progress whenever it exists. Only the STORE_MISSING/STORE_CORRUPT
  // failure is swallowed, and only for this subcommand set; step 6 below
  // (classifyCliShellCommand) remains the real allow/deny authority for the
  // exact subcommand, this just lets it be reached instead of pre-empted.
  let progress: Progress | null = null;
  let canonicalRevision: number | null = null;
  if (request.action_kind === 'shell' && isBootstrapCliInvocation(request.command_argv)) {
    const best = loadProgressGuard(request, workspace, execState);
    if (best.ok) {
      progress = best.progress;
      canonicalRevision = best.canonicalRevision;
    }
  } else {
    const progRes = loadProgressGuard(request, workspace, execState);
    if (!progRes.ok) return progRes.deny;
    progress = progRes.progress;
    canonicalRevision = progRes.canonicalRevision;
  }

  // 6. A CLI-shaped shell invocation gets Core's own subcommand+phase authority
  // here, ahead of every phase branch (mirroring where the removed .mjs wrapper
  // authority used to decide CLI commands: unconditionally, before phase logic).
  // Exception: a 'blocked' phase keeps its own strictly tighter recoverable_by
  // gate, so the generic subcommand table must not run for it.
  if (request.action_kind === 'shell' && execState?.phase !== 'blocked') {
    const cliResult = classifyCliShellCommand(request.command_argv, progress?.phase);
    if (cliResult) {
      return { ...cliResult, enforcement: 'hard' };
    }
  }

  // 7. EXECUTION_STATE_REQUIRED gate. `ready-for-validation` is the successor of
  // the retired `ready-to-build` phase (docs emitted, code gate NOT open until
  // /build creates execution-state.json) and must stay OUT of this exclusion
  // list — only genuinely mid-interview phases are exempt. Leaving it excluded
  // let a workspace with docs emitted but no execution-state.json fall through
  // to the interview-time gate and get allowed to write code, silently
  // reopening the gate this check exists to keep shut.
  if (!execState && progress && progress.phase !== 'interview' && progress.phase !== 'docs-emitted') {
    return {
      decision: 'deny',
      reason_code: 'EXECUTION_STATE_REQUIRED',
      user_message: 'Thiếu tệp trạng thái thực thi (execution-state.json). Vui lòng hoàn tất phỏng vấn và chạy /build để validate kế hoạch trước khi viết code.',
      enforcement: 'hard',
    };
  }

  // 8. Dispatch to exactly one phase handler.
  const ctx: PhaseContext = { request, workspace, resolvedPaths, commandStr, baseCmd, execState, progress, canonicalRevision };

  if (!execState) return phaseInterview(ctx);
  if (execState.phase === 'blocked') return phaseBlocked(ctx);
  if (execState.phase === 'plan-validating') return phasePlanValidating(ctx);
  return phaseExecuting(ctx);
}
