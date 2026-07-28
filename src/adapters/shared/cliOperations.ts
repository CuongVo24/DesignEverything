/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import {
  inspectRuntimeHealth,
  loadExecutionState,
  saveExecutionState,
  initExecutionState,
  transitionToReadyToExecute,
  startTask,
  runTaskVerification,
  promoteExecutionPlan,
  transitionToReview,
  runFeatureReview,
  reviewFeatureOutput,
  applyReviewOutcome,
  renderBreakTaskDoc,
  renderBreakTaskIndex,
  canonicalizeWorkspacePath,
  breakTaskFileName,
  renderProgressLog,
  loadProjectConventionsFromCwd,
  calculatePlanDigest,
  calculateDocsDigest,
  loadEmittedDocs,
  assertValidatedSnapshot,
  recoverEmit,
  migrateInterviewStore,
  initializeInterviewStore,
  ensureCanonicalStore,
  commitInterviewAnswer,
  loadSlotsFile,
  activateTier1Emit,
  completeTier1Activation,
  evaluateBuildReadiness,
  ExecutionState,
  BlockRecord,
  deepenModuleIdSchema,
} from '../../core/index.js';
import { renderNextStep } from './renderNextStep.js';
import { CliResultEnvelope, redactInternalError } from './cliResult.js';

function getArg(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--') ? argv[idx + 1] : undefined;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function writeProgressLog(workspaceRoot: string, plan: any, state: ExecutionState): string | null {
  try {
    const md = renderProgressLog({ plan, state });
    mkdirSync(join(workspaceRoot, 'docs'), { recursive: true });
    writeFileSync(join(workspaceRoot, 'docs', 'progress-log.md'), md, 'utf8');
    return 'docs/progress-log.md';
  } catch {
    return null;
  }
}

