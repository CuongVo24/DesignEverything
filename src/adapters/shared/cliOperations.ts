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
  transactInterviewStore,
  commitInterviewAnswer,
  loadSlotsFile,
  activateTier1Emit,
  ensureTier1Handoff,
  evaluateBuildReadiness,
  createBlockRecord,
  runSemanticValidation,
  manifestPath,
  ExecutionState,
  deepenModuleIdSchema,
} from '../../core/index.js';
import { renderNextStep } from './renderNextStep.js';
import { CliResultEnvelope, redactInternalError } from './cliResult.js';
import { handleDeepen } from './deepenCliOperations.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../../version.js';

/**
 * P10 (bonus-plan Phase 6, item 3) — the machine-checkable inventory of
 * every subcommand + flag the dispatcher actually recognizes (getArg/
 * hasFlag call sites in this file and deepenCliOperations.ts). `--json` is
 * global (handled by cli.mjs's launcher, not this dispatcher) and legal on
 * every subcommand, so it's tracked separately rather than repeated below.
 * test/docs/skill-truth.test.ts cross-checks this table against both the
 * three adapter SKILL.md files (nothing taught that doesn't exist) and the
 * real getArg/hasFlag source (nothing here that isn't actually parsed) —
 * that second direction is what keeps this table itself from drifting.
 */
export const CLI_COMMAND_SURFACE: Record<string, readonly string[]> = {
  status: [],
  init: [],
  commit: ['--branch', '--calibrate', '--capability-token', '--answer', '--slots-file', '--ack-warnings'],
  validate: [],
  build: [],
  repair: [],
  emit: ['--slots-file'],
  next: [],
  start: ['--task'],
  verify: ['--task', '--command', '--confirm'],
  review: ['--milestone'],
  deepen: [
    '--module',
    '--opt-in',
    '--next',
    '--commit',
    '--capability-token',
    '--question',
    '--answer',
    '--subject',
    '--emit',
  ],
};
export const CLI_GLOBAL_FLAGS: readonly string[] = ['--json'];

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
        message: `Subcommand "${subcommand}" không được hỗ trợ. Sử dụng: status, init, commit, validate, emit, repair, next, start, verify, review, deepen.`,
        next_command: targetLocalCliCommand('status'),
        runtime_version: RUNTIME_VERSION,
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

