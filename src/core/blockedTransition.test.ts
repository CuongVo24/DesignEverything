import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initExecutionState,
  transitionToReadyToExecute,
  blockExecution,
  recoverBlockedExecution,
  allowedRemediation,
  renderNextStep,
  BlockRecord,
  ProjectProfile,
  ExecutionPlanV3,
} from './index.js';

describe('B1d — Typed blocked reason and transition contract', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-b1d-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    mkdirSync(tempDir, { recursive: true });
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  test('blockExecution records a structured BlockRecord', () => {
    let state = initExecutionState();
    const blockRec: BlockRecord = {
      kind: 'validation',
      reason_code: 'MISSING_MUST_SCOPE',
      origin_phase: 'plan-validating',
      task_id: null,
      recoverable_by: '/build',
      detail: '02-scope.md is missing Must items.',
      created_at: new Date().toISOString(),
    };

    state = blockExecution(state, blockRec);
    expect(state.phase).toBe('blocked');
    expect(state.block_reason).toEqual(blockRec);
  });

  test('transitionToReadyToExecute clears validation block on pass', () => {
    let state = initExecutionState();
    state = blockExecution(state, {
      kind: 'validation',
      reason_code: 'MISSING_MUST_SCOPE',
      origin_phase: 'plan-validating',
      task_id: null,
      recoverable_by: '/build',
      detail: 'Validation error',
      created_at: new Date().toISOString(),
    });

    const nextState = transitionToReadyToExecute(state, true);
    expect(nextState.phase).toBe('ready-to-execute');
    expect(nextState.block_reason).toBeNull();
  });

  test('transitionToReadyToExecute does NOT clear verification-failed block', () => {
    let state = initExecutionState();
    state.active_task = 'T1-setup';
    state = blockExecution(state, {
      kind: 'verification-failed',
      reason_code: 'TASK_COMMAND_FAILED',
      origin_phase: 'verifying',
      task_id: 'T1-setup',
      recoverable_by: 'node adapter/claude-code/cli.mjs verify --task T1-setup',
      detail: 'Exit code 1 on npm test',
      created_at: new Date().toISOString(),
    });

    const nextState = transitionToReadyToExecute(state, true);
    expect(nextState.phase).toBe('blocked');
    expect(nextState.active_task).toBe('T1-setup');
    expect(nextState.block_reason).toBeDefined();
  });

  test('recoverBlockedExecution unblocks state when proof matches kind', () => {
    let state = initExecutionState();
    state.active_task = 'T1-setup';
    state = blockExecution(state, {
      kind: 'verification-failed',
      reason_code: 'TASK_COMMAND_FAILED',
      origin_phase: 'verifying',
      task_id: 'T1-setup',
      recoverable_by: 'node adapter/claude-code/cli.mjs verify --task T1-setup',
      detail: 'Exit code 1 on npm test',
      created_at: new Date().toISOString(),
    });

    const recRes = recoverBlockedExecution(state, { kind: 'verification-failed', pass: true });
    expect(recRes.ok).toBe(true);
    expect(recRes.state.phase).toBe('repairing');
    expect(recRes.state.block_reason).toBeNull();
  });

  test('allowedRemediation scopes paths and actions based on BlockRecord kind', () => {
    let state = initExecutionState();
    state = blockExecution(state, {
      kind: 'validation',
      reason_code: 'SEMANTIC_ERROR',
      origin_phase: 'plan-validating',
      task_id: null,
      recoverable_by: '/build',
      detail: 'Doc error',
      created_at: new Date().toISOString(),
    });

    const rem = allowedRemediation(state);
    expect(rem.allowed_paths).toContain('Design/**');
    expect(rem.next_command).toBe('/build');
  });

  test('renderNextStep outputs recoverable_by from BlockRecord', () => {
    let state = initExecutionState();
    state = blockExecution(state, {
      kind: 'verification-failed',
      reason_code: 'VERIFY_FAILED',
      origin_phase: 'verifying',
      task_id: 'T2-build',
      recoverable_by: 'node adapter/claude-code/cli.mjs verify --task T2-build',
      detail: 'Tests failed',
      created_at: new Date().toISOString(),
    });

    const mockProfile: ProjectProfile = {
      version: '6.0.0',
      workspace_kind: 'newbie-greenfield',
      target: 'web-react-vite',
      confirmation: { confirmed: true, confirmed_at: new Date().toISOString() },
    };

    const mockPlan = {
      discovery_status: 'completed',
      milestones: [],
    } as unknown as ExecutionPlanV3;

    const card = renderNextStep(mockPlan, state, mockProfile);
    expect(card.state).toBe('blocked');
    expect(card.nextCommand).toContain('T2-build');
  });
});
