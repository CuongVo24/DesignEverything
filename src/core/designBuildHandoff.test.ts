import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initExecutionState,
  loadExecutionState,
  completeTier1Emit,
  evaluateBuildReadiness,
  evaluatePreAction,
  renderNextStep,
  ProjectProfile,
} from './index.js';

describe('B1c — Design-to-build handoff state contract', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-b1c-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
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

  test('completeTier1Emit creates execution-state.json at phase plan-validating', () => {
    const state = completeTier1Emit(tempDir);
    expect(state.phase).toBe('plan-validating');

    const loaded = loadExecutionState(join(tempDir, '.design-everything/execution-state.json'));
    expect(loaded.phase).toBe('plan-validating');
    expect(loaded.completed_tasks).toEqual([]);
  });

  test('evaluateBuildReadiness rejects coding before plan validation', () => {
    const progress = { phase: 'ready-for-validation', branch: 'web' };
    const execState = initExecutionState(); // phase: plan-validating

    const readiness = evaluateBuildReadiness(progress, execState);
    expect(readiness.ready).toBe(false);
    expect(readiness.reason_code).toBe('PLAN_VALIDATION_REQUIRED');
    expect(readiness.next_command).toBe('/build');
  });

  test('evaluatePreAction denies code write actions during plan-validating phase', () => {
    const execState = initExecutionState();
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    completeTier1Emit(tempDir);

    const res = evaluatePreAction({
      workspace: tempDir,
      session_id: 'test-session',
      runtime: 'claude',
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['src/index.ts'],
      command_argv: [],
      state: execState,
    });

    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('PLAN_VALIDATION_REQUIRED');
  });

  test('evaluatePreAction allows doc writes during plan-validating phase', () => {
    const execState = initExecutionState();

    const res = evaluatePreAction({
      workspace: tempDir,
      session_id: 'test-session',
      runtime: 'claude',
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['Design/Content/notes.md'],
      command_argv: [],
      state: execState,
    });

    expect(res.decision).toBe('allow');
  });

  test('renderNextStep outputs canonical /build command when in plan-validating phase', () => {
    const execState = initExecutionState(); // phase: plan-validating
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
    const card = renderNextStep(null, execState, mockProfile);

    expect(card.state).toBe('needs-validation');
    expect(card.nextCommand).toContain('validate');
  });
});