function handleCommit(workspaceRoot: string, argv: string[]): CliResultEnvelope {
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

function handleValidate(workspaceRoot: string): CliResultEnvelope {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');
  const stateExisted = existsSync(execStatePath);
  let state: ExecutionState;

  if (stateExisted) {
    try {
      state = loadExecutionState(execStatePath);
    } catch (err: unknown) {
      return {
        ok: false,
        operation: 'validate',
        reason_code: 'VALIDATION_FAILED',
        severity: 'error',
        message: `Lỗi validate kế hoạch: ${redactInternalError((err as Error).message)}`,
        runtime_version: RUNTIME_VERSION,
      };
    }
  } else {
    // An activated tier-1 manifest without its bound execution state is not
    // an empty workspace. Initializing fresh here would let a damaged handoff
    // turn into a ready-to-execute state without replaying the emit journal.
    if (existsSync(manifestPath(workspaceRoot, 'tier1'))) {
      return {
        ok: false,
        operation: 'validate',
        reason_code: 'EXECUTION_STATE_REQUIRED',
        severity: 'error',
        message: 'Tier-1 emit đã tồn tại nhưng execution-state.json bị thiếu. Hãy repair hoặc emit lại để khôi phục handoff.',
        next_command: targetLocalCliCommand('repair'),
        runtime_version: RUNTIME_VERSION,
      };
    }
    state = initExecutionState();
  }

  // P1 (DEBT1) sticky-block truth: verification-failed/verification-aborted/
  // policy-corrupt blocks are never cleared by validate — transitionToReadyToExecute
  // already returns these unchanged; mirror that in the envelope instead of
  // lying with VALIDATION_PASSED like the old hardcoded-pass code did.
  if (state.phase === 'blocked' && state.block_reason) {
    const kind = state.block_reason.kind;
    if (kind === 'verification-failed' || kind === 'verification-aborted' || kind === 'policy-corrupt') {
      return {
        ok: false,
        operation: 'validate',
        reason_code: state.block_reason.reason_code,
        severity: 'error',
        message: `Không thể validate: trạng thái đang blocked (${kind}). ${state.block_reason.detail}`,
        data: { execState: state },
        next_command: state.block_reason.recoverable_by,
        runtime_version: RUNTIME_VERSION,
      };
    }
  }

  if (state.phase !== 'plan-validating' && state.phase !== 'blocked') {
    // Already past the validation gate (or in a phase validate doesn't
    // govern, e.g. executing/verifying) — refresh digests only, do not
    // re-run the semantic gate or touch phase/block_reason.
    let planDigest = '';
    let docsDigest = '';
    if (existsSync(execPlanPath)) {
      try {
        const planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
        planDigest = calculatePlanDigest(planJson);
        docsDigest = calculateDocsDigest(loadEmittedDocs(workspaceRoot, execPlanPath));
      } catch {
        // ignore
      }
    }
    const updatedState: ExecutionState = {
      ...state,
      validated_plan_digest: planDigest || state.validated_plan_digest,
      validated_docs_digest: docsDigest || state.validated_docs_digest,
    };
    saveExecutionState(execStatePath, updatedState);
    return {
      ok: true,
      operation: 'validate',
      reason_code: 'VALIDATION_PASSED',
      severity: 'info',
      message: 'Kế hoạch thi công đã được validate thành công.',
      data: { execState: updatedState },
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P1 (DEBT1) — real semantic validation: manifest presence/activation,
  // artifact-digest match against bytes on disk, execution-plan.json schema,
  // and required docs for the requires_validation gate(s). Replaces the old
  // hardcoded `transitionToReadyToExecute(state, true, ...)`.
  const result = runSemanticValidation(workspaceRoot);
  const manifestExists = existsSync(manifestPath(workspaceRoot, 'tier1'));

  const updatedState = result.pass
    ? transitionToReadyToExecute(state, true, {
        plan_digest: result.plan_digest,
        docs_digest: result.docs_digest,
        validation_digest: result.validation_digest,
      })
    : transitionToReadyToExecute(state, false);

  // Never materialize a fresh blocked state on a workspace that has neither
  // prior execution state nor a tier-1 manifest — that is "not involved
  // enough to validate yet", not a semantic failure worth persisting.
  if (stateExisted || manifestExists) {
    saveExecutionState(execStatePath, updatedState);
  }

  if (!result.pass) {
    const failedChecks = result.checks.filter((c) => !c.ok);
    return {
      ok: false,
      operation: 'validate',
      reason_code: 'SEMANTIC_VALIDATION_FAILED',
      severity: 'error',
      message: `Kế hoạch không vượt qua kiểm tra ngữ nghĩa: ${failedChecks.map((c) => c.id).join(', ')}.`,
      data: { execState: updatedState, checks: result.checks },
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  return {
    ok: true,
    operation: 'validate',
    reason_code: 'VALIDATION_PASSED',
    severity: 'info',
    message: 'Kế hoạch thi công đã được validate thành công.',
    data: { execState: updatedState },
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
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
    // Opportunistic: migrate legacy interview state to canonical if any
    // exists. This must not abort the tier1/tier2 recovery above on failure
    // — a legacy conflict migrateInterviewStore refuses to resolve on its
    // own (R02/B1b fail-closed guards) is a distinct, separately-surfaced
    // issue, not a reason to report the whole repair as failed when the
    // journal recovery it was actually asked to do already succeeded.
    // migrateInterviewStore never partially writes on failure (it throws
    // before any write), so skipping it here loses no data and fabricates
    // no state — a later `status`/`init` will still hit the same guard.
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
      message: health.status === 'broken'
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

function handleEmit(workspaceRoot: string, argv: string[]): CliResultEnvelope {
  const canonicalOutcome = ensureCanonicalStore(workspaceRoot);
  if (canonicalOutcome.status === 'uninvolved') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'PROGRESS_MISSING',
      severity: 'error',
      message: 'Không tìm thấy canonical interview store để emit.',
      next_command: TARGET_LOCAL_INIT_COMMAND,
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (canonicalOutcome.status === 'corrupt') {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'CORRUPT_PROGRESS_STATE',
      severity: 'error',
      message: `Không thể nạp canonical interview store: ${canonicalOutcome.message}`,
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (progress.phase !== 'ready-for-validation' || progress.current_step !== null) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: 'INTERVIEW_NOT_READY_FOR_VALIDATION',
      severity: 'error',
      message: 'Phỏng vấn chưa ở trạng thái ready-for-validation; hãy hoàn tất đúng các bước trước khi emit.',
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P10 — tier-1 answers come from the canonical interview store
  // (payload.answers keyed by step id, plus payload.slots keyed by the
  // fine-grained slot names doc-templates actually read), never the legacy
  // Design/.interview/answers.json file: that file has been dead for tier-1
  // purposes since the P2.2a canonical-authority cutover (commit only ever
  // writes payload.answers/slots now) and today is exclusively owned by
  // tier-2 deepen answers (see deepenApplicationServices.ts /
  // emitTier2.ts's loadAnswers, which never run before a tier-1 emit).
  let answers: Record<string, string> = { ...canonicalOutcome.envelope.payload.answers };
  let handoffRevision = canonicalOutcome.envelope.state_revision;
  for (const [key, rec] of Object.entries(canonicalOutcome.envelope.payload.slots)) {
    answers[key] = rec.value;
  }

  // --slots-file: build-plan-derived slots computed by the model AFTER the
  // interview is complete (SKILL.md's handoff step) — they can't have been
  // committed as part of any single question, so this is the one place
  // they're merged in. Same load pipeline as `commit --slots-file`. Also
  // persisted into canonical payload.slots (own transaction, best-effort)
  // for the same audit/provenance trail per-question slots already get.
  const slotsFileArg = getArg(argv, '--slots-file');
  if (slotsFileArg) {
    const canon = canonicalizeWorkspacePath(workspaceRoot, slotsFileArg);
    if (!canon.ok) {
      return {
        ok: false,
        operation: 'emit',
        reason_code: 'INVALID_SLOTS_FILE',
        severity: 'error',
        message: `Tệp slots nằm ngoài workspace: ${canon.message}`,
        runtime_version: RUNTIME_VERSION,
      };
    }
    const absSlotsPath = join(workspaceRoot, canon.canonicalPath);
    const loaded = loadSlotsFile(absSlotsPath);
    if (!loaded.ok) {
      return {
        ok: false,
        operation: 'emit',
        reason_code: loaded.reason_code,
        severity: 'error',
        message: loaded.message,
        runtime_version: RUNTIME_VERSION,
      };
    }
    answers = { ...answers, ...loaded.slots };

    try {
      const now = new Date().toISOString();
      const updatedEnvelope = transactInterviewStore(workspaceRoot, canonicalOutcome.envelope.state_revision, (env) => {
        const slots = { ...env.payload.slots };
        for (const [key, value] of Object.entries(loaded.slots)) {
          slots[key] = { value, provenance: 'emit:slots-file', updated_at: now };
        }
        return { ...env, payload: { ...env.payload, slots } };
      });
      handoffRevision = updatedEnvelope.state_revision;
    } catch {
      // best-effort — a concurrent writer already advanced the revision;
      // the emit still proceeds with the in-memory merged answers, only the
      // canonical audit trail for these slots is skipped this time.
    }
  }

  // P7.1 — the sole production authority for tier-1 emit is
  // activateTier1Emit's render->stage->validate->activate transaction
  // kernel. There is no direct writeFileSync loop here anymore, and no
  // catch branch that turns a thrown render/validation error into a
  // fabricated success by reading a stale manifest.
  const result = activateTier1Emit(workspaceRoot, answers, branch, {
    interview_state_revision: handoffRevision,
  });
  if (!result.ok) {
    return {
      ok: false,
      operation: 'emit',
      reason_code: result.reason_code,
      severity: 'error',
      message: result.message,
      data: 'issues' in result && result.issues ? { issues: result.issues } : undefined,
      runtime_version: RUNTIME_VERSION,
    };
  }

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
    next_command: targetLocalCliCommand('validate'),
    runtime_version: RUNTIME_VERSION,
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
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (!existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'next',
      reason_code: 'EXECUTION_PLAN_MISSING',
      severity: 'error',
      message: 'Không thấy execution-plan.json.',
      next_command: targetLocalCliCommand('emit'),
      runtime_version: RUNTIME_VERSION,
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
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P3.1 — evaluateBuildReadiness is the single handoff authority for
  // "is this execution state actually ready for build tasks": a
  // just-created plan-validating state is guaranteed to fail the digest
  // check below, so surface its real reason (PLAN_VALIDATION_REQUIRED)
  // instead of the generic snapshot-staleness error.
  const readiness = evaluateBuildReadiness({ phase: execState.phase, branch: null }, execState);
  if (!readiness.ready) {
    return {
      ok: false,
      operation: 'next',
      reason_code: readiness.reason_code,
      severity: 'error',
      message: readiness.message,
      next_command: readiness.next_command,
      runtime_version: RUNTIME_VERSION,
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
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
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
    next_command: runnable.length > 0 ? targetLocalCliCommand(`start --task ${runnable[0].id}`) : targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (!existsSync(execPlanPath)) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'EXECUTION_PLAN_MISSING',
      severity: 'error',
      message: 'Không thấy execution-plan.json.',
      runtime_version: RUNTIME_VERSION,
    };
  }

  let execState: ExecutionState;
  try {
    execState = loadExecutionState(execStatePath);
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'STALE_SNAPSHOT',
      severity: 'error',
      message: `Xác thực Snapshot thất bại: ${redactInternalError((err as Error).message)}`,
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
    };
  }

  // P1 gap-fix (§9.1) — start must consult evaluateBuildReadiness the same
  // way next does: a freshly-emitted plan-validating state is guaranteed to
  // fail the digest check below, so surface PLAN_VALIDATION_REQUIRED instead
  // of the generic STALE_SNAPSHOT error.
  const readiness = evaluateBuildReadiness({ phase: execState.phase, branch: null }, execState);
  if (!readiness.ready) {
    return {
      ok: false,
      operation: 'start',
      reason_code: readiness.reason_code,
      severity: 'error',
      message: readiness.message,
      next_command: readiness.next_command,
      runtime_version: RUNTIME_VERSION,
    };
  }

  let v3Plan: any;
  try {
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
      next_command: targetLocalCliCommand('validate'),
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      next_command: targetLocalCliCommand('status'),
      runtime_version: RUNTIME_VERSION,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      operation: 'start',
      reason_code: 'START_FAILED',
      severity: 'error',
      message: redactInternalError((err as Error).message),
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
    };
  }
  if (!commandId) {
    return {
      ok: false,
      operation: 'verify',
      reason_code: 'MISSING_COMMAND_ID',
      severity: 'error',
      message: 'Thiếu --command <command_id>.',
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      const recoveryCommand = targetLocalCliCommand('verify --task T3-verify');
      const blockRecord = createBlockRecord(nextState, {
        kind: 'artifact-integrity',
        reason_code: 'PLAN_PROMOTION_FAILED',
        recoverable_by: recoveryCommand,
        detail: `Plan promotion failed: ${(e as Error).message}`,
        remediation: { actions: ['read', 'run-command'], paths: [], command: recoveryCommand },
      });
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
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
      runtime_version: RUNTIME_VERSION,
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
        runtime_version: RUNTIME_VERSION,
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
      breakTasks.map((t) => t.id),
      reviewPlan
    );
  } catch (e: unknown) {
    return {
      ok: false,
      operation: 'review',
      reason_code: 'REVIEW_OUTCOME_FAILED',
      severity: 'error',
      message: (e as Error).message,
      runtime_version: RUNTIME_VERSION,
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
    next_command: targetLocalCliCommand('status'),
    runtime_version: RUNTIME_VERSION,
  };
}
