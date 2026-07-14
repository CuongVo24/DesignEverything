import { join, resolve, relative, normalize } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import {
  loadProgress,
  saveProgress,
  loadGatePolicy,
  evaluateGate,
  isBlocked,
  checkExecutionGate,
  loadExecutionState,
  saveExecutionState,
  assertValidatedSnapshot,
  loadEmittedDocs,
  ExecutionPlanV3,
} from '../../core/index.js';

function getFilesRecursive(dir: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) {
    return results;
  }
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

export function onPreToolUse(ctx: {
  workspaceRoot: string;
  tool: 'Write' | 'Edit' | 'Bash';
  toolInput: unknown;
}): { decision: 'allow' | 'deny'; message?: string } {
  // 1. Load progress state
  const progressPath = join(ctx.workspaceRoot, 'progress.json');
  let progress;
  try {
    progress = loadProgress(progressPath);
  } catch (error: unknown) {
    return {
      decision: 'deny',
      message: `Failed to load progress state: ${(error as Error).message}`,
    };
  }

  // 2. Normalize and check path traversal for Write/Edit
  let targetPath = '';
  if (ctx.tool === 'Write' || ctx.tool === 'Edit') {
    if (typeof ctx.toolInput === 'string') {
      targetPath = ctx.toolInput;
    } else if (ctx.toolInput && typeof ctx.toolInput === 'object') {
      const obj = ctx.toolInput as Record<string, unknown>;
      targetPath =
        (typeof obj.path === 'string' ? obj.path : '') ||
        (typeof obj.filepath === 'string' ? obj.filepath : '') ||
        (typeof obj.file === 'string' ? obj.file : '') ||
        '';
    }

    if (!targetPath) {
      return { decision: 'deny', message: 'Không chỉ định đường dẫn tệp để sửa đổi.' };
    }

    const normalizedPath = normalize(targetPath).replace(/\\/g, '/');
    const absPath = resolve(ctx.workspaceRoot, normalizedPath);
    const relPath = relative(ctx.workspaceRoot, absPath).replace(/\\/g, '/');

    if (relPath.startsWith('..') || relPath.startsWith('/') || absPath === ctx.workspaceRoot) {
      return {
        decision: 'deny',
        message: `Đường dẫn không hợp lệ hoặc cố gắng path traversal ngoài workspace: ${targetPath}`,
      };
    }
    targetPath = relPath;
  }

  // 3. Classify and check Bash commands
  let command = '';
  let argv: string[] = [];
  let baseCmd = '';
  if (ctx.tool === 'Bash') {
    if (typeof ctx.toolInput === 'string') {
      command = ctx.toolInput;
    } else if (ctx.toolInput && typeof ctx.toolInput === 'object') {
      const obj = ctx.toolInput as Record<string, unknown>;
      command = typeof obj.command === 'string' ? obj.command : '';
    }

    if (!command) {
      return { decision: 'deny', message: 'Không chỉ định lệnh thực thi.' };
    }

    const cmdStr = command.trim();
    const hasSeparator = /[&;|]/.test(cmdStr);
    const hasRedirect = /[<>]/.test(cmdStr);
    const hasSubstitution = /\$\(|`/.test(cmdStr);
    const hasInlineInterpreter = /node\s+-e|python\s+-c/i.test(cmdStr);

    if (hasSeparator || hasRedirect || hasSubstitution || hasInlineInterpreter) {
      return {
        decision: 'deny',
        message: `Lệnh thực thi bị chặn do chứa ký tự shell đặc biệt hoặc inline interpreter: ${cmdStr}. Vui lòng sử dụng lệnh kiểm chứng chính xác hoặc chạy verify.`,
      };
    }

    argv = cmdStr.split(/\s+/);
    baseCmd = argv[0];

    if (baseCmd === 'git') {
      const sub = argv[1];
      const disallowedGit = ['apply', 'checkout', 'reset', 'commit', 'push', 'merge', 'rebase', 'add', 'rm', 'mv'];
      if (disallowedGit.includes(sub)) {
        return {
          decision: 'deny',
          message: `Không được phép sử dụng lệnh git ghi sửa "${sub}" trong pha thực thi để tránh mất mát code/state.`,
        };
      }
    }

    const safeCmds = ['cat', 'less', 'more', 'tail', 'head', 'ls', 'dir', 'find', 'pwd', 'git', 'grep', 'rg', 'echo'];
    if (safeCmds.includes(baseCmd)) {
      return { decision: 'allow' };
    }
  }

  // 4. Load execution state
  const execStatePath = join(ctx.workspaceRoot, '.design-everything/execution-state.json');
  let execState = null;
  if (existsSync(execStatePath)) {
    try {
      execState = loadExecutionState(execStatePath);
    } catch (error: unknown) {
      return {
        decision: 'deny',
        message: `Tệp trạng thái thực thi bị lỗi hoặc không hợp lệ: ${(error as Error).message}`,
      };
    }
  } else {
    if (progress.phase !== 'interview' && progress.phase !== 'docs-emitted') {
      return {
        decision: 'deny',
        message: 'Thiếu tệp trạng thái thực thi (execution-state.json). Vui lòng phỏng vấn hoàn tất và chạy lệnh "validate" trước.',
      };
    }
  }

  // 5. Handle Early Bypass for docs/Design in non-execution or interview phase
  const isDocOrDesign = ctx.tool === 'Write' || ctx.tool === 'Edit' ? (
    targetPath.startsWith('Design/') ||
    targetPath.startsWith('docs/') ||
    targetPath === 'progress.json'
  ) : false;

  if (isDocOrDesign) {
    if (!execState || execState.phase === 'plan-validating') {
      return { decision: 'allow' };
    }
  }

  // 6. Handle Blocked / Plan-Validating Phases
  if (execState) {
    if (execState.phase === 'blocked') {
      return {
        decision: 'deny',
        message: `Quy trình thực thi đang bị chặn (blocked). Lý do: ${execState.block_reason || 'Không rõ lý do.'}. Vui lòng chạy "validate" hoặc "repair" để khắc phục.`,
      };
    }

    if (execState.phase === 'plan-validating') {
      if (ctx.tool === 'Write' || ctx.tool === 'Edit') {
        if (
          !targetPath.startsWith('Design/') &&
          !targetPath.startsWith('docs/') &&
          !targetPath.startsWith('.design-everything/')
        ) {
          return {
            decision: 'deny',
            message: `Không có task hoạt động (active_task) nào đang chạy. Vui lòng chạy lệnh "validate" để bắt đầu quy trình.`,
          };
        }
      }
      if (ctx.tool === 'Bash') {
        const isCliCommand = argv.includes('cli.mjs') || argv.includes('cli.js');
        if (isCliCommand) {
          return { decision: 'allow' };
        }
        const safeCmds = ['cat', 'less', 'more', 'tail', 'head', 'ls', 'dir', 'find', 'pwd', 'git', 'grep', 'rg', 'echo'];
        if (!safeCmds.includes(baseCmd)) {
          return {
            decision: 'deny',
            message: `Lệnh "${baseCmd}" bị chặn trong pha validate kế hoạch. Vui lòng chạy lệnh "validate" trước.`,
          };
        }
      }
    }
  }

  // 7. Handle Execution Phases (ready-to-execute, executing, verifying, repairing)
  if (execState && execState.phase !== 'plan-validating' && execState.phase !== 'blocked') {
    const execPlanPath = join(ctx.workspaceRoot, '.design-everything/execution-plan.json');
    let planJson: ExecutionPlanV3 | null = null;
    if (existsSync(execPlanPath)) {
      try {
        planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
        const emittedDocs = loadEmittedDocs(ctx.workspaceRoot, execPlanPath);
        assertValidatedSnapshot({ docs: emittedDocs, plan: planJson!, state: execState });
      } catch (error: unknown) {
        try {
          saveExecutionState(execStatePath, execState);
        } catch {
          // ignore
        }
        return {
          decision: 'deny',
          message: `Xác thực Snapshot thất bại: ${(error as Error).message}`,
        };
      }
    }

    if (!execState.active_task) {
      return {
        decision: 'deny',
        message: 'Không có task hoạt động (active_task) nào đang chạy. Vui lòng kích hoạt một task bằng lệnh "start" trước khi sửa mã nguồn.',
      };
    }

    const activeTask = planJson?.tasks?.[execState.active_task];
    const allowedPaths = activeTask?.allowed_paths || [];

    if (ctx.tool === 'Write' || ctx.tool === 'Edit') {
      const policyPath = join(ctx.workspaceRoot, 'Design/Content/interview-script/gate-policy.yaml');
      let policy;
      try {
        policy = loadGatePolicy(policyPath);
      } catch (error: unknown) {
        return { decision: 'deny', message: `Không thể nạp gate policy: ${(error as Error).message}` };
      }

      const check = checkExecutionGate(execState, policy, ctx.tool, targetPath, allowedPaths);
      if (!check.allowed) {
        return {
          decision: 'deny',
          message: `Đường dẫn tệp "${targetPath}" bị chặn. Lý do: ${check.reason || 'không nằm trong allowed_paths của active task.'} Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
        };
      }
      return { decision: 'allow' };
    }

    if (ctx.tool === 'Bash') {
      const isCliCommand = argv.includes('cli.mjs') || argv.includes('cli.js');
      if (isCliCommand) {
        return { decision: 'allow' };
      }

      const safeCmds = ['cat', 'less', 'more', 'tail', 'head', 'ls', 'dir', 'find', 'pwd', 'git', 'grep', 'rg', 'echo'];
      if (safeCmds.includes(baseCmd)) {
        return { decision: 'allow' };
      }

      let isExactVerification = false;
      if (activeTask && activeTask.commands) {
        const cmdStr = command.trim();
        for (const cmd of activeTask.commands) {
          const verificationCmdStr = cmd.argv.join(' ');
          if (cmdStr === verificationCmdStr || cmdStr.replace(/['"]/g, '') === verificationCmdStr.replace(/['"]/g, '')) {
            isExactVerification = true;
            break;
          }
        }
      }

      if (isExactVerification) {
        return { decision: 'allow' };
      }

      return {
        decision: 'deny',
        message: `Lệnh thực thi bị chặn: "${command}". Nhiệm vụ hoạt động hiện tại: "${execState.active_task}". Chỉ cho phép các lệnh đọc thông tin an sau hoặc lệnh kiểm chứng chính xác của task. Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
      };
    }
  }

  // 8. Evaluate Gate Policy for Interview / Progress
  const policyPath = join(ctx.workspaceRoot, 'Design/Content/interview-script/gate-policy.yaml');
  let policy;
  try {
    policy = loadGatePolicy(policyPath);
  } catch (error: unknown) {
    return {
      decision: 'deny',
      message: `Failed to load gate policy: ${(error as Error).message}`,
    };
  }

  const validationPass = execState ? !['plan-validating', 'blocked'].includes(execState.phase) : true;
  const completedTasks = execState ? execState.completed_tasks : [];
  const docsDir = join(ctx.workspaceRoot, 'docs');
  const existingDocs = getFilesRecursive(docsDir);

  let stateModified = false;
  let blockedGate = null;

  const isDocEdit = ctx.tool === 'Write' || ctx.tool === 'Edit' ? (
    targetPath.startsWith('Design/') ||
    targetPath.startsWith('docs/') ||
    targetPath.startsWith('.design-everything/') ||
    targetPath === 'progress.json'
  ) : false;

  for (const gate of policy.gates) {
    if (!execState && (gate.requires_validation || gate.task_id || gate.requires_evidence)) {
      continue;
    }

    const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);

    if (open) {
      if (!progress.gates_passed.includes(gate.id)) {
        progress.gates_passed.push(gate.id);
        stateModified = true;
      }
    }

    if (!isDocEdit && isBlocked(gate, ctx.tool, existingDocs, validationPass, completedTasks) && !blockedGate) {
      blockedGate = gate;
    }
  }

  if (stateModified) {
    try {
      saveProgress(progressPath, progress);
    } catch (error: unknown) {
      return {
        decision: 'deny',
        message: `Failed to update progress gates: ${(error as Error).message}`,
      };
    }
  }

  if (blockedGate) {
    return {
      decision: 'deny',
      message: blockedGate.message,
    };
  }

  return { decision: 'allow' };
}
