import { join, resolve, relative } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import {
  loadProgress,
  saveProgress,
  loadGatePolicy,
  evaluateGate,
  isBlocked,
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
  // 1. Classify tool actions and always allow document edits
  if (ctx.tool === 'Write' || ctx.tool === 'Edit') {
    let targetPath = '';
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

  // 3. Load progress state and gate policy
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

  // 4. Retrieve existing documents list from docs/
  const docsDir = join(ctx.workspaceRoot, 'docs');
  const existingDocs = getFilesRecursive(docsDir);

  // 5. Evaluate gates
  let stateModified = false;
  let blockedGate = null;

  for (const gate of policy.gates) {
    const { open } = evaluateGate(gate, existingDocs);

    // If gate is open, append to gates_passed (append-only)
    if (open) {
      if (!progress.gates_passed.includes(gate.id)) {
        progress.gates_passed.push(gate.id);
        stateModified = true;
      }
    }

    // Check if the tool is blocked by this gate
    if (isBlocked(gate, ctx.tool, existingDocs)) {
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
