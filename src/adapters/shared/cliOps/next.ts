/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  loadExecutionState,
  saveExecutionState,
  evaluateBuildReadiness,
  loadEmittedDocs,
  assertValidatedSnapshot,
  inspectRuntimeHealth,
  ExecutionState,
} from '../../../core/index.js';
import { CliResultEnvelope, redactInternalError } from '../cliResult.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../../version.js';

export function handleNext(workspaceRoot: string): CliResultEnvelope {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

  // B2e §3 — status and next-step must read the same Core health result
  // instead of each growing its own catch-and-guess logic for corruption
  // this function doesn't otherwise check (e.g. a corrupt execution-plan.json
  // used to surface here as a generic STALE_SNAPSHOT from the try/catch
  // below, with no reason_code distinguishing it from a genuinely stale
  // digest). Mirrors handleStatus's health-first gate in status.ts.
  const health = inspectRuntimeHealth(workspaceRoot);
  if (health.status === 'broken') {
    const primaryIssue = health.issues[0];
    return {
      ok: false,
      operation: 'next',
      reason_code: primaryIssue?.reason_code || 'RUNTIME_HEALTH_BROKEN',
      severity: 'error',
      message: `Runtime state bị hỏng: ${primaryIssue?.detail || 'State corrupted'}`,
      next_command: primaryIssue?.safe_next_command || targetLocalCliCommand('repair'),
      runtime_version: RUNTIME_VERSION,
    };
  }

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

  // P3.1 — evaluateBuildReadiness is the single handoff authority for "is this
  // execution state actually ready for build tasks": a just-created
  // plan-validating state is guaranteed to fail the digest check below, so
  // surface its real reason (PLAN_VALIDATION_REQUIRED) instead of the generic
  // snapshot-staleness error.
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
