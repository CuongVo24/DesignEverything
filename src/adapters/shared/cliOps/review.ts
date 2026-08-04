/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import {
  loadExecutionState,
  saveExecutionState,
  transitionToReview,
  runFeatureReview,
  reviewFeatureOutput,
  applyReviewOutcome,
  renderBreakTaskDoc,
  renderBreakTaskIndex,
  breakTaskFileName,
  loadProjectConventionsFromCwd,
} from '../../../core/index.js';
import { CliResultEnvelope } from '../cliResult.js';
import { RUNTIME_VERSION, targetLocalCliCommand } from '../../../version.js';
import { getArg, readBreakCount, writeProgressLog } from './support.js';

export async function handleReview(workspaceRoot: string, argv: string[]): Promise<CliResultEnvelope> {
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
    ...new Set((milestone.tasks || []).flatMap((tid: string) => reviewPlan.tasks?.[tid]?.allowed_paths ?? [])),
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
      const open = isCurrent ? breakTasks.filter((t) => !outcomeState.completed_tasks.includes(t.id)).length : null;
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
    message:
      breakTasks.length === 0
        ? `Review sạch cho milestone ${milestoneId}.`
        : `Milestone ${milestoneId} sinh ra ${breakTasks.length} break-task.`,
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
