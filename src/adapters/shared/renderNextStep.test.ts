import { expect, test, describe } from 'vitest';
import { renderNextStep, renderNextStepMarkdown, NextStepCard } from './renderNextStep.js';
import { CLI_COMMAND_SURFACE, CLI_GLOBAL_FLAGS } from './cliOperations.js';
import { ExecutionPlanV3, ExecutionState, ProjectProfile } from '../../core/schemas/index.js';
import { TARGET_LOCAL_CLI_COMMAND } from '../../version.js';

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

  const amendmentPendingState: ExecutionState = {
    ...mockState,
    amendment_history: [
      {
        id: 'amend-deadpath',
        reason_code: 'scope-change',
        requested_by: 'agent',
        proposed_changes: { tasks: { 'T0-discovery': { intent: 'Verify a different toolchain.' } } },
        impact: 'Task T0-discovery modified.',
        requires_user_confirmation: true,
        status: 'proposed',
        created_at: new Date().toISOString(),
      },
    ],
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
    expect(card1.nextCommand).toBe(`${TARGET_LOCAL_CLI_COMMAND} validate`);

    const card2 = renderNextStep(mockPlan, validatingState, mockProfile);
    expect(card2.state).toBe('needs-validation');
  });

  test('should return ready state when phase is ready-to-execute', () => {
    const card = renderNextStep(mockPlan, mockState, mockProfile);
    expect(card.state).toBe('ready');
    expect(card.nextCommand).toBe(`${TARGET_LOCAL_CLI_COMMAND} start --task T0-discovery`);
  });

  test('ready-to-execute after promotion points at the first incomplete feature task', () => {
    const promotedPlan: ExecutionPlanV3 = {
      ...mockPlan,
      milestones: [
        { id: 'M0', title: 'Discovery', tasks: ['T0-discovery'] },
        { id: 'M4-search-recipe', title: 'Feature: search recipe', tasks: ['T4-search-recipe'] },
      ],
    };
    const promotedState: ExecutionState = {
      ...mockState,
      completed_tasks: ['T0-discovery'],
    };
    const card = renderNextStep(promotedPlan, promotedState, mockProfile);
    expect(card.state).toBe('ready');
    expect(card.nextCommand).toBe(`${TARGET_LOCAL_CLI_COMMAND} start --task T4-search-recipe`);
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
    expect(card.nextCommand).toBe(`${TARGET_LOCAL_CLI_COMMAND} verify --task T0-discovery --command node-version`);
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
    expect(card.nextCommand).toContain('start --task C-search-recipe-fix-failing-tests');
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
    expect(card.nextCommand).toContain('review --milestone M4-search-recipe');
  });

  test('confirmed greenfield profile proceeds beyond needs-profile', () => {
    const greenfield: ProjectProfile = {
      ...mockProfile,
      workspace_kind: 'empty',
      target: 'node-cli',
    };
    expect(renderNextStep(mockPlan, mockState, greenfield).state).not.toBe('needs-profile');
  });

  // A next-step card is an instruction the user (or a weak executor) is meant to
  // run verbatim. A card that names a subcommand the dispatcher does not have
  // answers UNKNOWN_SUBCOMMAND — the exact failure the dead `amend approve <id>`
  // string produced. CLI_COMMAND_SURFACE is the dispatcher's own machine-checked
  // inventory, so checking every emitted command against it turns "the card must
  // not claim a non-executable command" (see the `doctor` case above) from a
  // per-test comment into an invariant over all branches at once.
  describe('AMD-01 — every emitted nextCommand is executable by the real dispatcher', () => {
    function assertExecutable(card: NextStepCard, label: string) {
      if (!card.nextCommand) return;
      // Cards may append parenthesised prose after the command (e.g. the verify
      // card's "(cần người dùng đồng ý → thêm --confirm)" hint); the command
      // itself is everything before it.
      const commandText = card.nextCommand.split(' (')[0];
      const tokens = commandText.trim().split(/\s+/);
      const entryIdx = tokens.findIndex((t) => t.replace(/^["']|["']$/g, '').endsWith('cli.mjs'));
      expect(entryIdx, `${label}: nextCommand must invoke the real CLI entrypoint`).toBeGreaterThan(-1);

      const subcommand = tokens[entryIdx + 1];
      expect(
        Object.keys(CLI_COMMAND_SURFACE),
        `${label}: subcommand "${subcommand}" has no case in cliOperations.ts's dispatcher`
      ).toContain(subcommand);

      for (const flag of tokens.slice(entryIdx + 2).filter((t) => t.startsWith('--'))) {
        expect(
          [...CLI_COMMAND_SURFACE[subcommand], ...CLI_GLOBAL_FLAGS],
          `${label}: flag "${flag}" is not parsed by "${subcommand}"`
        ).toContain(flag);
      }
    }

    const cases: [string, () => NextStepCard][] = [
      ['needs-profile', () => renderNextStep(null, null, { ...mockProfile, confirmation: { confirmed: false } })],
      ['unsupported', () => renderNextStep(null, null, { ...mockProfile, workspace_kind: 'existing-unsupported', target: 'unsupported' })],
      ['needs-validation', () => renderNextStep(null, { ...mockState, phase: 'plan-validating' }, mockProfile)],
      ['ready', () => renderNextStep(mockPlan, mockState, mockProfile)],
      ['executing', () => renderNextStep(mockPlan, { ...mockState, phase: 'executing', active_task: 'T0-discovery' }, mockProfile)],
      ['verifying', () => renderNextStep(mockPlan, { ...mockState, phase: 'verifying', active_task: 'T0-discovery' }, mockProfile)],
      ['repairing', () => renderNextStep(mockPlan, { ...mockState, phase: 'repairing', active_task: 'T0-discovery' }, mockProfile)],
      ['reviewing (open break-tasks)', () => renderNextStep(mockPlan, { ...mockState, phase: 'reviewing', active_milestone: 'M4-x', open_break_tasks: ['C-x-fix'] }, mockProfile)],
      ['reviewing (clean)', () => renderNextStep(mockPlan, { ...mockState, phase: 'reviewing', active_milestone: 'M4-x', open_break_tasks: [] }, mockProfile)],
      ['complete', () => renderNextStep(mockPlan, { ...mockState, phase: 'ready-to-ship' }, mockProfile)],
      ['deepen pending', () => renderNextStep(mockPlan, mockState, mockProfile, ['data-model'])],
      ['blocked', () => renderNextStep(mockPlan, {
        ...mockState,
        phase: 'blocked',
        block_reason: {
          kind: 'verification-failed',
          reason_code: 'VERIFICATION_FAILED',
          origin_phase: 'verifying',
          task_id: 'T0-discovery',
          recoverable_by: 'node adapter/claude-code/cli.mjs verify --task T0-discovery --command node-version',
          detail: 'command failed',
          created_at: new Date().toISOString(),
          remediation: {
            actions: ['read', 'write-task-scope', 'run-command'],
            paths: ['src/discovery.ts'],
            command: 'node adapter/claude-code/cli.mjs verify --task T0-discovery --command node-version',
            task_id: 'T0-discovery',
            plan_revision: 1,
          },
        },
      }, mockProfile)],
      ['amendment proposed', () => renderNextStep(mockPlan, amendmentPendingState, mockProfile)],
    ];

    test.each(cases)('%s', (label, build) => {
      assertExecutable(build(), label);
    });
  });

  // Regression for the dead `amend` path: planAmendment.ts implements
  // propose/approve and classifyCliSubcommand once allowed `amend`, but B14b is
  // WAITING_FOR_APPROVAL and cliOperations.ts has no `amend` case. The card must
  // surface the pending proposal without inventing a command to resolve it.
  test('AMD-02 — a pending amendment surfaces as a hard block with no CLI command to run', () => {
    const card = renderNextStep(mockPlan, amendmentPendingState, mockProfile);
    expect(card.state).toBe('needs-validation');
    expect(card.enforcement).toBe('hard');
    expect(card.now).toContain('amend-deadpath');
    // The whole point: no `amend approve <id>` (or any other) command is claimed.
    expect(card.nextCommand).toBeUndefined();
    expect(renderNextStepMarkdown(card)).not.toContain('💻 Command:');
    expect(renderNextStepMarkdown(card)).not.toContain('amend approve');
    // The user must still be told the proposal exists and why it is stuck.
    expect(card.whyNow).toContain('scope-change');
    expect(card.ifItFails).toContain('amend');
    expect(card.warning).toContain('WARNING');
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
