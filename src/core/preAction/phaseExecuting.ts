import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadGatePolicy } from '../loadGatePolicy.js';
import { assertValidatedSnapshot, loadEmittedDocs } from '../validatedSnapshot.js';
import { classifyCommand } from '../classifyCommand.js';
import { matchesPathPattern } from '../pathPolicy.js';
import type { PreActionDecision } from '../schemas/index.js';
import type { PhaseContext } from './types.js';

/**
 * Active-task execution phase (execState present, not blocked/plan-validating).
 * Enforces the validated snapshot, requires an active task, and scopes writes
 * to the task's allowed_paths and shell to its exact verification commands.
 */
export function phaseExecuting(ctx: PhaseContext): PreActionDecision {
  const { request, workspace, resolvedPaths, commandStr, execState } = ctx;

  const execPlanPath = join(workspace, '.design-everything/execution-plan.json');
  let planJson = request.plan || null;
  if (!planJson && existsSync(execPlanPath)) {
    try {
      planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      const emittedDocs = loadEmittedDocs(workspace, execPlanPath);
      assertValidatedSnapshot({ docs: emittedDocs, plan: planJson!, state: execState! });
    } catch (error: unknown) {
      return {
        decision: 'deny',
        reason_code: 'stale-digest',
        user_message: `Xác thực Snapshot thất bại: ${(error as Error).message}`,
        enforcement: 'hard',
      };
    }
  }

  if (!execState!.active_task) {
    return {
      decision: 'deny',
      reason_code: 'task-inactive',
      user_message: 'Không có task hoạt động (active_task) nào đang chạy. Vui lòng kích hoạt một task bằng lệnh "start" trước.',
      enforcement: 'hard',
    };
  }

  let policy = request.policy || null;
  const policyPath = join(workspace, 'Design/Content/interview-script/gate-policy.yaml');
  if (!policy && existsSync(policyPath)) {
    try {
      policy = loadGatePolicy(policyPath);
    } catch {
      // ignore
    }
  }

  const activeTask = planJson?.tasks?.[execState!.active_task];
  let allowedPaths = activeTask?.allowed_paths || [];
  if (allowedPaths.length === 0 && policy) {
    const taskGate = policy.gates.find((g: any) => g.task_id === execState!.active_task); // eslint-disable-line @typescript-eslint/no-explicit-any
    allowedPaths = taskGate?.allows_paths || [];
  }

  if (request.action_kind === 'read') {
    return {
      decision: 'allow',
      reason_code: 'read-only-allowed',
      user_message: 'Đọc tệp được phép.',
      enforcement: 'hard',
      matched_task_id: execState!.active_task,
    };
  }

  if (request.action_kind === 'write') {
    const isAllPathsAllowed = resolvedPaths.every((path) =>
      allowedPaths.some((allowedGlob: string) => matchesPathPattern(path, allowedGlob))
    );

    if (!isAllPathsAllowed) {
      return {
        decision: 'deny',
        reason_code: 'path-outside-scope',
        user_message: `Đường dẫn bị chặn. Lý do: không nằm trong danh sách được sửa (allows_paths) của active task. Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
        enforcement: 'hard',
        matched_task_id: execState!.active_task,
      };
    }

    return {
      decision: 'allow',
      reason_code: 'write-allowed',
      user_message: 'Sửa đổi tệp hợp lệ.',
      enforcement: 'hard',
      matched_task_id: execState!.active_task,
    };
  }

  if (request.action_kind === 'shell') {
    // CLI-shaped invocations are already decided by the orchestrator.
    const shellClassification = classifyCommand({ argv: request.command_argv, raw: commandStr, cwd: request.workspace });
    if (shellClassification.outcome === 'proven_read_only') {
      return {
        decision: 'allow',
        reason_code: shellClassification.reason_code,
        user_message: shellClassification.message,
        enforcement: 'hard',
        matched_task_id: execState!.active_task,
      };
    }

    // Exact verification command matching.
    let isExactVerification = false;
    if (activeTask && activeTask.commands) {
      const cmdStr = commandStr.trim();
      for (const cmd of activeTask.commands) {
        const verificationCmdStr = cmd.argv.join(' ');
        if (cmdStr === verificationCmdStr || cmdStr.replace(/['"]/g, '') === verificationCmdStr.replace(/['"]/g, '')) {
          isExactVerification = true;
          break;
        }
      }
    }

    if (isExactVerification) {
      return {
        decision: 'allow',
        reason_code: 'command-allowed',
        user_message: 'Lệnh kiểm chứng chính xác được phép.',
        enforcement: 'hard',
        matched_task_id: execState!.active_task,
      };
    }

    return {
      decision: 'deny',
      reason_code: 'command-not-registered',
      user_message: `Lệnh thực thi bị chặn: "${commandStr}". Nhiệm vụ hoạt động hiện tại: "${execState!.active_task}". Chỉ cho phép các lệnh đọc thông tin an toàn hoặc lệnh kiểm chứng chính xác của task. Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
      enforcement: 'hard',
      matched_task_id: execState!.active_task,
    };
  }

  return { decision: 'deny', reason_code: 'unsupported-action', user_message: 'Hành động không được hỗ trợ.', enforcement: 'hard' };
}
