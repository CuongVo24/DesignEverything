import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ExecutionPlanV3, ExecutionState, ProjectProfile } from './schemas/index.js';
import { loadProjectProfile } from './projectProfileState.js';
import { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';

export function promoteExecutionPlan(input: {
  workspace: string;
  answers: Record<string, string>;
  currentPlan: ExecutionPlanV3;
  state: ExecutionState;
}): ExecutionPlanV3 {
  if (!input.state.completed_tasks.includes('T3-verify')) {
    throw new Error('Cannot promote execution plan before T3-verify passes.');
  }
  if (input.currentPlan.milestones.some((milestone) => milestone.id.startsWith('M4-'))) {
    return input.currentPlan;
  }

  const profile = loadProjectProfile(input.workspace);
  if (!profile) throw new Error('Cannot promote execution plan: missing confirmed project profile.');

  const docsDir = join(input.workspace, 'docs');
  const docs = existsSync(docsDir)
    ? readdirSync(docsDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({ file, content: readFileSync(join(docsDir, file), 'utf8') }))
    : [];
  const synthesis = synthesizeExecutionPlan({
    answers: input.answers,
    profile: profile as ProjectProfile,
    docs,
    workspaceDir: input.workspace,
    executionState: input.state,
  });
  if (synthesis.blocked) throw new Error(`Cannot promote execution plan: ${synthesis.message ?? 'synthesis blocked'}.`);

  const featureMilestones = synthesis.plan.milestones.filter((milestone) => milestone.id.startsWith('M4-'));
  if (featureMilestones.length === 0) {
    throw new Error('Cannot promote execution plan: synthesis produced zero feature contracts.');
  }

  const promoted: ExecutionPlanV3 = structuredClone(input.currentPlan);
  for (const milestone of featureMilestones) {
    promoted.milestones.push(milestone);
    for (const taskId of milestone.tasks) promoted.tasks[taskId] = synthesis.plan.tasks[taskId];
  }
  promoted.metadata.updated_at = new Date().toISOString();
  return promoted;
}
