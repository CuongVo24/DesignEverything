import { existsSync } from 'fs';
import { join } from 'path';
import {
  loadDeepenScript,
  loadDeepenState,
  emitTier2,
  deepenModuleIdSchema,
  listDeepenStatus,
  optInDeepenModule,
  issueDeepenCapability,
  commitDeepen,
} from '../../core/index.js';
import { CliResultEnvelope } from './cliResult.js';
import { RUNTIME_VERSION, TARGET_LOCAL_CLI_COMMAND } from '../../version.js';

const CLI = TARGET_LOCAL_CLI_COMMAND;

function getArg(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--') ? argv[idx + 1] : undefined;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

/**
 * P10/X01 — the tier-2 (deepen) command surface both SKILL.md files
 * document (`deepen [--json]`, `--module <id> --opt-in|--next|--commit|
 * --emit`) but that `runCliOperation` had no `case 'deepen'` for at all
 * (H0/plan-v1-bonus-tasks.md finding X01) — every documented shape fell
 * through to UNKNOWN_SUBCOMMAND. The core logic this wires into
 * (deepenState.ts, deepenLifecycle.ts, emitTier2.ts) already existed and was
 * fully unit/e2e-tested (P7.2); this is its first CLI caller.
 */
export function handleDeepen(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const moduleArg = getArg(argv, '--module');

  if (!moduleArg) {
    const statuses = listDeepenStatus(workspaceRoot);
    if (!Array.isArray(statuses)) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: statuses.reason_code,
        severity: 'error',
        message: statuses.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    return {
      ok: true,
      operation: 'deepen',
      reason_code: 'DEEPEN_STATUS',
      severity: 'info',
      message: 'Trạng thái các module deepen (tầng 2).',
      data: { modules: statuses },
      runtime_version: RUNTIME_VERSION,
    };
  }

  const parsedModule = deepenModuleIdSchema.safeParse(moduleArg);
  if (!parsedModule.success) {
    return {
      ok: false,
      operation: 'deepen',
      reason_code: 'INVALID_DEEPEN_MODULE',
      severity: 'error',
      message: `Module deepen không hợp lệ: "${moduleArg}". Dùng: glossary, feature-spec, adr, test-strategy.`,
      runtime_version: RUNTIME_VERSION,
    };
  }
  const moduleId = parsedModule.data;

  if (hasFlag(argv, '--opt-in')) {
    const result = optInDeepenModule(workspaceRoot, moduleId);
    if (!result.ok) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: result.reason_code,
        severity: 'error',
        message: result.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    return {
      ok: true,
      operation: 'deepen',
      reason_code: 'DEEPEN_OPTED_IN',
      severity: 'info',
      message: `Module ${moduleId} đã opt-in.`,
      next_command: `${CLI} deepen --module ${moduleId} --next`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  if (hasFlag(argv, '--next')) {
    const result = issueDeepenCapability(workspaceRoot, moduleId);
    if (!result.ok) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: result.reason_code,
        severity: 'error',
        message: result.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    const subjectFlag = result.instance.subject_id ? ` --subject ${result.instance.subject_id}` : '';
    return {
      ok: true,
      operation: 'deepen',
      reason_code: 'DEEPEN_NEXT_QUESTION',
      severity: 'info',
      message: result.question_text,
      data: {
        module: result.module,
        question_id: result.instance.question_id,
        subject_id: result.instance.subject_id,
        target_doc: result.instance.target_doc,
        capability_token: result.capability_token,
      },
      next_command:
        `${CLI} deepen --module ${moduleId} --commit ` +
        `--capability-token <TOKEN> --question ${result.instance.question_id}${subjectFlag} --answer "..."`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  if (hasFlag(argv, '--commit')) {
    const capabilityToken = getArg(argv, '--capability-token');
    if (!capabilityToken) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: 'TURN_CAPABILITY_MISSING',
        severity: 'error',
        message:
          'Thiếu --capability-token. Commit chỉ được phép bằng token do "deepen --module <id> --next" ' +
          'phát hành cho đúng câu hỏi hiện tại — không dùng --turn tự đặt.',
        runtime_version: RUNTIME_VERSION,
      };
    }
    const questionId = getArg(argv, '--question');
    const answerText = getArg(argv, '--answer');
    const subjectId = getArg(argv, '--subject') ?? null;
    if (!questionId || answerText === undefined) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: 'MISSING_DEEPEN_ANSWER_ARGS',
        severity: 'error',
        message: 'Thiếu --question hoặc --answer.',
        runtime_version: RUNTIME_VERSION,
      };
    }
    const result = commitDeepen(workspaceRoot, {
      module: moduleId,
      questionId,
      subjectId,
      capabilityToken,
      answerText,
    });
    if (!result.ok) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: result.reason_code,
        severity: 'error',
        message: result.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    return {
      ok: true,
      operation: 'deepen',
      reason_code: 'DEEPEN_COMMIT_SUCCESS',
      severity: 'info',
      message: `Đã commit câu ${questionId}${subjectId ? `@${subjectId}` : ''} của module ${moduleId}.`,
      next_command: `${CLI} deepen --module ${moduleId} --next`,
      runtime_version: RUNTIME_VERSION,
    };
  }

  if (hasFlag(argv, '--emit')) {
    const scriptPath = join(workspaceRoot, 'Design/Content/interview-script/deepen-script.yaml');
    if (!existsSync(scriptPath)) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: 'DEEPEN_SCRIPT_MISSING',
        severity: 'error',
        message: 'Không tìm thấy deepen-script.yaml.',
        runtime_version: RUNTIME_VERSION,
      };
    }
    let script;
    try {
      script = loadDeepenScript(scriptPath);
    } catch (err: unknown) {
      return {
        ok: false,
        operation: 'deepen',
        reason_code: 'DEEPEN_SCRIPT_INVALID',
        severity: 'error',
        message: (err as Error).message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    const state = loadDeepenState(workspaceRoot);
    const result = emitTier2({ workspace: workspaceRoot, modules: [moduleId], script, state });
    const emitted = result.emitted.find((e) => e.module === moduleId);
    if (emitted) {
      return {
        ok: true,
        operation: 'deepen',
        reason_code: 'DEEPEN_EMIT_ACTIVATED',
        severity: 'info',
        message: `Đã emit module ${moduleId}: ${emitted.files.length} tệp.`,
        data: {
          files: emitted.files,
          warnings: emitted.warnings,
          ...(emitted.removed ? { removed: emitted.removed } : {}),
        },
        runtime_version: RUNTIME_VERSION,
      };
    }
    const skipped = result.skipped.find((s) => s.module === moduleId);
    const reasonSuffix = (skipped?.reason ?? 'unknown').toUpperCase().replace(/-/g, '_');
    return {
      ok: false,
      operation: 'deepen',
      reason_code: `DEEPEN_EMIT_${reasonSuffix}`,
      severity: 'error',
      message: skipped?.detail ?? `Emit module ${moduleId} bị bỏ qua: ${skipped?.reason ?? 'lý do không xác định'}.`,
      data: {
        ...(skipped?.missing ? { missing: skipped.missing } : {}),
        ...(skipped?.issues ? { issues: skipped.issues } : {}),
      },
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: false,
    operation: 'deepen',
    reason_code: 'USAGE_ERROR',
    severity: 'error',
    message:
      'deepen cần một trong các cờ: --opt-in, --next, --commit, --emit (hoặc không có --module để xem trạng thái).',
    runtime_version: RUNTIME_VERSION,
  };
}
