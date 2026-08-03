/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { dirname } from 'path';
import {
  ExecutionState,
  EvidenceRecord,
  executionStateSchema,
  BlockRecord,
  BlockKind,
  BlockRemediation,
  Tier1Handoff,
} from './schemas/index.js';
import { TARGET_LOCAL_CLI_COMMAND } from '../version.js';

const CLI = TARGET_LOCAL_CLI_COMMAND;

const VALIDATION_RECOVERABLE_KINDS = new Set<BlockKind>([
  'validation',
  'artifact-integrity',
  'snapshot-stale',
]);

const EXECUTION_PHASES = new Set<ExecutionState['phase']>([
  'plan-validating',
  'ready-to-execute',
  'executing',
  'verifying',
  'repairing',
  'reviewing',
  'blocked',
  'ready-to-ship',
]);

export interface BlockRecordInput {
  kind: BlockKind;
  reason_code: string;
  detail: string;
  origin_phase?: ExecutionState['phase'];
  task_id?: string | null;
  recoverable_by?: string;
  remediation?: Omit<BlockRemediation, 'task_id' | 'plan_revision' | 'command'> & {
    command?: string;
  };
}

function defaultRemediation(
  state: Pick<ExecutionState, 'active_task' | 'plan_revision'>,
  kind: BlockKind,
  taskId: string | null,
  command: string
): BlockRemediation {
  if (kind === 'verification-failed' || kind === 'verification-aborted') {
    return {
      actions: ['read', 'write-task-scope', 'run-command'],
      // A caller that knows the active task must replace this empty scope
      // with that task's exact allowed_paths. Empty is deliberately safe.
      paths: [],
      command,
      task_id: taskId,
      plan_revision: state.plan_revision,
    };
  }

  return {
    actions: ['read', 'run-command'],
    paths: [],
    command,
    task_id: taskId,
    plan_revision: state.plan_revision,
  };
}

/**
 * Construct every new blocked record from state, so recovery capability is
 * bound to the exact task and plan revision that produced the failure.
 */
export function createBlockRecord(
  state: Pick<ExecutionState, 'phase' | 'active_task' | 'plan_revision'>,
  input: BlockRecordInput
): BlockRecord {
  const taskId = input.task_id === undefined ? state.active_task : input.task_id;
  const defaultCommand = input.kind === 'verification-failed' || input.kind === 'verification-aborted'
    ? `${CLI} verify --task ${taskId ?? ''}`.trim()
    : input.kind === 'review-incomplete'
      ? `${CLI} review`
      : input.kind === 'policy-corrupt'
        ? `${CLI} repair`
        : `${CLI} validate`;
  const command = input.remediation?.command ?? input.recoverable_by ?? defaultCommand;
  const fallback = defaultRemediation(state, input.kind, taskId, command);
  const remediation: BlockRemediation = {
    ...fallback,
    ...input.remediation,
    command,
    task_id: taskId,
    plan_revision: state.plan_revision,
  };

  return {
    kind: input.kind,
    reason_code: input.reason_code,
    origin_phase: input.origin_phase ?? state.phase,
    task_id: taskId,
    recoverable_by: command,
    detail: input.detail,
    created_at: new Date().toISOString(),
    remediation,
  };
}

function phaseFromUnknown(value: unknown): ExecutionState['phase'] {
  return typeof value === 'string' && EXECUTION_PHASES.has(value as ExecutionState['phase'])
    ? value as ExecutionState['phase']
    : 'blocked';
}

