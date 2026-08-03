import { test, expect, describe } from 'vitest';
import {
  initExecutionState,
  transitionToReadyToExecute,
  blockExecution,
  recoverBlockedExecution,
  allowedRemediation,
  renderNextStep,
  createBlockRecord,
  BlockKind,
  BlockRemediation,
  ExecutionState,
  ProjectProfile,
  ExecutionPlanV3,
} from './index.js';
import { TARGET_LOCAL_CLI_COMMAND } from '../version.js';

const CLI = TARGET_LOCAL_CLI_COMMAND;
const validationDigests = {
  plan_digest: 'plan-digest',
  docs_digest: 'docs-digest',
  validation_digest: 'validation-digest',
};

interface ScopedBlockFixture {
  kind: BlockKind;
  taskId: string | null;
  actions: BlockRemediation['actions'];
  paths: string[];
  command: string;
  originPhase?: ExecutionState['phase'];
}

function scopedBlock(state: ExecutionState, fixture: ScopedBlockFixture) {
  return createBlockRecord(state, {
    kind: fixture.kind,
    reason_code: `TEST_${fixture.kind.toUpperCase().replace(/-/g, '_')}`,
    origin_phase: fixture.originPhase ?? state.phase,
    task_id: fixture.taskId,
    recoverable_by: fixture.command,
    detail: `${fixture.kind} needs the recorded remediation.`,
    remediation: {
      actions: fixture.actions,
      paths: fixture.paths,
      command: fixture.command,
    },
  });
}

