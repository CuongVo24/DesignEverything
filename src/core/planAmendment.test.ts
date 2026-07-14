import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { proposePlanAmendment, approvePlanAmendment, rejectPlanAmendment } from './planAmendment.js';
import { ExecutionPlanV3, ExecutionState, ProjectProfile } from './schemas/index.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';

describe('PlanAmendment Engine', () => {
  let testWorkspace: string;

  beforeAll(() => {
    testWorkspace = mkdtempSync(join(tmpdir(), 'plan-amendment-test-'));
    mkdirSync(join(testWorkspace, '.design-everything'), { recursive: true });
  });

  afterAll(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

  const getFixtures = () => {
    const profile: ProjectProfile = {
      workspace_kind: 'existing-supported',
      target: 'node-cli',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [],
    };

    const plan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [
        { id: 'M0-discovery', title: 'Discovery', tasks: ['T0-discovery'] },
      ],
      tasks: {
        'T0-discovery': {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Verify node environment.',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [],
          expected_result: 'Verified.',
          evidence_required: [],
          failure_policy: 'abort',
        },
      },
      capabilities_evidence: [],
      discovery_status: 'pass',
    };

    const state: ExecutionState = {
      version: '4.0.0',
      phase: 'ready-to-execute',
      active_task: null,
      active_milestone: null,
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: 'old-plan-digest',
      validated_docs_digest: 'old-docs-digest',
      validation_result_digest: 'old-val-digest',
      plan_revision: 1,
      amendment_history: [],
      updated_at: new Date().toISOString(),
    };

    return { profile, plan, state };
  };

  test('should propose amendment and auto-compute impact and confirmation requirement', () => {
    const { plan, state, profile } = getFixtures();

    const changes = {
      tasks: {
        'T0-discovery': {
          commands: [
            { id: 'node-version', argv: ['node', '--version'], expected: { kind: 'exit-code-zero' } },
          ],
        },
      },
    };

    const amendment = proposePlanAmendment({
      plan,
      state,
      profile,
      reason_code: 'verification-failure',
      proposed_changes: changes,
      requested_by: 'newbie-agent',
    });

    expect(amendment.status).toBe('proposed');
    expect(amendment.reason_code).toBe('verification-failure');
    expect(amendment.requires_user_confirmation).toBe(true);
    expect(amendment.impact).toContain('Task T0-discovery modified');
    expect(state.amendment_history).toContain(amendment);
  });

  test('should reject empty or no-op amendment proposed changes', () => {
    const { plan, state, profile } = getFixtures();

    expect(() => {
      proposePlanAmendment({
        plan,
        state,
        profile,
        reason_code: 'verification-failure',
        proposed_changes: {},
        requested_by: 'agent',
      });
    }).toThrow('Reject empty/no-op change');
  });

  test('should approve amendment, merge changes, increment revision and reset validation', () => {
    const { plan, state, profile } = getFixtures();

    const changes = {
      tasks: {
        'T0-discovery': {
          intent: 'New intent description',
        },
      },
    };

    const amendment = proposePlanAmendment({
      plan,
      state,
      profile,
      reason_code: 'verification-failure',
      proposed_changes: changes,
      requested_by: 'agent',
    });

    // Write base plan and state to test workspace files
    writeFileSync(join(testWorkspace, '.design-everything/execution-plan.json'), JSON.stringify(plan), 'utf8');
    writeFileSync(join(testWorkspace, '.design-everything/execution-state.json'), JSON.stringify(state), 'utf8');
    writeFileSync(join(testWorkspace, '.design-everything/project-profile.json'), JSON.stringify(profile), 'utf8');

    const result = approvePlanAmendment({
      workspace: testWorkspace,
      plan,
      state,
      profile,
      amendmentId: amendment.id,
    });

    expect(result.plan.tasks['T0-discovery'].intent).toBe('New intent description');
    expect(result.state.plan_revision).toBe(2);
    expect(result.state.phase).toBe('plan-validating');
    expect(result.state.validated_plan_digest).toBe('');
    expect(amendment.status).toBe('approved');
  });

  test('should reject amendment and set status to rejected without changing plan', () => {
    const { plan, state, profile } = getFixtures();

    const amendment = proposePlanAmendment({
      plan,
      state,
      profile,
      reason_code: 'verification-failure',
      proposed_changes: {
        tasks: { 'T0-discovery': { intent: 'Unapproved change' } },
      },
      requested_by: 'agent',
    });

    const rejected = rejectPlanAmendment(state, amendment.id);
    expect(rejected.status).toBe('rejected');
    expect(plan.tasks['T0-discovery'].intent).not.toBe('Unapproved change');
  });
});
