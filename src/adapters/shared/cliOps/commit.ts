import { join } from 'path';
import { canonicalizeWorkspacePath, commitInterviewAnswer, loadSlotsFile } from '../../../core/index.js';
import { CliResultEnvelope } from '../cliResult.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../../../version.js';
import { getArg } from './support.js';

export function handleCommit(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const branchChoice = getArg(argv, '--branch');
  const calibrateChoice = getArg(argv, '--calibrate');
  const capabilityToken = getArg(argv, '--capability-token');
  const answerText = getArg(argv, '--answer');
  const slotsFileArg = getArg(argv, '--slots-file');
  const ackWarnings = argv.includes('--ack-warnings');

  if (!capabilityToken) {
    return {
      ok: false,
      operation: 'commit',
      reason_code: 'TURN_CAPABILITY_MISSING',
      severity: 'error',
      message:
        'Thiếu --capability-token. Commit chỉ được phép bằng token do UserPromptSubmit phát hành ' +
        'cho đúng lượt/câu hỏi hiện tại — không dùng --turn tự đặt.',
      runtime_version: RUNTIME_VERSION,
    };
  }

  let slotsPayload: Record<string, string> | undefined;
  if (slotsFileArg) {
    const canon = canonicalizeWorkspacePath(workspaceRoot, slotsFileArg);
    if (!canon.ok) {
      return {
        ok: false,
        operation: 'commit',
        reason_code: 'INVALID_SLOTS_FILE',
        severity: 'error',
        message: `Tệp slots nằm ngoài workspace: ${canon.message}`,
        runtime_version: RUNTIME_VERSION,
      };
    }
    // P6.3 — the file's content is now actually read and committed, not just
    // checked for existence. join() against workspaceRoot also fixes a latent
    // bug: canon.canonicalPath is workspace-relative, so the prior
    // existsSync(canon.canonicalPath) resolved against process.cwd() instead
    // of the target workspace.
    const absSlotsPath = join(workspaceRoot, canon.canonicalPath);
    const loaded = loadSlotsFile(absSlotsPath);
    if (!loaded.ok) {
      return {
        ok: false,
        operation: 'commit',
        reason_code: loaded.reason_code,
        severity: 'error',
        message: loaded.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    slotsPayload = loaded.slots;
  }

  const result = commitInterviewAnswer(workspaceRoot, {
    capabilityToken,
    branchChoice,
    calibrateChoice,
    answerText,
    ackWarnings,
    slotsPayload,
  });

  if (!result.ok) {
    if (result.reason_code === 'STORE_MISSING') {
      return {
        ok: false,
        operation: 'commit',
        reason_code: 'PROGRESS_MISSING',
        severity: 'error',
        message: `Không tìm thấy canonical interview store để commit: ${result.message}`,
        next_command: TARGET_LOCAL_INIT_COMMAND,
        runtime_version: RUNTIME_VERSION,
      };
    }
    if (result.reason_code === 'STORE_CORRUPT') {
      return {
        ok: false,
        operation: 'commit',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        severity: 'error',
        message: `Khong the nap canonical interview store: ${result.message}`,
        next_command: targetLocalCliCommand('repair'),
        runtime_version: RUNTIME_VERSION,
      };
    }
    // SCRIPT_MISSING, answer-validation codes (EMPTY_ANSWER/PLACEHOLDER_ANSWER_DENIED/...),
    // and commitStep's own capability reason codes (TURN_CAPABILITY_*) pass through as-is
    // (B4c: surface the exact code instead of collapsing into one generic failure).
    return {
      ok: false,
      operation: 'commit',
      reason_code: result.reason_code,
      severity: 'error',
      message: `Lỗi commit bước phỏng vấn: ${result.message}`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: true,
    operation: 'commit',
    reason_code: 'COMMIT_SUCCESS',
    severity: 'info',
    message: `Đã commit bước phỏng vấn thành công. Bước tiếp theo: ${result.progress.current_step || 'hoàn tất'}.`,
    data: { progress: result.progress },
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
  };
}