function migrateLegacyBlockReason(parsed: unknown): { value: unknown; migrated: boolean } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { value: parsed, migrated: false };
  }

  const state = parsed as Record<string, unknown>;
  const block = state.block_reason;
  if (block === null || block === undefined) {
    return { value: parsed, migrated: false };
  }
  const hasScopedRemediation =
    typeof block === 'object' && block !== null && !Array.isArray(block) && 'remediation' in block;
  if (hasScopedRemediation) {
    return { value: parsed, migrated: false };
  }

  const detail = typeof block === 'string'
    ? block
    : typeof block === 'object' && block !== null && typeof (block as { detail?: unknown }).detail === 'string'
      ? (block as { detail: string }).detail
      : 'Legacy blocked state has no trustworthy typed remediation record.';
  const normalized = detail.toLowerCase();
  const legacyKind: BlockKind = normalized.includes('snapshot') || normalized.includes('stale')
    ? 'snapshot-stale'
    : normalized.includes('semantic') || normalized.includes('validation')
      ? 'validation'
      : 'policy-corrupt';
  const safeState: Pick<ExecutionState, 'phase' | 'active_task' | 'plan_revision'> = {
    phase: phaseFromUnknown(state.phase),
    active_task: typeof state.active_task === 'string' ? state.active_task : null,
    plan_revision: typeof state.plan_revision === 'number' && Number.isInteger(state.plan_revision) && state.plan_revision >= 0
      ? state.plan_revision
      : 0,
  };
  // A legacy record cannot prove its old action/path/task/revision scope.
  // It may only read and run the one conservative recovery command; unknown
  // text becomes policy-corrupt rather than guessed into a permissive kind.
  const command = legacyKind === 'policy-corrupt' ? `${CLI} repair` : `${CLI} validate`;
  const migratedBlock = createBlockRecord(safeState, {
    kind: legacyKind,
    reason_code: legacyKind === 'policy-corrupt'
      ? 'LEGACY_BLOCK_REASON_UNCLASSIFIED'
      : 'LEGACY_BLOCK_REASON_MIGRATED',
    detail,
    recoverable_by: command,
    remediation: { actions: ['read', 'run-command'], paths: [], command },
  });

  return {
    value: { ...state, block_reason: migratedBlock },
    migrated: true,
  };
}

export function initExecutionState(): ExecutionState {
  return {
    version: '4.0.0', // V3 Execution Expansion target version is 4.0.0
    phase: 'plan-validating',
    active_task: null,
    active_milestone: null,
    completed_tasks: [],
    evidence: [],
    block_reason: null,
    validated_plan_digest: '',
    validated_docs_digest: '',
    validation_result_digest: '',
    plan_revision: 1,
    amendment_history: [],
    open_break_tasks: [],
    reviewed_milestones: [],
    updated_at: new Date().toISOString(),
  };
}

export function loadExecutionState(path: string): ExecutionState {
  if (!existsSync(path)) {
    throw new Error(`Execution state file does not exist at ${path}`);
  }
  const content = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`Execution state is malformed JSON: ${err.message}`);
  }
  const migration = migrateLegacyBlockReason(parsed);
  const result = executionStateSchema.safeParse(migration.value);
  if (!result.success) {
    throw new Error(`Invalid execution state schema: ${JSON.stringify(result.error.format())}`);
  }
  if (migration.migrated) {
    saveExecutionState(path, result.data);
  }
  return result.data;
}

export function saveExecutionState(path: string, state: ExecutionState): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const result = executionStateSchema.safeParse(state);
  if (!result.success) {
    throw new Error(`Cannot save invalid execution state: ${JSON.stringify(result.error.format())}`);
  }
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
  renameSync(tempPath, path);
}

