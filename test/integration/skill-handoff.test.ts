import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { renderNextStep } from '../../src/adapters/shared/renderNextStep.js';
import { ExecutionState, ExecutionPlanV3, ProjectProfile } from '../../src/core/schemas/index.js';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';

describe('B4f — Skill Handoff, Deepen and Message Truth Contract', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-handoff-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should render needs-validation card when plan/state requires validation and NOT claim gate is open for coding', () => {
    const mockProfile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'node-cli',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      evidence: [],
      confirmation: {
        confirmed: true,
        confirmed_by: 'interview',
        confirmed_at: new Date().toISOString(),
      },
    };

    const card = renderNextStep(null, null, mockProfile);

    expect(card.state).toBe('needs-validation');
    expect(card.now).toContain('validate');
    expect(card.nextCommand).toContain('validate');
    expect(card.now).not.toContain('gate đã mở');
    expect(card.now).not.toContain('bắt đầu code');
  });

  it('should hide deepen pending card when state is in a busy execution phase', () => {
    const mockProfile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'node-cli',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      evidence: [],
      confirmation: {
        confirmed: true,
        confirmed_by: 'interview',
        confirmed_at: new Date().toISOString(),
      },
    };

    const mockPlan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [{ id: 'M0-discovery', title: 'Discovery', tasks: ['T0-discovery'] }],
      tasks: {
        'T0-discovery': {
          id: 'T0-discovery',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Test',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: [],
          expected_result: 'Pass',
          evidence_required: [],
          failure_policy: 'abort',
        },
      },
      capabilities_evidence: [],
      discovery_status: 'pass',
    };

    const busyState: ExecutionState = {
      version: '4.0.0',
      phase: 'executing',
      active_task: 'T0-discovery',
      active_milestone: 'M0-discovery',
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: 'digest',
      validated_docs_digest: 'digest',
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };

    // Deepen pending requested
    const card = renderNextStep(mockPlan, busyState, mockProfile, ['glossary']);

    // Should NOT show deepen card because phase is busy ('executing')
    expect(card.state).toBe('executing');
    expect(card.state).not.toBe('deepen');
  });

  it('should show deepen pending card when state is in a non-busy phase and deepen is pending', () => {
    const mockProfile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'node-cli',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      evidence: [],
      confirmation: {
        confirmed: true,
        confirmed_by: 'interview',
        confirmed_at: new Date().toISOString(),
      },
    };

    const mockPlan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [{ id: 'M0-discovery', title: 'Discovery', tasks: ['T0-discovery'] }],
      tasks: {},
      capabilities_evidence: [],
      discovery_status: 'pass',
    };

    const readyState: ExecutionState = {
      version: '4.0.0',
      phase: 'ready-to-execute',
      active_task: null,
      active_milestone: null,
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: 'digest',
      validated_docs_digest: 'digest',
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };

    const card = renderNextStep(mockPlan, readyState, mockProfile, ['glossary']);

    expect(card.state).toBe('deepen');
    expect(card.now).toContain('glossary');
  });

  it('should return error envelope and safe next command when CLI status is called on uninvolved or corrupt project', async () => {
    // Write corrupted progress.json
    writeFileSync(join(tmpDir, 'progress.json'), 'invalid json{', 'utf8');

    const res = await runCliOperation(tmpDir, ['status']);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('CORRUPT_PROGRESS_STATE');
    expect(res.next_command).toBeDefined();
    expect(res.next_command).toContain('repair');
  });
});
