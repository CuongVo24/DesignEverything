/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  loadExecutionState,
  saveExecutionState,
  startTask,
  evaluateBuildReadiness,
  loadEmittedDocs,
  assertValidatedSnapshot,
  inspectRuntimeHealth,
  ExecutionState,
} from '../../../core/index.js';
import { CliResultEnvelope, redactInternalError } from '../cliResult.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../../version.js';
import { getArg } from './support.js';

export function handleStart(workspaceRoot: string, argv: string[]): CliResultEnvelope {
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

  // B2e §3 — same health-first gate as handleStatus/handleNext (status.ts,
  // next.ts): start must deny on the same Core health result those two read,
  // not grow its own separate corruption-detection story.
  const health = inspectRuntimeHealth(workspaceRoot);
  if (health.status === 'broken') {
    const primaryIssue = health.issues[0];
    return {
      ok: false,
      operation: 'start',
      reason_code: primaryIssue?.reason_code || 'RUNTIME_HEALTH_BROKEN',
      severity: 'error',
      message: `Runtime state bị hỏng: ${primaryIssue?.detail || 'State corrupted'}`,
      next_command: primaryIssue?.safe_next_command || targetLocalCliCommand('repair'),
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

  // P1 gap-fix (§9.1) — start must consult evaluateBuildReadiness the same way
  // next does: a freshly-emitted plan-validating state is guaranteed to fail
  // the digest check below, so surface PLAN_VALIDATION_REQUIRED instead of the
  // generic STALE_SNAPSHOT error.
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