export function transitionToReadyToExecute(
  state: ExecutionState,
  validationPass: boolean,
  digests?: {
    plan_digest: string;
    docs_digest: string;
    validation_digest: string;
  }
): ExecutionState {
  if (state.phase !== 'plan-validating' && state.phase !== 'blocked' && state.phase !== 'ready-to-execute') {
    throw new Error(`TRANSITION_PHASE_NOT_ALLOWED: cannot transition to ready-to-execute from ${state.phase}`);
  }

  // Validation may recover only blocks whose proof is validation evidence.
  // Verification, review and integrity-policy failures retain the exact
  // active task/evidence and must take their own remediation route.
  if (state.phase === 'blocked') {
    if (!state.block_reason || !VALIDATION_RECOVERABLE_KINDS.has(state.block_reason.kind)) {
      return state;
    }
  }

  // A boolean is not evidence. The production caller obtains all three
  // digests after the real validation service passes; callers cannot open the
  // build gate merely by supplying `true` without that provenance.
  const hasValidationProof = Boolean(
    digests &&
      digests.plan_digest.length > 0 &&
      digests.docs_digest.length > 0 &&
      digests.validation_digest.length > 0
  );
  if (validationPass && !hasValidationProof) {
    if (state.phase === 'blocked') return state;
    const blockRec = createBlockRecord(state, {
      kind: 'validation',
      reason_code: 'VALIDATION_PROOF_REQUIRED',
      detail: 'Validation reported pass without the required plan, docs, and validation digests.',
    });
    return {
      ...state,
      phase: 'blocked',
      block_reason: blockRec,
      updated_at: new Date().toISOString(),
    };
  }

  if (!validationPass) {
    const blockRec = createBlockRecord(state, {
      kind: 'validation',
      reason_code: 'SEMANTIC_VALIDATION_FAILED',
      detail: 'Semantic plan validation failed.',
    });
    return {
      ...state,
      phase: 'blocked',
      block_reason: blockRec,
      updated_at: new Date().toISOString(),
    };
  }
  return {
    ...state,
    phase: 'ready-to-execute',
    block_reason: null,
    validated_plan_digest: digests?.plan_digest ?? '',
    validated_docs_digest: digests?.docs_digest ?? '',
    validation_result_digest: digests?.validation_digest ?? '',
    updated_at: new Date().toISOString(),
  };
}

