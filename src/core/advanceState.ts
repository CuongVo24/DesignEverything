import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Progress, Script } from './schemas/index.js';
import { loadShapes } from './loadShapes.js';

function getRegistryBranchIds(): string[] {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let shapesPath = join(process.cwd(), 'Design/Content/interview-script/shapes.yaml');
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
  }
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../../Design/Content/interview-script/shapes.yaml');
  }
  if (existsSync(shapesPath)) {
    const registry = loadShapes(shapesPath);
    return registry.shapes.map(s => s.id);
  }
  return ['web', 'mobile', 'hybrid', 'cli'];
}

function isQuestionCompatible(qBranch: string, progressBranch: string | null): boolean {
  if (qBranch === 'core') return true;
  if (progressBranch === 'hybrid') return qBranch === 'web' || qBranch === 'mobile';
  return qBranch === progressBranch;
}

export function commitStep(
  progress: Progress,
  script: Script,
  args: { userTurnId: string; branchChoice?: string }
): Progress {
  const currentStepId = progress.current_step;
  if (currentStepId === null) {
    throw new Error('Interview is already completed; no active step to commit');
  }

  // 1. Check duplicate commit
  if (progress.last_user_turn_id !== null && args.userTurnId === progress.last_user_turn_id) {
    throw new Error('Duplicate commit: this turn ID has already been committed');
  }

  const nextProgress: Progress = {
    ...progress,
    answered: [...progress.answered],
    emitted_docs: [...progress.emitted_docs],
    gates_passed: [...progress.gates_passed],
  };

  // 2. Set last_user_turn_id
  nextProgress.last_user_turn_id = args.userTurnId;

  // 3. Append current_step to answered
  nextProgress.answered.push(currentStepId);

  // 4. Branch logic at S7
  if (currentStepId === 'S7') {
    if (!args.branchChoice) {
      throw new Error('branchChoice must be provided when committing step S7');
    }
    const validBranches = getRegistryBranchIds();
    if (!validBranches.includes(args.branchChoice)) {
      throw new Error(`Invalid branch choice: ${args.branchChoice}. Must be one of: ${validBranches.join(', ')}`);
    }
    if (progress.branch !== null && progress.branch !== args.branchChoice) {
      throw new Error(`Cannot change branch once set. Current: ${progress.branch}, New: ${args.branchChoice}`);
    }
    nextProgress.branch = args.branchChoice;
  } else {
    // If not S7, but branch is already set, ensure branchChoice doesn't try to change it
    if (progress.branch !== null && args.branchChoice && progress.branch !== args.branchChoice) {
      throw new Error(`Cannot change branch once set. Current: ${progress.branch}, New: ${args.branchChoice}`);
    }
  }

  // 5. Calculate next current_step
  let nextStepId: string | null = null;
  for (const q of script.questions) {
    // Check if already answered
    if (nextProgress.answered.includes(q.id)) {
      continue;
    }
    // Check branch compatibility
    if (!isQuestionCompatible(q.branch, nextProgress.branch)) {
      continue;
    }
    // Check depends_on
    const depsSatisfied = q.depends_on.every((dep) => nextProgress.answered.includes(dep));
    if (!depsSatisfied) {
      continue;
    }
    // Eligible!
    nextStepId = q.id;
    break;
  }

  nextProgress.current_step = nextStepId;

  // 6. Update phase and updated_at
  if (nextStepId === null) {
    // Interview complete, determine phase based on emitted docs and gates passed
    const requiredDocs = new Set(
      script.questions
        .filter((q) => isQuestionCompatible(q.branch, nextProgress.branch) && q.target_doc !== null)
        .map((q) => q.target_doc as string)
    );
    const requiredGates = new Set(
      script.questions
        .filter(
          (q) => isQuestionCompatible(q.branch, nextProgress.branch) && q.gate !== null
        )
        .map((q) => q.gate as string)
    );

    const hasAllDocs = Array.from(requiredDocs).every((doc) =>
      nextProgress.emitted_docs.includes(doc)
    );
    const hasAllGates = Array.from(requiredGates).every((gate) =>
      nextProgress.gates_passed.includes(gate)
    );

    if (hasAllDocs && hasAllGates) {
      nextProgress.phase = 'ready-to-build';
    } else {
      nextProgress.phase = 'docs-emitted';
    }
  } else {
    nextProgress.phase = 'interview';
  }

  nextProgress.updated_at = new Date().toISOString();

  return nextProgress;
}

export function checkRate(
  progress: Progress,
  incomingAnsweredLen: number
): { ok: boolean; reason?: string } {
  const allowed = incomingAnsweredLen - progress.answered_len_at_last_turn <= 1;
  if (!allowed) {
    return {
      ok: false,
      reason: `Answered length increased by too much. Incoming length: ${incomingAnsweredLen}, length at last turn: ${progress.answered_len_at_last_turn}`,
    };
  }
  return { ok: true };
}

export function stampTurn(progress: Progress, answeredLen: number): Progress {
  return {
    ...progress,
    answered: [...progress.answered],
    emitted_docs: [...progress.emitted_docs],
    gates_passed: [...progress.gates_passed],
    answered_len_at_last_turn: answeredLen,
    updated_at: new Date().toISOString(),
  };
}
