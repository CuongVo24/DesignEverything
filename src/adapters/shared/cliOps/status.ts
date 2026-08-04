import { join } from 'path';
import { existsSync } from 'fs';
import {
  inspectRuntimeHealth,
  loadExecutionState,
  ensureCanonicalStore,
  migrateInterviewStore,
  initializeInterviewStore,
  recoverEmit,
  deepenModuleIdSchema,
  ExecutionState,
} from '../../../core/index.js';
import { renderNextStep } from '../renderNextStep.js';
import { CliResultEnvelope, redactInternalError } from '../cliResult.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../../../version.js';

export function handleStatus(workspaceRoot: string): CliResultEnvelope {
  const health = inspectRuntimeHealth(workspaceRoot);
  if (health.status === 'broken') {
    const primaryIssue = health.issues[0];
    return {
      ok: false,
      operation: 'status',
      reason_code: primaryIssue?.reason_code || 'RUNTIME_HEALTH_BROKEN',
      severity: 'error',
      message: `Runtime state bị hỏng: ${primaryIssue?.detail || 'State corrupted'}`,
      next_command: primaryIssue?.safe_next_command || targetLocalCliCommand('repair'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  const canonicalOutcome = ensureCanonicalStore(workspaceRoot);
  if (canonicalOutcome.status === 'uninvolved' && health.status === 'uninvolved') {
    return {
      ok: true,
      operation: 'status',
      reason_code: 'UNINVOLVED',
      severity: 'info',
      message: 'Dự án chưa được khởi tạo với DesignEverything.',
      next_command: TARGET_LOCAL_INIT_COMMAND,
      runtime_version: RUNTIME_VERSION,
    };
  }

  let progress = null;
  if (canonicalOutcome.status === 'ready') {
    progress = canonicalOutcome.envelope.payload.progress;
  } else if (canonicalOutcome.status === 'corrupt') {
    return {
      ok: false,
      operation: 'status',
      reason_code: 'CORRUPT_PROGRESS_STATE',
      severity: 'error',
      message: `Khong the nap canonical interview store: ${canonicalOutcome.message}`,
      next_command: targetLocalCliCommand('repair --state progress'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  let execState: ExecutionState | null = null;
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  if (existsSync(execStatePath)) {
    try {
      execState = loadExecutionState(execStatePath);
    } catch {
      // Ignore
    }
  }

  const card = renderNextStep(null, execState, null);

  return {
    ok: true,
    operation: 'status',
    reason_code: 'STATUS_HEALTHY',
    severity: 'info',
    message: card.now || 'Trạng thái dự án bình thường.',
    data: {
      progress,
      execState,
      nextStepCard: card,
    },
    next_command: card.nextCommand || targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
  };
}

export function handleInit(workspaceRoot: string): CliResultEnvelope {
  try {
    const migrated = migrateInterviewStore(workspaceRoot);
    if (migrated === 'no-legacy') {
      initializeInterviewStore(workspaceRoot);
    }
    return {
      ok: true,
      operation: 'init',
      reason_code: 'INIT_SUCCESS',
      severity: 'info',
      message: 'Đã khởi tạo thành công trạng thái DesignEverything.',
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'init',
      reason_code: 'INIT_FAILED',
      severity: 'error',
      message: `Lỗi khởi tạo trạng thái: ${redactInternalError((err as Error).message)}`,
      runtime_version: RUNTIME_VERSION,
    };
  }
}

export function handleRepair(workspaceRoot: string): CliResultEnvelope {
  try {
    recoverEmit(workspaceRoot, 'tier1');
    // P7.2.4 — the coarse 'tier2' channel is dead: emitTier2 (P7.2.3) writes
    // generation/journal files per module (tier2-${module}), so recovering
    // only the coarse channel was always a no-op. Recover every module's
    // own channel instead.
    for (const module of deepenModuleIdSchema.options) {
      recoverEmit(workspaceRoot, `tier2-${module}`);
    }
    // Opportunistic: migrate legacy interview state to canonical if any
    // exists. This must not abort the tier1/tier2 recovery above on failure
    // — a legacy conflict migrateInterviewStore refuses to resolve on its own
    // (R02/B1b fail-closed guards) is a distinct, separately-surfaced issue,
    // not a reason to report the whole repair as failed when the journal
    // recovery it was actually asked to do already succeeded.
    // migrateInterviewStore never partially writes on failure (it throws
    // before any write), so skipping it here loses no data and fabricates no
    // state — a later `status`/`init` will still hit the same guard.
    try {
      migrateInterviewStore(workspaceRoot);
    } catch {
      // Surfaced via inspectRuntimeHealth below when the workspace actually
      // has progress.json/interview-state.json for it to inspect.
    }
    const health = inspectRuntimeHealth(workspaceRoot);

    return {
      ok: health.status !== 'broken',
      operation: 'repair',
      reason_code: health.status === 'broken' ? 'REPAIR_PARTIAL' : 'REPAIR_SUCCESS',
      severity: health.status === 'broken' ? 'warning' : 'info',
      message:
        health.status === 'broken'
          ? 'Đã thực hiện khôi phục nhưng vẫn còn cảnh báo sức khỏe.'
          : 'Khôi phục và sửa chữa trạng thái thành công.',
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'repair',
      reason_code: 'REPAIR_FAILED',
      severity: 'error',
      message: `Lỗi khôi phục trạng thái: ${redactInternalError((err as Error).message)}`,
      runtime_version: RUNTIME_VERSION,
    };
  }
}
