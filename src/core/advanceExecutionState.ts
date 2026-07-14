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
  if (state.phase !== 'plan-validating') {
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
