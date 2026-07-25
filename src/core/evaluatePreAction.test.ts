import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { evaluatePreAction } from './evaluatePreAction.js';
import { PreActionRequest, AdapterCapability } from './schemas/index.js';
import { initializeInterviewStore, transactInterviewStore } from './interviewStore.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

describe('evaluatePreAction core engine', () => {
  let testWorkspace: string;

  beforeAll(() => {
    testWorkspace = mkdtempSync(join(tmpdir(), 'pre-action-test-'));

    // Seed the canonical interview store in interview phase (P2.2a: no
    // progress.json — evaluatePreAction reads canonical only).
    const base = initializeInterviewStore(testWorkspace).payload.progress;
    transactInterviewStore(testWorkspace, 0, (env) => ({
      ...env,
      payload: {
        ...env.payload,
        progress: { ...base, phase: 'interview', current_step: 'S0' },
      },
    }));
  });

  afterAll(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('should deny path traversal attempts', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'Write',
      action_kind: 'write',
      target_paths: ['../../outside-workspace.ts'],
      command_argv: [],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const decision = evaluatePreAction(request);
    expect(decision.decision).toBe('deny');
    expect(['traversal-attempt', 'PATH_OUTSIDE_WORKSPACE', 'SYMLINK_ESCAPE_DENIED']).toContain(decision.reason_code);
    expect(decision.enforcement).toBe('hard');
  });

  test('should deny shell operators and separators', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'Bash',
      action_kind: 'shell',
      target_paths: [],
      command_argv: ['npm', 'install', '&&', 'node', 'index.js'],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const decision = evaluatePreAction(request);
    expect(decision.decision).toBe('deny');
    expect(decision.reason_code).toBe('shell-operators-blocked');
  });

  test('should deny disallowed Git commands', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'Bash',
      action_kind: 'shell',
      target_paths: [],
      command_argv: ['git', 'checkout', 'main'],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const decision = evaluatePreAction(request);
    expect(decision.decision).toBe('deny');
    expect(decision.reason_code).toBe('git-mutation-blocked');
  });

  test('should allow safe read-only commands in interview phase', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'Bash',
      action_kind: 'shell',
      target_paths: [],
      command_argv: ['ls', '-la'],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const decision = evaluatePreAction(request);
    expect(decision.decision).toBe('allow');
    expect(['read-only-allowed', 'SAFE_EXECUTABLE', 'GIT_READ_ONLY', 'FIND_READ_ONLY']).toContain(decision.reason_code);
  });

  test('should bypass planning docs writes in interview phase', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'Write',
      action_kind: 'write',
      target_paths: ['docs/00-vision.md'],
      command_argv: [],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const decision = evaluatePreAction(request);
    expect(decision.decision).toBe('allow');
    expect(decision.reason_code).toBe('interview-doc-write-allowed');
  });

  test('should return unsupported decision if tool is not in intercepts list', () => {
    const request: PreActionRequest = {
      runtime: 'claude',
      tool_name: 'UnsupportedTool',
      action_kind: 'write',
      target_paths: ['src/index.ts'],
      command_argv: [],
      workspace: testWorkspace,
      session_id: 'test-session',
    };

    const capability: AdapterCapability = {
      runtime: 'claude',
      intercepts: ['Write', 'Edit', 'Bash'],
      enforcement_boundary: 'hook',
      config_surface: 'pre-tool-use',
      known_gaps: [],
    };

    const decision = evaluatePreAction(request, capability);
    expect(decision.decision).toBe('allow');
    expect(decision.reason_code).toBe('unsupported-tool');
    expect(decision.enforcement).toBe('unsupported');
  });
});
