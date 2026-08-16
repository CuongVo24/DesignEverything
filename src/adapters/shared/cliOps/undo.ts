import { undoLastAnswer } from '../../../core/index.js';
import { CliResultEnvelope } from '../cliResult.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../../../version.js';

// B24a (D59) — compensating control for dropping the mandatory
// translate-back confirmation card: undo the single most recently
// answered question. No flags — the CLI surface for this subcommand is
// intentionally empty (see commandSurface.ts), mirroring status/init.
export function handleUndo(workspaceRoot: string): CliResultEnvelope {
  const result = undoLastAnswer(workspaceRoot);

  if (!result.ok) {
    if (result.reason_code === 'STORE_MISSING') {
      return {
        ok: false,
        operation: 'undo',
        reason_code: 'PROGRESS_MISSING',
        severity: 'error',
        message: `Không tìm thấy canonical interview store để undo: ${result.message}`,
        next_command: TARGET_LOCAL_INIT_COMMAND,
        runtime_version: RUNTIME_VERSION,
      };
    }
    if (result.reason_code === 'STORE_CORRUPT') {
      return {
        ok: false,
        operation: 'undo',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        severity: 'error',
        message: `Khong the nap canonical interview store: ${result.message}`,
        next_command: targetLocalCliCommand('repair'),
        runtime_version: RUNTIME_VERSION,
      };
    }
    // UNDO_DENIED_AFTER_EMIT / UNDO_DENIED_NOTHING_ANSWERED / SCRIPT_MISSING
    // pass through as-is (same B4c rule commit.ts follows).
    return {
      ok: false,
      operation: 'undo',
      reason_code: result.reason_code,
      severity: 'error',
      message: `Lỗi undo: ${result.message}`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: true,
    operation: 'undo',
    reason_code: 'UNDO_SUCCESS',
    severity: 'info',
    message: `Đã hoàn tác câu ${result.undone_question_id}. Bước hiện tại: ${result.progress.current_step || 'hoàn tất'}.`,
    data: { progress: result.progress, undone_question_id: result.undone_question_id },
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
  };
}