export function startTask(
  state: ExecutionState,
  milestoneId: string,
  taskId: string,
  plan: any
): ExecutionState {
  if (state.active_task !== null && state.active_task !== taskId) {
    throw new Error(`Cannot start task ${taskId} because task ${state.active_task} is currently active.`);
  }
  if (state.phase === 'repairing' && state.active_task !== taskId) {
    throw new Error(`Cannot start task ${taskId} while repairing task ${state.active_task}.`);
  }
  if (state.phase !== 'ready-to-execute' && state.phase !== 'repairing') {
    throw new Error(`Cannot start task in phase: ${state.phase}`);
  }

  const isV3 = 'tasks' in plan && plan.tasks && typeof plan.tasks === 'object' && !Array.isArray(plan.tasks);

  if (isV3) {
    const milestone = plan.milestones.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found in execution plan`);
    }
    const task = plan.tasks[taskId];
    if (!task) {
      throw new Error(`Task ${taskId} not found in execution plan`);
    }
    if (!milestone.tasks.includes(taskId)) {
      throw new Error(`Task ${taskId} does not belong to milestone ${milestoneId}`);
    }

    // Verify task preconditions
    const taskPreconditions = task.depends_on || task.preconditions || [];
    for (const pre of taskPreconditions) {
      if (!state.completed_tasks.includes(pre)) {
        throw new Error(`Precondition task ${pre} is not completed yet.`);
      }
    }
  } else {
    // Find milestone and task in the legacy execution plan
    const milestone = plan.milestones.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found in execution plan`);
    }
    const task = milestone.tasks.find((t: any) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in milestone ${milestoneId}`);
    }

    // Verify task preconditions (if any)
    const taskPreconditions = task.preconditions || [];
    for (const pre of taskPreconditions) {
      if (!state.completed_tasks.includes(pre)) {
        throw new Error(`Precondition task ${pre} is not completed yet.`);
      }
    }

    // Verify milestone preconditions (if any)
    const milestonePreconditions = milestone.preconditions || [];
    for (const pre of milestonePreconditions) {
      if (!state.completed_tasks.includes(pre)) {
        throw new Error(`Milestone precondition ${pre} is not completed yet.`);
      }
    }
  }

  return {
    ...state,
    phase: 'executing',
    active_milestone: milestoneId,
    active_task: taskId,
    block_reason: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * B17a — Feature-milestone (M4-*) đòi review trước khi coi là "done".
 * Skeleton (M0-M3) và milestone khác đi thẳng như V3.
 */
export function requiresReview(milestoneId: string | null | undefined): boolean {
  return !!milestoneId && milestoneId.startsWith('M4-');
}

/** Mọi task của milestone đã nằm trong completed_tasks chưa. */
function milestoneTasksAllComplete(state: ExecutionState, milestoneId: string, plan: any): boolean {
  const milestone = plan.milestones?.find((m: any) => m.id === milestoneId);
  if (!milestone) return false;
  return milestone.tasks.every((tid: string) => state.completed_tasks.includes(tid));
}

/**
 * Vào phase reviewing khi mọi task build của một feature-milestone đã xong.
 * Precondition: phase ready-to-execute/ready-to-ship và milestone tasks đủ.
 */
export function transitionToReview(
  state: ExecutionState,
  milestoneId: string,
  plan: any
): ExecutionState {
  if (!requiresReview(milestoneId)) {
    throw new Error(`Milestone ${milestoneId} không phải feature-milestone, không cần review.`);
  }
  if (state.phase !== 'ready-to-execute' && state.phase !== 'ready-to-ship') {
    throw new Error(`Chỉ vào reviewing từ ready-to-execute/ready-to-ship, không phải ${state.phase}.`);
  }
  if (!milestoneTasksAllComplete(state, milestoneId, plan)) {
    throw new Error(`Feature ${milestoneId} chưa hoàn thành mọi task build, chưa thể review.`);
  }
  return {
    ...state,
    phase: 'reviewing',
    active_milestone: milestoneId,
    active_task: null,
    block_reason: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Ghi nhận kết quả manager-check. Break-task rỗng → feature-done ngay
 * (đóng review). Có break-task → mở chúng ra và giữ phase reviewing
 * (fail-closed: feature CHƯA done tới khi break-task xong).
 */
export function applyReviewOutcome(
  state: ExecutionState,
  milestoneId: string,
  breakTaskIds: string[],
  plan?: any
): ExecutionState {
  if (state.phase !== 'reviewing') {
    throw new Error(`applyReviewOutcome chỉ chạy ở phase reviewing, không phải ${state.phase}.`);
  }
  if (state.active_milestone !== milestoneId) {
    throw new Error(`Review đang mở cho ${state.active_milestone}, không phải ${milestoneId}.`);
  }
  if (breakTaskIds.length === 0) {
    // plan must reach closeFeatureReview so it can tell "this feature is
    // reviewed" apart from "every task in the plan is now done" — without
    // it, closeFeatureReview's allDone check is always false and a project
    // can never reach ready-to-ship through review, no matter how clean.
    return closeFeatureReview({ ...state, open_break_tasks: [] }, milestoneId, plan);
  }
  const blockRecord = createBlockRecord(state, {
    kind: 'review-incomplete',
    reason_code: 'FEATURE_HAS_OPEN_BREAK_TASKS',
    task_id: null,
    recoverable_by: `${CLI} review --milestone ${milestoneId}`,
    detail: `Feature ${milestoneId} có ${breakTaskIds.length} break-task chưa xử lý; chưa được coi là done.`,
  });
  return {
    ...state,
    phase: 'reviewing',
    open_break_tasks: breakTaskIds,
    block_reason: blockRecord,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Đóng review của một feature. Fail-closed: từ chối nếu còn break-task chưa
 * nằm trong completed_tasks. Đóng xong → milestone vào reviewed_milestones,
 * phase về ready-to-execute (hoặc ready-to-ship nếu plan đã xong hết).
 */
export function closeFeatureReview(
  state: ExecutionState,
  milestoneId: string,
  plan?: any
): ExecutionState {
  if (state.phase !== 'reviewing') {
    throw new Error(`closeFeatureReview chỉ chạy ở phase reviewing, không phải ${state.phase}.`);
  }
  if (state.active_milestone !== milestoneId) {
    throw new Error(`Review đang mở cho ${state.active_milestone}, không phải ${milestoneId}.`);
  }
  const unresolved = state.open_break_tasks.filter((tid) => !state.completed_tasks.includes(tid));
  if (unresolved.length > 0) {
    throw new Error(
      `Không thể đóng review ${milestoneId}: còn break-task chưa xong (${unresolved.join(', ')}).`
    );
  }
  const reviewed = state.reviewed_milestones.includes(milestoneId)
    ? state.reviewed_milestones
    : [...state.reviewed_milestones, milestoneId];

  // Nếu đã cung cấp plan và mọi task đều xong → ready-to-ship.
  let allDone = false;
  if (plan && 'tasks' in plan && plan.tasks && !Array.isArray(plan.tasks)) {
    allDone = Object.keys(plan.tasks).every((id: string) => state.completed_tasks.includes(id));
  }

  return {
    ...state,
    phase: allDone ? 'ready-to-ship' : 'ready-to-execute',
    active_milestone: null,
    active_task: null,
    open_break_tasks: [],
    reviewed_milestones: reviewed,
    block_reason: null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Feature-done gate: không cho mở một feature-milestone mới khi còn
 * feature-milestone nào đã hoàn thành task build nhưng chưa review xong.
 */
export function assertNoUnreviewedFeature(
  state: ExecutionState,
  nextMilestoneId: string,
  plan: any
): void {
  if (!requiresReview(nextMilestoneId)) return;
  for (const m of plan.milestones || []) {
    if (!requiresReview(m.id) || m.id === nextMilestoneId) continue;
    const complete = m.tasks.every((tid: string) => state.completed_tasks.includes(tid));
    if (complete && !state.reviewed_milestones.includes(m.id)) {
      throw new Error(
        `Feature ${m.id} đã xong task build nhưng chưa đóng review; phải review trước khi mở ${nextMilestoneId}.`
      );
    }
  }
}

export function recordEvidence(
  state: ExecutionState,
  record: EvidenceRecord,
  plan: any
): ExecutionState {
  if (state.phase !== 'executing' && state.phase !== 'verifying' && state.phase !== 'repairing') {
    throw new Error(`Cannot record evidence in phase: ${state.phase}`);
  }

  if (state.active_task !== record.task_id) {
    throw new Error(`Recorded evidence task_id ${record.task_id} does not match active_task ${state.active_task}`);
  }

  // Check for duplicate evidence entry (same task_id, command_id, and captured_at)
  const recordTimestamp = record.captured_at;
  const isDuplicate = state.evidence.some((e) => {
    return e.task_id === record.task_id &&
           e.command_id === record.command_id &&
           e.captured_at === recordTimestamp;
  });
  if (isDuplicate) {
    throw new Error(`Duplicate evidence recorded for task ${record.task_id} command ${record.command_id} at timestamp ${recordTimestamp}`);
  }

  const updatedEvidence = [...state.evidence, record];

  if (record.exit_code === 0) {
    // Check if all commands of the active task are verified successfully
    let activeTaskCard: any = null;
    const isV3 = 'tasks' in plan && plan.tasks && typeof plan.tasks === 'object' && !Array.isArray(plan.tasks);
    if (isV3) {
      activeTaskCard = plan.tasks[state.active_task!];
    } else {
      for (const m of plan.milestones) {
        const t = m.tasks.find((task: any) => task.id === state.active_task);
        if (t) {
          activeTaskCard = t;
          break;
        }
      }
    }

    let allCommandsVerified = true;
    if (activeTaskCard && activeTaskCard.commands) {
      for (const cmd of activeTaskCard.commands) {
        const cmdId = typeof cmd === 'string' ? cmd : cmd.id;
        const hasPass = updatedEvidence.some(
          (e) => e.task_id === state.active_task && e.command_id === cmdId && e.exit_code === 0
        );
        if (!hasPass) {
          allCommandsVerified = false;
          break;
        }
      }
    }

    if (allCommandsVerified) {
      // Verification passed fully for this task
      const completedTasks = [...state.completed_tasks];
      if (!completedTasks.includes(record.task_id)) {
        completedTasks.push(record.task_id);
      }

      // Check if all tasks in the plan are completed
      let allCompleted = false;
      if (isV3) {
        const allTaskIds = Object.keys(plan.tasks);
        allCompleted = allTaskIds.every((id: string) => completedTasks.includes(id));
      } else {
        const allTaskIds = plan.milestones.flatMap((m: any) => m.tasks.map((t: any) => t.id));
        allCompleted = allTaskIds.every((id: string) => completedTasks.includes(id));
      }

      const featureMilestones = (plan.milestones || []).filter((milestone: any) => String(milestone.id).startsWith('M4-'));
      const featureGateSatisfied = plan.no_features === true || featureMilestones.some(
        (milestone: any) => state.reviewed_milestones.includes(milestone.id)
      );

      return {
        ...state,
        phase: allCompleted && featureGateSatisfied ? 'ready-to-ship' : 'ready-to-execute',
        active_task: null,
        active_milestone: null,
        completed_tasks: completedTasks,
        evidence: updatedEvidence,
        block_reason: null,
        updated_at: new Date().toISOString(),
      };
    } else {
      // Some commands are still pending verification
      return {
        ...state,
        phase: 'verifying',
        evidence: updatedEvidence,
        block_reason: null,
        updated_at: new Date().toISOString(),
      };
    }
  } else {
    // Verification failed -> check failure_policy
    let activeTaskCard: any = null;
    const isV3 = 'tasks' in plan && plan.tasks && typeof plan.tasks === 'object' && !Array.isArray(plan.tasks);
    if (isV3) {
      activeTaskCard = plan.tasks[state.active_task!];
    } else {
      for (const m of plan.milestones) {
        const t = m.tasks.find((task: any) => task.id === state.active_task);
        if (t) {
          activeTaskCard = t;
          break;
        }
      }
    }

    const failurePolicy = activeTaskCard?.failure_policy || 'abort';
    const verifyCommand = `${CLI} verify --task ${state.active_task ?? ''}`;
    const repairPaths = Array.isArray(activeTaskCard?.allowed_paths) ? activeTaskCard.allowed_paths : [];
    if (failurePolicy === 'abort') {
      const blockRecord = createBlockRecord(state, {
        kind: 'verification-failed',
        reason_code: 'TASK_COMMAND_FAILED_ABORT_POLICY',
        recoverable_by: verifyCommand,
        detail: `Task verification failed under abort policy. Command failed with exit code ${record.exit_code}.`,
        remediation: {
          actions: ['read', 'write-task-scope', 'run-command'],
          paths: repairPaths,
          command: verifyCommand,
        },
      });
      return {
        ...state,
        phase: 'blocked',
        evidence: updatedEvidence,
        block_reason: blockRecord,
        updated_at: new Date().toISOString(),
      };
    } else {
      const blockRecord = createBlockRecord(state, {
        kind: 'verification-failed',
        reason_code: 'TASK_COMMAND_FAILED',
        recoverable_by: verifyCommand,
        detail: `Task verification command failed with exit code ${record.exit_code}.`,
        remediation: {
          actions: ['read', 'write-task-scope', 'run-command'],
          paths: repairPaths,
          command: verifyCommand,
        },
      });
      return {
        ...state,
        phase: 'repairing',
        evidence: updatedEvidence,
        block_reason: blockRecord,
        updated_at: new Date().toISOString(),
      };
    }
  }
}

export function completeTier1Emit(workspaceRoot: string): ExecutionState {
  // Kept as a compatibility entry point for old Core callers. Production tier-1
  // emit goes through completeTier1Activation inside the emit recovery journal.
  return completeTier1Activation(workspaceRoot);
}

/**
 * P3.1 — the handoff authority a successful tier-1 activation must call.
 * Idempotent by design: a tier-1 re-emit (design doc edits after the build
 * has already started) must never clobber execution state that has already
 * moved past plan-validating — that would silently discard in-flight build
 * progress/evidence. Only when no execution state exists yet does this
 * create one, bound to the digests of what was just activated.
 */
export function completeTier1Activation(
  workspaceRoot: string,
  opts: { handoff?: Tier1Handoff } = {}
): ExecutionState {
  const execStatePath = `${workspaceRoot}/.design-everything/execution-state.json`;
  if (existsSync(execStatePath)) {
    return loadExecutionState(execStatePath);
  }
  const state: ExecutionState = {
    ...initExecutionState(),
    // These are intentionally blank before semantic validation. Handoff
    // digests prove what was activated, not that its plan has passed.
    handoff: opts.handoff,
  };
  saveExecutionState(execStatePath, state);
  return state;
}

export function evaluateBuildReadiness(
  progress: { phase: string; branch: string | null },
  execState: ExecutionState | null
): { ready: boolean; reason_code: string; next_command: string; message: string } {
  if (!execState) {
    return {
      ready: false,
      reason_code: 'EXECUTION_STATE_REQUIRED',
      next_command: '/build',
      message: 'Execution state missing. Run /build to validate plan before coding.',
    };
  }

  if (execState.phase === 'plan-validating') {
    return {
      ready: false,
      reason_code: 'PLAN_VALIDATION_REQUIRED',
      next_command: '/build',
      message: 'Design documents emitted, but execution plan requires validation before coding. Run /build.',
    };
  }

  if (execState.phase === 'blocked') {
    return {
      ready: false,
      reason_code: execState.block_reason?.reason_code ?? 'EXECUTION_STATE_BLOCKED',
      next_command: execState.block_reason?.recoverable_by ?? `${CLI} repair`,
      message: `Execution state is blocked: ${execState.block_reason?.detail ?? 'unknown reason'}.`,
    };
  }

  if (execState.phase === 'ready-to-execute' || execState.phase === 'repairing') {
    return {
      ready: true,
      reason_code: 'READY_TO_EXECUTE',
      next_command: execState.active_task ? `${CLI} verify --task ${execState.active_task}` : `${CLI} build`,
      message: 'Execution state is ready for build tasks.',
    };
  }

  if (execState.phase === 'executing') {
    return {
      ready: false,
      reason_code: 'TASK_ALREADY_ACTIVE',
      next_command: execState.active_task ? `${CLI} verify --task ${execState.active_task}` : `${CLI} status`,
      message: 'A task is already active; verify or repair that task before starting another one.',
    };
  }

  if (execState.phase === 'verifying') {
    return {
      ready: false,
      reason_code: 'TASK_VERIFICATION_REQUIRED',
      next_command: execState.active_task ? `${CLI} verify --task ${execState.active_task}` : `${CLI} status`,
      message: 'The active task still requires verification.',
    };
  }

  if (execState.phase === 'reviewing') {
    return {
      ready: false,
      reason_code: 'REVIEW_REQUIRED',
      next_command: execState.active_milestone ? `${CLI} review --milestone ${execState.active_milestone}` : `${CLI} status`,
      message: 'The current milestone requires review before another build task can begin.',
    };
  }

  if (execState.phase === 'ready-to-ship') {
    return {
      ready: false,
      reason_code: 'BUILD_COMPLETE',
      next_command: `${CLI} status`,
      message: 'All build tasks are complete.',
    };
  }

  return {
    ready: false,
    reason_code: 'EXECUTION_STATE_NOT_READY',
    next_command: progress.phase === 'ready-for-validation' ? `${CLI} validate` : `${CLI} status`,
    message: `Current execution phase is ${execState.phase}, which is not ready for build tasks.`,
  };
}

export function blockExecution(state: ExecutionState, blockRecord: BlockRecord): ExecutionState {
  if (
    blockRecord.remediation.plan_revision !== state.plan_revision ||
    blockRecord.remediation.task_id !== blockRecord.task_id ||
    blockRecord.remediation.command !== blockRecord.recoverable_by
  ) {
    throw new Error('BLOCK_REMEDIATION_BINDING_INVALID');
  }
  return {
    ...state,
    phase: 'blocked',
    block_reason: blockRecord,
    updated_at: new Date().toISOString(),
  };
}

export function recoverBlockedExecution(
  state: ExecutionState,
  proof: {
    kind: BlockKind;
    pass: boolean;
    digests?: {
      plan_digest: string;
      docs_digest: string;
      validation_digest: string;
    };
  }
): { ok: boolean; state: ExecutionState; reason_code: string } {
  if (state.phase !== 'blocked') {
    return { ok: false, state, reason_code: 'NOT_BLOCKED' };
  }

  const currentBlock = state.block_reason;
  if (!currentBlock) {
    return { ok: false, state, reason_code: 'BLOCK_RECORD_REQUIRED' };
  }
  if (currentBlock.kind !== proof.kind) {
    return { ok: false, state, reason_code: 'BLOCK_KIND_MISMATCH' };
  }

  if (!proof.pass) {
    return { ok: false, state, reason_code: 'RECOVERY_PROOF_FAILED' };
  }

  if (!VALIDATION_RECOVERABLE_KINDS.has(currentBlock.kind)) {
    return { ok: false, state, reason_code: 'BLOCK_KIND_REQUIRES_OWN_REMEDIATION' };
  }

  const hasValidationProof = Boolean(
    proof.digests &&
      proof.digests.plan_digest.length > 0 &&
      proof.digests.docs_digest.length > 0 &&
      proof.digests.validation_digest.length > 0
  );
  if (!hasValidationProof) {
    return { ok: false, state, reason_code: 'VALIDATION_PROOF_REQUIRED' };
  }

  return {
    ok: true,
    state: {
      ...state,
      phase: state.active_task ? 'repairing' : 'ready-to-execute',
      block_reason: null,
      validated_plan_digest: proof.digests!.plan_digest,
      validated_docs_digest: proof.digests!.docs_digest,
      validation_result_digest: proof.digests!.validation_digest,
      updated_at: new Date().toISOString(),
    },
    reason_code: 'RECOVERED',
  };
}

export function allowedRemediation(state: ExecutionState): {
  allowed_actions: string[];
  allowed_paths: string[];
  next_command: string;
} {
  if (state.phase !== 'blocked') {
    return { allowed_actions: ['*'], allowed_paths: ['*'], next_command: '' };
  }

  // A blocked phase with no block reason at all (typed or legacy string) is
  // a data-integrity gap, not "nothing to restrict" — fail closed to
  // read-only instead of granting blanket remediation.
  if (!state.block_reason) {
    return { allowed_actions: ['read'], allowed_paths: [], next_command: '/build' };
  }

  const block = state.block_reason;
  if (
    !block ||
    block.remediation.task_id !== block.task_id ||
    block.remediation.plan_revision !== state.plan_revision ||
    block.remediation.command !== block.recoverable_by
  ) {
    return { allowed_actions: ['read'], allowed_paths: [], next_command: `${CLI} repair` };
  }

  return {
    allowed_actions: [...block.remediation.actions],
    allowed_paths: [...block.remediation.paths],
    next_command: block.remediation.command,
  };
}
