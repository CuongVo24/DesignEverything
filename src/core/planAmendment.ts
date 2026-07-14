import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  ExecutionPlanV3,
  ExecutionState,
  ProjectProfile,
  PlanAmendment,
  AmendmentReason,
} from './schemas/index.js';

export function proposePlanAmendment(options: {
  plan: ExecutionPlanV3;
  state: ExecutionState;
  profile: ProjectProfile;
  reason_code: AmendmentReason;
  proposed_changes: {
    tasks?: Record<string, unknown>;
    risks?: unknown[];
    profile?: unknown;
  };
  requested_by: string;
}): PlanAmendment {
  const { proposed_changes, reason_code, requested_by } = options;

  // 1. Check if empty/no-op
  const hasTasks = proposed_changes.tasks && Object.keys(proposed_changes.tasks).length > 0;
  const hasRisks = proposed_changes.risks && proposed_changes.risks.length > 0;
  const hasProfile = proposed_changes.profile && Object.keys(proposed_changes.profile).length > 0;

  if (!hasTasks && !hasRisks && !hasProfile) {
    throw new Error('Reject empty/no-op change');
  }

  // 2. Compute diff/impact and requires_user_confirmation
  const impactLines: string[] = [];
  let requiresUserConfirmation = false;

  if (hasTasks) {
    for (const [tid, tchange] of Object.entries(proposed_changes.tasks!)) {
      impactLines.push(`Task ${tid} modified.`);
      const tc = tchange as { commands?: unknown; allowed_paths?: unknown };
      if (tc.commands) {
        requiresUserConfirmation = true; // Altering commands require confirmation
      }
      if (tc.allowed_paths) {
        requiresUserConfirmation = true; // Altering paths require confirmation
      }
    }
  }

  if (hasRisks) {
    const risksList = proposed_changes.risks as { id: string }[];
    impactLines.push(`Risks modified: ${risksList.map((r) => r.id).join(', ')}.`);
    requiresUserConfirmation = true;
  }

  if (hasProfile) {
    impactLines.push('Project Profile targets or settings updated.');
    requiresUserConfirmation = true;
  }

  const impact = impactLines.join(' ') || 'General amendment.';
  const id = `amend-${Math.random().toString(36).substr(2, 9)}`;

  const amendment: PlanAmendment = {
    id,
    reason_code,
    requested_by,
    proposed_changes: proposed_changes as unknown as PlanAmendment['proposed_changes'],
    impact,
    requires_user_confirmation: requiresUserConfirmation,
    status: 'proposed',
    created_at: new Date().toISOString(),
  };

  // Mutate/save to state proposed list
  options.state.amendment_history.push(amendment);

  return amendment;
}

export function approvePlanAmendment(options: {
  workspace: string;
  plan: ExecutionPlanV3;
  state: ExecutionState;
  profile: ProjectProfile | null;
  amendmentId: string;
  user_confirmation?: { confirmed_by: string; confirmed_at?: string };
}): { plan: ExecutionPlanV3; state: ExecutionState; profile: ProjectProfile | null } {
  const { workspace, plan, state, profile, amendmentId, user_confirmation } = options;

  // 1. Find amendment
  const amendment = state.amendment_history.find((am) => am.id === amendmentId);
  if (!amendment) {
    throw new Error('Amendment not found');
  }

  if (amendment.status !== 'proposed') {
    throw new Error(`Amendment is already ${amendment.status}`);
  }

  // 1b. A confirmation-required amendment cannot be approved without explicit
  // user confirmation evidence. This prevents an agent from self-legitimizing a
  // scope/stack change.
  if (amendment.requires_user_confirmation && !user_confirmation) {
    throw new Error(
      `Amendment ${amendmentId} requires explicit user confirmation. ` +
        `Provide user_confirmation ({ confirmed_by }) captured from the user before approving.`
    );
  }

  // 2. Snapshot the current plan as an immutable revision BEFORE mutating it,
  // so scope changes are auditable and reversible.
  const revisionDir = join(workspace, '.design-everything/revisions');
  const currentRevision = state.plan_revision || 1;
  const snapshotRel = `.design-everything/revisions/plan-rev-${currentRevision}.json`;
  const snapshotPath = join(revisionDir, `plan-rev-${currentRevision}.json`);
  mkdirSync(revisionDir, { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(plan, null, 2), 'utf8');
  amendment.revision_snapshot = snapshotRel;

  // 3. Set status to approved and record confirmation evidence.
  amendment.status = 'approved';
  if (user_confirmation) {
    amendment.confirmed_by = user_confirmation.confirmed_by;
    amendment.confirmed_at = user_confirmation.confirmed_at || new Date().toISOString();
  }

  // 4. Merge proposed changes to plan and profile
  const changes = amendment.proposed_changes;

  if (changes.tasks) {
    for (const [tid, tchange] of Object.entries(changes.tasks)) {
      if (!plan.tasks[tid]) {
        plan.tasks[tid] = tchange as unknown as typeof plan.tasks[string];
      } else {
        plan.tasks[tid] = { ...plan.tasks[tid], ...tchange } as unknown as typeof plan.tasks[string];
      }
    }
  }

  if (changes.risks) {
    plan.risks = changes.risks;
  }

  if (profile && changes.profile) {
    Object.assign(profile, changes.profile);
    // If target or package manager changed, reset confirmation to force doctor run
    profile.confirmation.confirmed = false;
  }

  // 5. Update state revision and digests. Because the plan changed, all prior
  // evidence and task progress are stale and must be discarded: they were
  // captured against the previous revision and can no longer be trusted.
  state.plan_revision = (state.plan_revision || 1) + 1;
  state.validated_plan_digest = '';
  state.validated_docs_digest = '';
  state.validation_result_digest = '';
  state.evidence = [];
  state.completed_tasks = [];
  state.active_task = null;
  state.active_milestone = null;
  state.block_reason = null;
  state.phase = 'plan-validating';
  state.updated_at = new Date().toISOString();

  // 5. Persist changes to files
  const planPath = join(workspace, '.design-everything/execution-plan.json');
  const statePath = join(workspace, '.design-everything/execution-state.json');
  const profilePath = join(workspace, '.design-everything/project-profile.json');

  writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  if (profile && existsSync(profilePath)) {
    writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  return { plan, state, profile };
}

export function rejectPlanAmendment(
  state: ExecutionState,
  amendmentId: string
): PlanAmendment {
  const amendment = state.amendment_history.find((am) => am.id === amendmentId);
  if (!amendment) {
    throw new Error('Amendment not found');
  }
  if (amendment.status !== 'proposed') {
    throw new Error(`Amendment is already ${amendment.status}`);
  }
  amendment.status = 'rejected';
  return amendment;
}
