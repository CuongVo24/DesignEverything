/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  loadExecutionState,
  saveExecutionState,
  runTaskVerification,
  promoteExecutionPlan,
  calculatePlanDigest,
  calculateDocsDigest,
  loadEmittedDocs,
  assertValidatedSnapshot,
  createBlockRecord,
} from '../../../core/index.js';
import { CliResultEnvelope, redactInternalError } from '../cliResult.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../../version.js';
import { getArg, hasFlag, writeProgressLog } from './support.js';

export async function handleVerify(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
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
