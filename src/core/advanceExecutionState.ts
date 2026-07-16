/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { dirname } from 'path';
import {
  ExecutionState,
  EvidenceRecord,
  executionStateSchema,
} from './schemas/index.js';

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
  const result = executionStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid execution state schema: ${JSON.stringify(result.error.format())}`);
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
  // Re-validate hợp lệ từ các pha CHƯA thực thi: plan-validating (lần đầu/sau
  // amend), blocked (sửa docs xong chạy lại validate — luồng tài liệu hóa trong
  // build SKILL), ready-to-execute (revalidate idempotent, VD kiểm profile
  // drift). Đang executing/repairing/reviewing thì không được revalidate.
  if (state.phase !== 'plan-validating' && state.phase !== 'blocked' && state.phase !== 'ready-to-execute') {
    throw new Error(`Cannot transition to ready-to-execute from phase: ${state.phase}`);
  }
  if (!validationPass) {
    return {
      ...state,
      phase: 'blocked',
      block_reason: 'Semantic plan validation failed.',
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
  breakTaskIds: string[]
): ExecutionState {
  if (state.phase !== 'reviewing') {
    throw new Error(`applyReviewOutcome chỉ chạy ở phase reviewing, không phải ${state.phase}.`);
  }
  if (state.active_milestone !== milestoneId) {
    throw new Error(`Review đang mở cho ${state.active_milestone}, không phải ${milestoneId}.`);
  }
  if (breakTaskIds.length === 0) {
    return closeFeatureReview({ ...state, open_break_tasks: [] }, milestoneId);
  }
  return {
    ...state,
    phase: 'reviewing',
    open_break_tasks: breakTaskIds,
    block_reason: `Feature ${milestoneId} có ${breakTaskIds.length} break-task chưa xử lý; chưa được coi là done.`,
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

      return {
        ...state,
        phase: allCompleted ? 'ready-to-ship' : 'ready-to-execute',
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
    if (failurePolicy === 'abort') {
      return {
        ...state,
        phase: 'blocked',
        evidence: updatedEvidence,
        block_reason: `Task verification failed under abort policy. Command failed with exit code ${record.exit_code}.`,
        updated_at: new Date().toISOString(),
      };
    } else {
      return {
        ...state,
        phase: 'repairing',
        evidence: updatedEvidence,
        block_reason: `Task verification command failed with exit code ${record.exit_code}.`,
        updated_at: new Date().toISOString(),
      };
    }
  }
}