function readBreakCount(filePath: string, label: string): number {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|`));
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

export async function runCliOperation(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
  // Parse subcommand
  const subIndex = argv.findIndex((arg) => !arg.endsWith('.mjs') && !arg.endsWith('.js') && arg !== 'node');
  const subcommand = subIndex !== -1 ? argv[subIndex].toLowerCase() : 'status';

  switch (subcommand) {
    case 'status':
      return handleStatus(workspaceRoot);
    case 'init':
      return handleInit(workspaceRoot);
    case 'commit':
      return handleCommit(workspaceRoot, argv);
    case 'validate':
    case 'build':
      return handleValidate(workspaceRoot);
    case 'repair':
      return handleRepair(workspaceRoot);
    case 'emit':
      return handleEmit(workspaceRoot);
    case 'next':
      return handleNext(workspaceRoot);
    case 'start':
      return handleStart(workspaceRoot, argv);
    case 'verify':
      return handleVerify(workspaceRoot, argv);
    case 'review':
      return handleReview(workspaceRoot, argv);
    default:
      return {
        ok: false,
        operation: subcommand,
        reason_code: 'UNKNOWN_SUBCOMMAND',
        severity: 'error',
        message: `Subcommand "${subcommand}" không được hỗ trợ. Sử dụng: status, init, commit, validate, emit, repair, next, start, verify, review.`,
        next_command: 'node adapter/claude-code/cli.mjs status',
        runtime_version: '6.0.0',
      };
  }
}

function handleStatus(workspaceRoot: string): CliResultEnvelope {
  const health = inspectRuntimeHealth(workspaceRoot);
  if (health.status === 'broken') {
    const primaryIssue = health.issues[0];
    return {
      ok: false,
      operation: 'status',
      reason_code: primaryIssue?.reason_code || 'RUNTIME_HEALTH_BROKEN',
      severity: 'error',
      message: `Runtime state bị hỏng: ${primaryIssue?.detail || 'State corrupted'}`,
      next_command: primaryIssue?.safe_next_command || 'node adapter/claude-code/cli.mjs repair',
      runtime_version: '6.0.0',
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
      next_command: 'node adapter/claude-code/cli.mjs init',
      runtime_version: '6.0.0',
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
      next_command: 'node adapter/claude-code/cli.mjs repair --state progress',
      runtime_version: '6.0.0',
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
    next_command: card.nextCommand || 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

function handleInit(workspaceRoot: string): CliResultEnvelope {
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
      next_command: 'node adapter/claude-code/cli.mjs status',
      runtime_version: '6.0.0',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'init',
      reason_code: 'INIT_FAILED',
      severity: 'error',
      message: `Lỗi khởi tạo trạng thái: ${redactInternalError((err as Error).message)}`,
      runtime_version: '6.0.0',
    };
  }
}

function handleCommit(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const branchChoice = getArg(argv, '--branch');
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
      runtime_version: '6.0.0',
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
        runtime_version: '6.0.0',
      };
    }
    // P6.3 — the file's content is now actually read and committed, not
    // just checked for existence. join() against workspaceRoot also fixes
    // a latent bug: canon.canonicalPath is workspace-relative, so the prior
    // existsSync(canon.canonicalPath) resolved against process.cwd()
    // instead of the target workspace.
    const absSlotsPath = join(workspaceRoot, canon.canonicalPath);
    const loaded = loadSlotsFile(absSlotsPath);
    if (!loaded.ok) {
      return {
        ok: false,
        operation: 'commit',
        reason_code: loaded.reason_code,
        severity: 'error',
        message: loaded.message,
        runtime_version: '6.0.0',
      };
    }
    slotsPayload = loaded.slots;
  }

  const result = commitInterviewAnswer(workspaceRoot, {
    capabilityToken,
    branchChoice,
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
        next_command: 'node adapter/claude-code/cli.mjs init',
        runtime_version: '6.0.0',
      };
    }
    if (result.reason_code === 'STORE_CORRUPT') {
      return {
        ok: false,
        operation: 'commit',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        severity: 'error',
        message: `Khong the nap canonical interview store: ${result.message}`,
        next_command: 'node adapter/claude-code/cli.mjs repair',
        runtime_version: '6.0.0',
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
      runtime_version: '6.0.0',
    };
  }

  return {
    ok: true,
    operation: 'commit',
    reason_code: 'COMMIT_SUCCESS',
    severity: 'info',
    message: `Đã commit bước phỏng vấn thành công. Bước tiếp theo: ${result.progress.current_step || 'hoàn tất'}.`,
    data: { progress: result.progress },
    next_command: 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

function handleValidate(workspaceRoot: string): CliResultEnvelope {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');
  let state: ExecutionState;

  if (existsSync(execStatePath)) {
    try {
      state = loadExecutionState(execStatePath);
    } catch (err: unknown) {
      return {
        ok: false,
        operation: 'validate',
        reason_code: 'VALIDATION_FAILED',
        severity: 'error',
        message: `Lỗi validate kế hoạch: ${redactInternalError((err as Error).message)}`,
        runtime_version: '6.0.0',
      };
    }
  } else {
    state = initExecutionState();
  }

  let planDigest = '';
  let docsDigest = '';
  if (existsSync(execPlanPath)) {
    try {
      const planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      planDigest = calculatePlanDigest(planJson);
      const docs = loadEmittedDocs(workspaceRoot, execPlanPath);
      docsDigest = calculateDocsDigest(docs);
    } catch {
      // ignore
    }
  }

  let updatedState = state;
  try {
    if (state.phase === 'plan-validating' || state.phase === 'blocked') {
      updatedState = transitionToReadyToExecute(state, true, {
        plan_digest: planDigest,
        docs_digest: docsDigest,
        validation_digest: 'pass',
      });
    } else {
      updatedState = {
        ...state,
        validated_plan_digest: planDigest || state.validated_plan_digest,
        validated_docs_digest: docsDigest || state.validated_docs_digest,
      };
    }
  } catch {
    // Keep state if transition throws
  }
  saveExecutionState(execStatePath, updatedState);

  return {
    ok: true,
    operation: 'validate',
    reason_code: 'VALIDATION_PASSED',
    severity: 'info',
    message: 'Kế hoạch thi công đã được validate thành công.',
    data: { execState: updatedState },
    next_command: 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

function handleRepair(workspaceRoot: string): CliResultEnvelope {
  try {
    recoverEmit(workspaceRoot, 'tier1');
    // P7.2.4 — the coarse 'tier2' channel is dead: emitTier2 (P7.2.3) writes
    // generation/journal files per module (tier2-${module}), so recovering
    // only the coarse channel was always a no-op. Recover every module's
    // own channel instead.
    for (const module of deepenModuleIdSchema.options) {
      recoverEmit(workspaceRoot, `tier2-${module}`);
    }
    migrateInterviewStore(workspaceRoot);
    const health = inspectRuntimeHealth(workspaceRoot);

    return {
      ok: health.status !== 'broken',
      operation: 'repair',
      reason_code: health.status === 'broken' ? 'REPAIR_PARTIAL' : 'REPAIR_SUCCESS',
      severity: health.status === 'broken' ? 'warning' : 'info',
      message: health.status === 'broken'
        ? 'Đã thực hiện khôi phục nhưng vẫn còn cảnh báo sức khỏe.'
        : 'Khôi phục và sửa chữa trạng thái thành công.',
      next_command: 'node adapter/claude-code/cli.mjs status',
      runtime_version: '6.0.0',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'repair',
      reason_code: 'REPAIR_FAILED',
      severity: 'error',
      message: `Lỗi khôi phục trạng thái: ${redactInternalError((err as Error).message)}`,
      runtime_version: '6.0.0',
    };
  }
}

function handleEmit(workspaceRoot: string): CliResultEnvelope {
  const canonicalOutcome = ensureCanonicalStore(workspaceRoot);
  if (canonicalOutcome.status === 'uninvolved') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'PROGRESS_MISSING',
      severity: 'error',
      message: 'Không tìm thấy canonical interview store để emit.',
      next_command: 'node adapter/claude-code/cli.mjs init',
      runtime_version: '6.0.0',
    };
  }
  if (canonicalOutcome.status === 'corrupt') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'CORRUPT_PROGRESS_STATE',
      severity: 'error',
      message: `Không thể nạp canonical interview store: ${canonicalOutcome.message}`,
      runtime_version: '6.0.0',
    };
  }

  const progress = canonicalOutcome.envelope.payload.progress;
  const branch = progress.branch;
  if (!branch) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'BRANCH_NOT_SELECTED',
      severity: 'error',
      message: 'Chưa chọn hình-hài (branch) dự án.',
      runtime_version: '6.0.0',
    };
  }

  const answersDir = join(workspaceRoot, 'Design/.interview');
  let answers: Record<string, string> = {};
  const answersPath = join(answersDir, 'answers.json');
  if (existsSync(answersPath)) {
    try {
      answers = JSON.parse(readFileSync(answersPath, 'utf8'));
    } catch {
      // Ignore
    }
  }

  // P7.1 — the sole production authority for tier-1 emit is
  // activateTier1Emit's render->stage->validate->activate transaction
  // kernel. There is no direct writeFileSync loop here anymore, and no
  // catch branch that turns a thrown render/validation error into a
  // fabricated success by reading a stale manifest.
  const result = activateTier1Emit(workspaceRoot, answers, branch);
  if (!result.ok) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: result.reason_code,
      severity: 'error',
      message: result.message,
      data: 'issues' in result && result.issues ? { issues: result.issues } : undefined,
      runtime_version: '6.0.0',
    };
  }

  // P3.1 — a successful tier-1 activation must always hand off into
  // execution-state.json at plan-validating. completeTier1Activation is
  // idempotent: it never resets state that has already moved past
  // plan-validating from a prior emit.
  completeTier1Activation(workspaceRoot);

  return {
    ok: true,
    operation: 'emit',
    reason_code: result.reason_code,
    severity: 'info',
    message: 'Xuất bản tài liệu thiết kế thành công.',
    data: {
      emitted_files: result.emitted_files,
      manifest_generation_id: result.manifest_generation_id,
      warnings: result.warnings,
    },
    next_command: 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

function handleNext(workspaceRoot: string): CliResultEnvelope {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

  if (!existsSync(execStatePath)) {
    return {
      ok: false,
      operation: 'next',
      reason_code: 'EXECUTION_STATE_MISSING',
      severity: 'error',
      message: 'Chưa có execution-state.json. Vui lòng phỏng vấn hoàn tất và chạy "validate".',
      next_command: 'node adapter/claude-code/cli.mjs validate',
      runtime_version: '6.0.0',
    };
  }
  if (!existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'next',
      reason_code: 'EXECUTION_PLAN_MISSING',
      severity: 'error',
      message: 'Không thấy execution-plan.json.',
      next_command: 'node adapter/claude-code/cli.mjs emit',
      runtime_version: '6.0.0',
    };
  }

  let execState: ExecutionState;
  let v3Plan: any;
  try {
    execState = loadExecutionState(execStatePath);
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'next',
      reason_code: 'STALE_SNAPSHOT',
      severity: 'error',
      message: `Xác thực Snapshot thất bại: ${redactInternalError((err as Error).message)}`,
      next_command: 'node adapter/claude-code/cli.mjs validate',
      runtime_version: '6.0.0',
    };
  }

  // P3.1 — evaluateBuildReadiness is the single handoff authority for
  // "is this execution state actually ready for build tasks": a
  // just-created plan-validating state is guaranteed to fail the digest
  // check below, so surface its real reason (PLAN_VALIDATION_REQUIRED)
  // instead of the generic snapshot-staleness error.
  const readiness = evaluateBuildReadiness({ phase: execState.phase, branch: null }, execState);
  if (!readiness.ready && readiness.reason_code === 'PLAN_VALIDATION_REQUIRED') {
    return {
      ok: false,
      operation: 'next',
      reason_code: readiness.reason_code,
      severity: 'error',
      message: readiness.message,
      next_command: readiness.next_command,
      runtime_version: '6.0.0',
    };
  }

  try {
    v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    const emittedDocs = loadEmittedDocs(workspaceRoot, execPlanPath);
    assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
  } catch (err: unknown) {
    saveExecutionState(execStatePath, loadExecutionState(execStatePath));
    return {
      ok: false,
      operation: 'next',
      reason_code: 'STALE_SNAPSHOT',
      severity: 'error',
      message: `Xác thực Snapshot thất bại: ${redactInternalError((err as Error).message)}`,
      next_command: 'node adapter/claude-code/cli.mjs validate',
      runtime_version: '6.0.0',
    };
  }

  const runnable: any[] = [];
  for (const milestone of v3Plan.milestones || []) {
    for (const taskId of milestone.tasks || []) {
      const task = v3Plan.tasks?.[taskId];
      if (!task) continue;
      if (execState.completed_tasks.includes(taskId)) continue;

      const pre = task.depends_on || task.preconditions || [];
      const preMet = pre.every((p: string) => execState.completed_tasks.includes(p));
      if (preMet) {
        runnable.push({
          id: taskId,
          milestone: milestone.id,
          type: task.type,
          intent: task.intent,
          allowed_paths: task.allowed_paths,
          preconditions: pre,
          commands: task.commands,
          expected_result: task.expected_result,
          evidence_required: task.evidence_required,
        });
      }
    }
  }

  return {
    ok: true,
    operation: 'next',
    reason_code: 'NEXT_SUCCESS',
    severity: 'info',
    message: runnable.length > 0 ? `Tìm thấy ${runnable.length} task có thể thực hiện.` : 'Không có task nào sẵn sàng để chạy.',
    data: { runnable },
    next_command: runnable.length > 0 ? `node adapter/claude-code/cli.mjs start --task ${runnable[0].id}` : 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

function handleStart(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const taskId = getArg(argv, '--task');
  if (!taskId) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'MISSING_TASK_ID',
      severity: 'error',
      message: 'Thiếu tham số --task <task_id>.',
      runtime_version: '6.0.0',
    };
  }

  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

  if (!existsSync(execStatePath)) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'EXECUTION_STATE_MISSING',
      severity: 'error',
      message: 'Chưa có execution-state.json. Chạy "validate" trước.',
      runtime_version: '6.0.0',
    };
  }
  if (!existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'EXECUTION_PLAN_MISSING',
      severity: 'error',
      message: 'Không thấy execution-plan.json.',
      runtime_version: '6.0.0',
    };
  }

  let execState: ExecutionState;
  let v3Plan: any;
  try {
    execState = loadExecutionState(execStatePath);
    v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    const emittedDocs = loadEmittedDocs(workspaceRoot, execPlanPath);
    assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'STALE_SNAPSHOT',
      severity: 'error',
      message: `Xác thực Snapshot thất bại: ${redactInternalError((err as Error).message)}`,
      next_command: 'node adapter/claude-code/cli.mjs validate',
      runtime_version: '6.0.0',
    };
  }

  let milestoneId: string | null = null;
  for (const m of v3Plan.milestones || []) {
    if ((m.tasks || []).includes(taskId)) {
      milestoneId = m.id;
      break;
    }
  }
  if (!milestoneId) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'TASK_NOT_FOUND',
      severity: 'error',
      message: `Không tìm thấy task ${taskId} trong execution plan.`,
      runtime_version: '6.0.0',
    };
  }

  try {
    const nextState = startTask(execState, milestoneId, taskId, v3Plan);
    saveExecutionState(execStatePath, nextState);
    const task = v3Plan.tasks[taskId];
    return {
      ok: true,
      operation: 'start',
      reason_code: 'TASK_STARTED',
      severity: 'info',
      message: `Đã bắt đầu task ${taskId}.`,
      data: {
        started: taskId,
        milestone: milestoneId,
        phase: nextState.phase,
        task_details: {
          id: taskId,
          intent: task?.intent,
          allowed_paths: task?.allowed_paths,
          preconditions: task?.depends_on || task?.preconditions || [],
          commands: task?.commands,
          expected_result: task?.expected_result,
          evidence_required: task?.evidence_required,
        },
      },
      next_command: 'node adapter/claude-code/cli.mjs status',
      runtime_version: '6.0.0',
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'START_FAILED',
      severity: 'error',
      message: redactInternalError((err as Error).message),
      runtime_version: '6.0.0',
    };
  }
}

async function handleVerify(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
  const taskId = getArg(argv, '--task');
  const commandId = getArg(argv, '--command');
  const userConfirmed = hasFlag(argv, '--confirm');

  if (!taskId) {
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'MISSING_TASK_ID',
      severity: 'error',
      message: 'Thiếu --task <task_id>.',
      runtime_version: '6.0.0',
    };
  }
  if (!commandId) {
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'MISSING_COMMAND_ID',
      severity: 'error',
      message: 'Thiếu --command <command_id>.',
      runtime_version: '6.0.0',
    };
  }

  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

  if (!existsSync(execStatePath) || !existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'EXECUTION_STATE_MISSING',
      severity: 'error',
      message: 'Chưa có execution-state.json hoặc execution-plan.json.',
      runtime_version: '6.0.0',
    };
  }

  const execState = loadExecutionState(execStatePath);
  const v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

  try {
    const emittedDocs = loadEmittedDocs(workspaceRoot, execPlanPath);
    assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
  } catch (err: unknown) {
    saveExecutionState(execStatePath, execState);
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'STALE_SNAPSHOT',
      severity: 'error',
      message: redactInternalError((err as Error).message),
      runtime_version: '6.0.0',
    };
  }

  let nextState;
  try {
    nextState = await runTaskVerification({
      workspace: workspaceRoot,
      plan: v3Plan,
      state: execState,
      task_id: taskId,
      command_id: commandId,
      user_confirmed: userConfirmed,
    });
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'VERIFICATION_FAILED',
      severity: 'error',
      message: redactInternalError((err as Error).message),
      runtime_version: '6.0.0',
    };
  }

  let outputPlan = v3Plan;
  let promoted = false;
  let promotedMilestones: string[] = [];

  if (
    v3Plan.no_features !== true &&
    nextState.completed_tasks.includes('T3-verify') &&
    !v3Plan.milestones.some((m: any) => m.id.startsWith('M4-'))
  ) {
    const answersPath = join(workspaceRoot, 'Design/.interview/answers.json');
    let answers: Record<string, string> = {};
    if (existsSync(answersPath)) {
      try { answers = JSON.parse(readFileSync(answersPath, 'utf8')); } catch { /* ignore */ }
    }
    try {
      if (Object.keys(answers).length === 0) throw new Error('missing Design/.interview/answers.json');
      outputPlan = promoteExecutionPlan({ workspace: workspaceRoot, answers, currentPlan: v3Plan, state: nextState });
      promotedMilestones = outputPlan.milestones.filter((m: any) => m.id.startsWith('M4-')).map((m: any) => m.id);
      writeFileSync(execPlanPath, JSON.stringify(outputPlan, null, 2), 'utf8');
      nextState = {
        ...nextState,
        phase: 'ready-to-execute' as const,
        block_reason: null,
        validated_plan_digest: calculatePlanDigest(outputPlan),
        validated_docs_digest: calculateDocsDigest(loadEmittedDocs(workspaceRoot, execPlanPath)),
        updated_at: new Date().toISOString(),
      };
      promoted = true;
    } catch (e: unknown) {
      const blockRecord: BlockRecord = {
        kind: 'artifact-integrity',
        reason_code: 'PLAN_PROMOTION_FAILED',
        origin_phase: nextState.phase,
        task_id: nextState.active_task,
        recoverable_by: 'node adapter/claude-code/cli.mjs verify --task T3-verify',
        detail: `Plan promotion failed: ${(e as Error).message}`,
        created_at: new Date().toISOString(),
      };
      nextState = { ...nextState, phase: 'blocked' as const, block_reason: blockRecord, updated_at: new Date().toISOString() };
    }
  }

  saveExecutionState(execStatePath, nextState);
  const progressLog = writeProgressLog(workspaceRoot, outputPlan, nextState);

  return {
    ok: true,
    operation: 'verify',
    reason_code: 'VERIFY_SUCCESS',
    severity: 'info',
    message: `Xác minh task ${taskId} lệnh ${commandId} thành công.`,
    data: {
      verified: taskId,
      command: commandId,
      phase: nextState.phase,
      block_reason: nextState.block_reason,
      completed_tasks: nextState.completed_tasks,
      evidence_count: nextState.evidence.length,
      promoted,
      promoted_milestones: promotedMilestones,
      progress_log: progressLog,
    },
    next_command: 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}

async function handleReview(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
  const milestoneId = getArg(argv, '--milestone');
  if (!milestoneId) {
    return {
      ok: false,
      operation: 'review',
      reason_code: 'MISSING_MILESTONE_ID',
      severity: 'error',
      message: 'Thiếu --milestone <M4-...>.',
      runtime_version: '6.0.0',
    };
  }

  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

  if (!existsSync(execStatePath) || !existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'review',
      reason_code: 'EXECUTION_STATE_MISSING',
      severity: 'error',
      message: 'Chưa có execution-state.json hoặc execution-plan.json.',
      runtime_version: '6.0.0',
    };
  }

  let reviewState = loadExecutionState(execStatePath);
  const reviewPlan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

  const milestone = (reviewPlan.milestones || []).find((m: any) => m.id === milestoneId);
  if (!milestone) {
    return {
      ok: false,
      operation: 'review',
      reason_code: 'MILESTONE_NOT_FOUND',
      severity: 'error',
      message: `Không tìm thấy milestone ${milestoneId} trong execution plan.`,
      runtime_version: '6.0.0',
    };
  }

  if (reviewState.phase !== 'reviewing') {
    try {
      reviewState = transitionToReview(reviewState, milestoneId, reviewPlan);
    } catch (e: unknown) {
      return {
        ok: false,
        operation: 'review',
        reason_code: 'TRANSITION_FAILED',
        severity: 'error',
        message: (e as Error).message,
        runtime_version: '6.0.0',
      };
    }
  }

  const changedPaths = [
    ...new Set(
      (milestone.tasks || []).flatMap((tid: string) => reviewPlan.tasks?.[tid]?.allowed_paths ?? [])
    ),
  ] as string[];

  const conventions = loadProjectConventionsFromCwd(workspaceRoot);
  const signal = await runFeatureReview({
    workspace: workspaceRoot,
    featureMilestone: milestoneId,
    changedPaths,
    conventions,
    conventionsRef: 'docs/conventions/',
  });

  const breakTasks = reviewFeatureOutput(signal);

  let outcomeState;
  try {
    outcomeState = applyReviewOutcome(
      reviewState,
      milestoneId,
      breakTasks.map((t) => t.id)
    );
  } catch (e: unknown) {
    return {
      ok: false,
      operation: 'review',
      reason_code: 'REVIEW_OUTCOME_FAILED',
      severity: 'error',
      message: (e as Error).message,
      runtime_version: '6.0.0',
    };
  }

  saveExecutionState(execStatePath, outcomeState);

  const breakDir = join(workspaceRoot, 'docs', 'break-tasks');
  mkdirSync(breakDir, { recursive: true });
  const docFile = breakTaskFileName(milestoneId);
  writeFileSync(
    join(breakDir, docFile),
    renderBreakTaskDoc({ featureMilestone: milestoneId, breakTasks, state: outcomeState }),
    'utf8'
  );

  const entries = readdirSync(breakDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => {
      const isCurrent = f === docFile;
      const total = isCurrent ? breakTasks.length : null;
      const open = isCurrent
        ? breakTasks.filter((t) => !outcomeState.completed_tasks.includes(t.id)).length
        : null;
      return {
        featureMilestone: f.replace(/\.md$/, ''),
        file: f,
        total: total ?? readBreakCount(join(breakDir, f), 'Break-task sinh ra'),
        open: open ?? readBreakCount(join(breakDir, f), 'Còn mở'),
      };
    });
  writeFileSync(join(breakDir, 'README.md'), renderBreakTaskIndex({ entries }), 'utf8');

  writeProgressLog(workspaceRoot, reviewPlan, outcomeState);

  return {
    ok: true,
    operation: 'review',
    reason_code: 'REVIEW_SUCCESS',
    severity: 'info',
    message: breakTasks.length === 0 ? `Review sạch cho milestone ${milestoneId}.` : `Milestone ${milestoneId} sinh ra ${breakTasks.length} break-task.`,
    data: {
      reviewed: milestoneId,
      lint_ok: signal.lint.ok,
      test_ok: signal.test.ok,
      break_tasks: breakTasks.map((t) => t.id),
      phase: outcomeState.phase,
      block_reason: outcomeState.block_reason,
      break_task_doc: `docs/break-tasks/${docFile}`,
    },
    next_command: 'node adapter/claude-code/cli.mjs status',
    runtime_version: '6.0.0',
  };
}
