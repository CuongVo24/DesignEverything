import { join, resolve, relative } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import {
  loadProgress,
  saveProgress,
  loadGatePolicy,
  evaluateGate,
  isBlocked,
  checkExecutionGate,
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
  let targetPath = '';

  // 1. Classify tool actions and always allow document edits
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

    if (targetPath) {
      const absPath = resolve(ctx.workspaceRoot, targetPath);
      const relPath = relative(ctx.workspaceRoot, absPath).replace(/\\/g, '/');

      // Always allow changes inside Design/ or docs/ directories
      if (
        relPath.startsWith('Design/') ||
        relPath.startsWith('docs/') ||
        relPath === 'Design' ||
        relPath === 'docs'
      ) {
        return { decision: 'allow' };
      }
    }
  }

  // 2. Classify Bash commands (whitelist safe commands)
  if (ctx.tool === 'Bash') {
    let command = '';
    if (typeof ctx.toolInput === 'string') {
      command = ctx.toolInput;
    } else if (ctx.toolInput && typeof ctx.toolInput === 'object') {
      const obj = ctx.toolInput as Record<string, unknown>;
      command = typeof obj.command === 'string' ? obj.command : '';
    }

    const trimCmd = command.trim();
    const cmdName = trimCmd.split(/\s+/)[0];
    const safeCmds = [
      'cat',
      'less',
      'more',
      'tail',
      'head',
      'ls',
      'dir',
      'find',
      'pwd',
      'git',
      'grep',
      'rg',
      'echo',
    ];

    let isSafe = false;
    if (safeCmds.includes(cmdName)) {
      isSafe = true;
      // Redirects might write to source code files, block to be safe if redirects are present
      if (trimCmd.includes('>') || trimCmd.includes('>>')) {
        isSafe = false;
      }
    }

    // Always allow safe read-only/doc commands
    if (isSafe) {
      return { decision: 'allow' };
    }
  }

  // 3. Load progress state, execution state, and gate policy
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

  // Load execution state if exists
  const execStatePath = join(ctx.workspaceRoot, '.design-everything/execution-state.json');
  let execState = null;
  if (existsSync(execStatePath)) {
    try {
      const content = readFileSync(execStatePath, 'utf8');
      execState = JSON.parse(content);
    } catch {
      // ignore
    }
  }

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

  // If there is an active execution state, check allows_paths/task gate
  if (execState) {
    if (execState.phase === 'executing' && execState.active_task) {
      const check = checkExecutionGate(execState, policy, ctx.tool, targetPath);
      if (!check.allowed) {
        return {
          decision: 'deny',
          message: check.reason ?? 'Blocked by execution gate.',
        };
      }
      return { decision: 'allow' };
    }

    // If execution state is present but not in executing phase, and we want to write/edit source code:
    if (
      execState.phase !== 'executing' &&
      (ctx.tool === 'Write' || ctx.tool === 'Edit')
    ) {
      return {
        decision: 'deny',
        message: `Không có task hoạt động (active_task) nào đang chạy. Vui lòng kích hoạt một task trước khi sửa mã nguồn.`,
      };
    }
  }

  const validationPass = execState ? !['plan-validating', 'blocked'].includes(execState.phase) : true;
  const completedTasks = execState ? execState.completed_tasks : [];

  // 4. Retrieve existing documents list from docs/
  const docsDir = join(ctx.workspaceRoot, 'docs');
  const existingDocs = getFilesRecursive(docsDir);

  // 5. Evaluate gates
  let stateModified = false;
  let blockedGate = null;

  for (const gate of policy.gates) {
    // If execution state doesn't exist, ignore V3 execution gates
    if (!execState && (gate.requires_validation || gate.task_id || gate.requires_evidence)) {
      continue;
    }

    const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);

    // If gate is open, append to gates_passed (append-only)
    if (open) {
      if (!progress.gates_passed.includes(gate.id)) {
        progress.gates_passed.push(gate.id);
        stateModified = true;
      }
    }

    // Check if the tool is blocked by this gate
    if (isBlocked(gate, ctx.tool, existingDocs, validationPass, completedTasks) && !blockedGate) {
      blockedGate = gate;
    }
  }

  // 6. Save progress if updated
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

  // 7. Return block message if blocked
  if (blockedGate) {
    return {
      decision: 'deny',
      message: blockedGate.message,
    };
  }

  return { decision: 'allow' };
}
