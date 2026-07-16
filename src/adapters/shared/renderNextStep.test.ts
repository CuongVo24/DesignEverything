import { expect, test, describe } from 'vitest';
import { renderNextStep, renderNextStepMarkdown } from './renderNextStep.js';
import { ExecutionPlanV3, ExecutionState, ProjectProfile } from '../../core/schemas/index.js';

describe('renderNextStep Adapter Renderer', () => {
  const mockProfile: ProjectProfile = {
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

  const mockPlan: ExecutionPlanV3 = {
    metadata: {
      version: '3.0.0',
      updated_at: new Date().toISOString(),
    },
    trace_links: [],
    risks: [],
    milestones: [],
    tasks: {
      'T0-discovery': {
        id: 'T0-discovery',
        type: 'spike',
        milestone: 'M0',
        intent: 'Verify environmental tools.',
        depends_on: [],
        allowed_paths: [],
        preconditions: [],
        commands: [
          { id: 'node-version', argv: ['node', '--version'], expected: { kind: 'exit-code-zero' } },
        ],
        expected_result: 'Verified.',
        evidence_required: [],
        failure_policy: 'abort',
      },
    },
    capabilities_evidence: [],
    discovery_status: 'pass',
  };

  const mockState: ExecutionState = {
    version: '3.0.0',
    phase: 'ready-to-execute',
    active_task: null,
    active_milestone: null,
    completed_tasks: [],
    evidence: [],
    block_reason: null,
    validated_plan_digest: 'some-digest',
    validated_docs_digest: 'some-digest',
    validation_result_digest: 'some-digest',
    plan_revision: 1,
    amendment_history: [],
    open_break_tasks: [],
    reviewed_milestones: [],
    updated_at: new Date().toISOString(),
  };

  test('should return needs-profile state when profile is not confirmed', () => {
    const unconfirmedProfile = {
      ...mockProfile,
      confirmation: { confirmed: false },
    };

    const card = renderNextStep(null, null, unconfirmedProfile);
    expect(card.state).toBe('needs-profile');
    // No standalone `doctor` CLI command exists yet, so the card must not claim a
    // non-executable command.
    expect(card.nextCommand).toBeUndefined();
  });

  test('should return unsupported state when target is unsupported', () => {
    const unsupportedProfile: ProjectProfile = {
      workspace_kind: 'existing-unsupported',
      target: 'unsupported',
      runtime: null,
      package_manager: null,
      framework: null,
      language: null,
      source_root: null,
      manifest_paths: [],
      capabilities: [],
      confirmation: { confirmed: false },
      evidence: [],
    };

    const card = renderNextStep(null, null, unsupportedProfile);
    expect(card.state).toBe('unsupported');
    expect(card.warning).toContain('WARNING');
  });

  test('should return needs-validation state when plan is missing or in plan-validating phase', () => {
    const validatingState = {
      ...mockState,
      phase: 'plan-validating' as const,
    };

    const card1 = renderNextStep(null, validatingState, mockProfile);
    expect(card1.state).toBe('needs-validation');
    expect(card1.nextCommand).toBe('node adapter/claude-code/cli.mjs validate');

    const card2 = renderNextStep(mockPlan, validatingState, mockProfile);
    expect(card2.state).toBe('needs-validation');
  });

  test('should return ready state when phase is ready-to-execute', () => {
    const card = renderNextStep(mockPlan, mockState, mockProfile);
    expect(card.state).toBe('ready');
    expect(card.nextCommand).toBe('node adapter/claude-code/cli.mjs start T0-discovery');
  });

  test('should return executing state and details when phase is executing', () => {
    const executingState: ExecutionState = {
      ...mockState,
      phase: 'executing',
      active_task: 'T0-discovery',
    };

    const card = renderNextStep(mockPlan, executingState, mockProfile);
    expect(card.state).toBe('executing');
    expect(card.allowedScope).toEqual([]);
    expect(card.proof).toContain('node --version');
    expect(card.enforcement).toBe('soft');
  });

  test('should return verifying state when phase is verifying', () => {
    const verifyingState: ExecutionState = {
      ...mockState,
      phase: 'verifying',
      active_task: 'T0-discovery',
    };

    const card = renderNextStep(mockPlan, verifyingState, mockProfile);
    expect(card.state).toBe('verifying');
    expect(card.nextCommand).toBe('node adapter/claude-code/cli.mjs verify T0-discovery');
    expect(card.enforcement).toBe('hard');
  });

  test('should return repairing state when phase is repairing', () => {
    const repairingState: ExecutionState = {
      ...mockState,
      phase: 'repairing',
      active_task: 'T0-discovery',
    };

    const card = renderNextStep(mockPlan, repairingState, mockProfile);
    expect(card.state).toBe('repairing');
    expect(card.enforcement).toBe('hard');
  });

  test('should return complete state when phase is ready-to-ship', () => {
    const completeState: ExecutionState = {
      ...mockState,
      phase: 'ready-to-ship',
    };

    const card = renderNextStep(mockPlan, completeState, mockProfile);
    expect(card.state).toBe('complete');
    expect(card.enforcement).toBe('soft');
  });

  test('reviewing phase: open break-tasks surface as hard-gated scope (B17b)', () => {
    const reviewingState: ExecutionState = {
      ...mockState,
      phase: 'reviewing',
      active_milestone: 'M4-search-recipe',
      open_break_tasks: ['C-search-recipe-fix-failing-tests'],
    };
    const card = renderNextStep(mockPlan, reviewingState, mockProfile);
    expect(card.state).toBe('reviewing');
    expect(card.enforcement).toBe('hard');
    expect(card.allowedScope).toContain('C-search-recipe-fix-failing-tests');
    expect(card.nextCommand).toContain('start C-search-recipe-fix-failing-tests');
  });

  test('reviewing phase: no break-tasks prompts manager-check to close review', () => {
    const reviewingState: ExecutionState = {
      ...mockState,
      phase: 'reviewing',
      active_milestone: 'M4-search-recipe',
      open_break_tasks: [],
    };
    const card = renderNextStep(mockPlan, reviewingState, mockProfile);
    expect(card.state).toBe('reviewing');
    expect(card.nextCommand).toContain('review M4-search-recipe');
  });

  test('should render markdown next-step card in deep and fast modes', () => {
    const card = renderNextStep(mockPlan, mockState, mockProfile);
    const fastMarkdown = renderNextStepMarkdown(card, 'fast');
    expect(fastMarkdown).toContain('👉 NEXT STEP: Khởi chạy task kiểm thử môi trường T0-discovery.');
    expect(fastMarkdown).toContain('🤔 Why now: Kế hoạch đã hợp lệ');

    const deepMarkdown = renderNextStepMarkdown(card, 'deep');
    expect(deepMarkdown).toContain('🤔 Why now (Chi tiết): Kế hoạch đã hợp lệ');
    expect(deepMarkdown).toContain('❌ If it fails (Remediation):');
  });
});
