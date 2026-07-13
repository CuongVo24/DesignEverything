import type { Gate, GatePolicy, ExecutionState } from './schemas/index.js';
import { basename } from 'path';

const getBasename = (p: string): string => basename(p.replace(/\\/g, '/'));

export function evaluateGate(
  gate: Gate,
  existingDocs: string[],
  validationPass?: boolean,
  completedTasks?: string[]
): { open: boolean; missing: string[] } {
  const existingBasenames = existingDocs.map((doc) => getBasename(doc));
  const missing = gate.requires_docs.filter((reqDoc) => !existingBasenames.includes(reqDoc));

  let open = missing.length === 0;
  if (gate.requires_validation && validationPass !== true) {
    open = false;
    missing.push('validation-pass');
  }

  if (gate.requires_evidence && completedTasks) {
    const missingEvidence = gate.requires_evidence.filter(
      (taskId) => !completedTasks.includes(taskId)
    );
    if (missingEvidence.length > 0) {
      open = false;
      missing.push(...missingEvidence.map((id) => `evidence:${id}`));
    }
  }

  return {
    open,
    missing,
  };
}

export function isBlocked(
  gate: Gate,
  tool: 'Write' | 'Edit' | 'Bash',
  existingDocs: string[],
  validationPass?: boolean,
  completedTasks?: string[]
): boolean {
  const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);
  if (open) {
    return false;
  }
  return gate.blocks.includes(tool);
}

export function passedGates(
  policy: GatePolicy,
  existingDocs: string[],
  validationPass?: boolean,
  completedTasks?: string[]
): string[] {
  const passed: string[] = [];
  for (const gate of policy.gates) {
    const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);
    if (open) {
      passed.push(gate.id);
    }
  }
  return passed;
}

function matchGlob(path: string, glob: string): boolean {
  const normPath = path.replace(/\\/g, '/');
  const normGlob = glob.replace(/\\/g, '/');

  if (normPath === normGlob || normPath.startsWith(normGlob + '/')) {
    return true;
  }

  try {
    let regexStr = normGlob
      .replace(/\*\*\//g, '@@ANY_DIR@@')
      .replace(/\*/g, '@@SINGLE@@');

    regexStr = regexStr.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    regexStr = regexStr
      .replace(/@@ANY_DIR@@/g, '(?:.*/)?')
      .replace(/@@SINGLE@@/g, '[^/]*');

    const regex = new RegExp(`^${regexStr}$`);
    if (regex.test(normPath)) {
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export function checkExecutionGate(
  state: ExecutionState | null,
  policy: GatePolicy | null,
  tool: 'Write' | 'Edit' | 'Bash',
  path?: string,
  allowedPathsFromPlan?: string[]
): { allowed: boolean; reason?: string } {
  if (!state) return { allowed: true };

  // If there is an active task in the executing/repairing phase, check allows_paths
  if (state.active_task && (state.phase === 'executing' || state.phase === 'repairing')) {
    let allowsPaths: string[] = [];
    if (allowedPathsFromPlan && allowedPathsFromPlan.length > 0) {
      allowsPaths = allowedPathsFromPlan;
    } else {
      const taskGate = policy?.gates.find((g) => g.task_id === state.active_task);
      allowsPaths = taskGate?.allows_paths || [];
    }

    if (tool === 'Write' || tool === 'Edit') {
      if (!path) {
        return { allowed: false, reason: 'Không thể ghi/sửa tệp khi không chỉ định đường dẫn.' };
      }
      const isAllowed = allowsPaths.some((p) => matchGlob(path, p));

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Đường dẫn "${path}" không nằm trong danh sách được sửa (allows_paths) của task đang chạy "${state.active_task}".`,
        };
      }
    }
  }

  return { allowed: true };
}

