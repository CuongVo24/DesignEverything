import { ensureTier1Handoff } from '../../core/index.js';
import { CliResultEnvelope } from './cliResult.js';
import { handleDeepen } from './deepenCliOperations.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../version.js';
import { CLI_COMMAND_SURFACE, CLI_GLOBAL_FLAGS } from './cliOps/commandSurface.js';
import { handleStatus, handleInit, handleRepair } from './cliOps/status.js';
import { handleCommit } from './cliOps/commit.js';
import { handleUndo } from './cliOps/undo.js';
import { handleValidate } from './cliOps/validate.js';
import { handleEmit } from './cliOps/emit.js';
import { handleNext } from './cliOps/next.js';
import { handleStart } from './cliOps/start.js';
import { handleVerify } from './cliOps/verify.js';
import { handleReview } from './cliOps/review.js';

// B4c — thin launcher: parses the subcommand, runs the one cross-cutting guard
// (handoff-recovery-required), and dispatches. Every actual operation's logic
// lives in ./cliOps/*.ts (each under 200 hand-authored lines).
export { CLI_COMMAND_SURFACE, CLI_GLOBAL_FLAGS };

export async function runCliOperation(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
  const subIndex = argv.findIndex((arg) => !arg.endsWith('.mjs') && !arg.endsWith('.js') && arg !== 'node');
  const subcommand = subIndex !== -1 ? argv[subIndex].toLowerCase() : 'status';

  // P3: never manufacture state from an activated manifest. An in-flight
  // handoff journal must be repaired/rolled back explicitly before any other
  // operation can observe or act on the partly promoted generation.
  const handoffHealth = ensureTier1Handoff(workspaceRoot);
  if (handoffHealth === 'recovery-required' && subcommand !== 'repair') {
    return {
      ok: false,
      operation: subcommand,
      reason_code: 'EMIT_HANDOFF_RECOVERY_REQUIRED',
      severity: 'error',
      message: 'Tier-1 emit chưa hoàn tất; hãy chạy repair để khôi phục transaction trước khi tiếp tục.',
      next_command: targetLocalCliCommand('repair'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  switch (subcommand) {
    case 'status':
      return handleStatus(workspaceRoot);
    case 'init':
      return handleInit(workspaceRoot);
    case 'commit':
      return handleCommit(workspaceRoot, argv);
    case 'undo':
      return handleUndo(workspaceRoot);
    case 'validate':
    case 'build':
      return handleValidate(workspaceRoot);
    case 'repair':
      return handleRepair(workspaceRoot);
    case 'emit':
      return handleEmit(workspaceRoot, argv);
    case 'next':
      return handleNext(workspaceRoot);
    case 'start':
      return handleStart(workspaceRoot, argv);
    case 'verify':
      return handleVerify(workspaceRoot, argv);
    case 'review':
      return handleReview(workspaceRoot, argv);
    case 'deepen':
      return handleDeepen(workspaceRoot, argv);
    default:
      return {
        ok: false,
        operation: subcommand,
        reason_code: 'UNKNOWN_SUBCOMMAND',
        severity: 'error',
        message: `Subcommand "${subcommand}" không được hỗ trợ. Sử dụng: status, init, commit, undo, validate, emit, repair, next, start, verify, review, deepen.`,
        next_command: targetLocalCliCommand('status'),
        runtime_version: RUNTIME_VERSION,
      };
  }
}