describe('B1d — Typed blocked reason and transition contract', () => {
  test('blockExecution records a structured BlockRecord bound to its remediation', () => {
    const state = initExecutionState();
    const command = `${CLI} validate`;
    const blockRec = scopedBlock(state, {
      kind: 'validation',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/02-scope.md'],
      command,
    });

    const blocked = blockExecution(state, blockRec);
    expect(blocked.phase).toBe('blocked');
    expect(blocked.block_reason).toEqual(blockRec);
    expect(blocked.block_reason?.remediation).toEqual({
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/02-scope.md'],
      command,
      task_id: null,
      plan_revision: state.plan_revision,
    });
  });

  test('transitionToReadyToExecute clears only a validation-recoverable block', () => {
    const state = initExecutionState();
    const blocked = blockExecution(state, scopedBlock(state, {
      kind: 'validation',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/02-scope.md'],
      command: `${CLI} validate`,
    }));

    const nextState = transitionToReadyToExecute(blocked, true, validationDigests);
    expect(nextState.phase).toBe('ready-to-execute');
    expect(nextState.block_reason).toBeNull();
  });

  test('blockExecution rejects a remediation record bound to a different task or command', () => {
    const state = { ...initExecutionState(), active_task: 'T1-setup' };
    const blockRec = scopedBlock(state, {
      kind: 'verification-failed',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts'],
      command: `${CLI} verify --task T1-setup`,
      originPhase: 'verifying',
    });

    expect(() => blockExecution(state, {
      ...blockRec,
      remediation: { ...blockRec.remediation, task_id: 'T2-other-task' },
    })).toThrow('BLOCK_REMEDIATION_BINDING_INVALID');
    expect(() => blockExecution(state, {
      ...blockRec,
      remediation: { ...blockRec.remediation, command: `${CLI} repair` },
    })).toThrow('BLOCK_REMEDIATION_BINDING_INVALID');
  });

  test('transitionToReadyToExecute preserves an active verification failure', () => {
    const state = { ...initExecutionState(), active_task: 'T1-setup' };
    const blockRec = scopedBlock(state, {
      kind: 'verification-failed',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts', 'test/setup.test.ts'],
      command: `${CLI} verify --task T1-setup`,
      originPhase: 'verifying',
    });
    const blocked = blockExecution(state, blockRec);

    const nextState = transitionToReadyToExecute(blocked, true, validationDigests);
    expect(nextState).toMatchObject({
      phase: 'blocked',
      active_task: 'T1-setup',
      block_reason: blockRec,
    });
  });

  test('illegal transition reports a stable reason code and does not mutate state', () => {
    const state = { ...initExecutionState(), phase: 'executing' as const, active_task: 'T1-setup' };
    expect(() => transitionToReadyToExecute(state, true, validationDigests)).toThrow('TRANSITION_PHASE_NOT_ALLOWED');
    expect(state).toMatchObject({ phase: 'executing', active_task: 'T1-setup', block_reason: null });
  });

  test('recoverBlockedExecution accepts a matching proof only for validation-like blocks', () => {
    const state = initExecutionState();
    const blocked = blockExecution(state, scopedBlock(state, {
      kind: 'snapshot-stale',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/03-plan.md'],
      command: `${CLI} validate`,
    }));

    const recovery = recoverBlockedExecution(blocked, {
      kind: 'snapshot-stale',
      pass: true,
      digests: validationDigests,
    });
    expect(recovery).toMatchObject({ ok: true, reason_code: 'RECOVERED' });
    expect(recovery.state.phase).toBe('ready-to-execute');
    expect(recovery.state.block_reason).toBeNull();
  });

  test('recoverBlockedExecution rejects a boolean-only recovery claim without validation digests', () => {
    const state = initExecutionState();
    const blocked = blockExecution(state, scopedBlock(state, {
      kind: 'artifact-integrity',
      taskId: null,
      actions: ['read', 'run-command'],
      paths: [],
      command: `${CLI} validate`,
    }));

    const recovery = recoverBlockedExecution(blocked, { kind: 'artifact-integrity', pass: true });
    expect(recovery).toMatchObject({
      ok: false,
      reason_code: 'VALIDATION_PROOF_REQUIRED',
      state: { phase: 'blocked' },
    });
  });

  test('recoverBlockedExecution never clears verification failure with generic validation recovery', () => {
    const state = { ...initExecutionState(), active_task: 'T1-setup' };
    const blockRec = scopedBlock(state, {
      kind: 'verification-failed',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts'],
      command: `${CLI} verify --task T1-setup`,
      originPhase: 'verifying',
    });
    const blocked = blockExecution(state, blockRec);

    const recovery = recoverBlockedExecution(blocked, { kind: 'verification-failed', pass: true });
    expect(recovery).toMatchObject({
      ok: false,
      reason_code: 'BLOCK_KIND_REQUIRES_OWN_REMEDIATION',
      state: { phase: 'blocked', active_task: 'T1-setup', block_reason: blockRec },
    });
  });

  const scopedKinds: ScopedBlockFixture[] = [
    {
      kind: 'validation',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/02-scope.md'],
      command: `${CLI} validate`,
    },
    {
      kind: 'artifact-integrity',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/03-plan.md'],
      command: `${CLI} validate`,
    },
    {
      kind: 'snapshot-stale',
      taskId: null,
      actions: ['read', 'write-docs', 'run-command'],
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/04-validation.md'],
      command: `${CLI} validate`,
    },
    {
      kind: 'policy-corrupt',
      taskId: null,
      actions: ['read', 'run-command'],
      paths: [],
      command: `${CLI} repair`,
    },
    {
      kind: 'verification-failed',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts'],
      command: `${CLI} verify --task T1-setup`,
      originPhase: 'verifying',
    },
    {
      kind: 'verification-aborted',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts'],
      command: `${CLI} verify --task T1-setup`,
      originPhase: 'verifying',
    },
    {
      kind: 'review-incomplete',
      taskId: null,
      actions: ['read', 'run-command'],
      paths: [],
      command: `${CLI} review --milestone M4-profile`,
      originPhase: 'reviewing',
    },
  ];

  test.each(scopedKinds)('$kind exposes only its exact persisted remediation scope', (fixture) => {
    const state = { ...initExecutionState(), active_task: fixture.taskId };
    const blocked = blockExecution(state, scopedBlock(state, fixture));

    expect(allowedRemediation(blocked)).toEqual({
      allowed_actions: fixture.actions,
      allowed_paths: fixture.paths,
      next_command: fixture.command,
    });
    expect(allowedRemediation(blocked).allowed_actions).not.toContain('*');
    expect(allowedRemediation(blocked).allowed_paths).not.toContain('*');
  });

  test('allowedRemediation rejects a record whose revision no longer matches state', () => {
    const state = { ...initExecutionState(), active_task: 'T1-setup' };
    const blockRec = scopedBlock(state, {
      kind: 'verification-failed',
      taskId: 'T1-setup',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/setup.ts'],
      command: `${CLI} verify --task T1-setup`,
    });
    const blocked = blockExecution(state, blockRec);
    const staleRevision = { ...blocked, plan_revision: blocked.plan_revision + 1 };

    expect(allowedRemediation(staleRevision)).toEqual({
      allowed_actions: ['read'],
      allowed_paths: [],
      next_command: `${CLI} repair`,
    });
  });

  test('allowedRemediation does not blanket-allow when phase is blocked but block_reason is missing', () => {
    const state = { ...initExecutionState(), phase: 'blocked' as const, block_reason: null };
    expect(allowedRemediation(state)).toEqual({
      allowed_actions: ['read'],
      allowed_paths: [],
      next_command: '/build',
    });
  });

  test('renderNextStep outputs persisted recoverable_by and exact scope from BlockRecord', () => {
    const state = { ...initExecutionState(), active_task: 'T2-build' };
    const blockRec = scopedBlock(state, {
      kind: 'verification-failed',
      taskId: 'T2-build',
      actions: ['read', 'write-task-scope', 'run-command'],
      paths: ['src/build.ts', 'test/build.test.ts'],
      command: `${CLI} verify --task T2-build`,
      originPhase: 'verifying',
    });
    const blocked = blockExecution(state, blockRec);
    const mockProfile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'vite-web',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'vite',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: [],
      confirmation: { confirmed: true, confirmed_at: new Date().toISOString() },
      evidence: [],
    };
    const mockPlan = { discovery_status: 'completed', milestones: [] } as unknown as ExecutionPlanV3;

    const card = renderNextStep(mockPlan, blocked, mockProfile);
    expect(card).toMatchObject({
      state: 'blocked',
      nextCommand: `${CLI} verify --task T2-build`,
      allowedScope: ['src/build.ts', 'test/build.test.ts'],
    });
  });
});
