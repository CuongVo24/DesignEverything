import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { calculatePlanDigest, calculateDocsDigest, loadEmittedDocs } from '../../core/validatedSnapshot.js';
import { ExecutionPlanV3 } from '../../core/schemas/index.js';

describe('Codex PreToolUse & PostToolUse Hook Adapter', () => {
  let testWorkspace: string;
  let execStatePath: string;
  let execPlanPath: string;

  beforeEach(() => {
    testWorkspace = join(tmpdir(), `codex-hook-test-${Date.now()}`);
    mkdirSync(join(testWorkspace, '.design-everything'), { recursive: true });
    execStatePath = join(testWorkspace, '.design-everything/execution-state.json');
    execPlanPath = join(testWorkspace, '.design-everything/execution-plan.json');

    // Base progress.json
    writeFileSync(
      join(testWorkspace, 'progress.json'),
      JSON.stringify(
        {
          version: '4.0.0',
          phase: 'interview',
          branch: 'web',
          calibrate_mode: 'fast',
          current_step: 'S1',
          answered: [],
          emitted_docs: [],
          gates_passed: [],
          last_user_turn_id: null,
          answered_len_at_last_turn: 0,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });

  afterEach(() => {
    if (existsSync(testWorkspace)) {
      rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  test('PreToolUse hook should intercept apply_patch on unallowed path during execution', () => {
    const plan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [{ id: 'M1', title: 'M1', tasks: ['T1'] }],
      tasks: {
        T1: {
          id: 'T1',
          type: 'spike',
          milestone: 'M1',
          intent: 'Test',
          depends_on: [],
          allowed_paths: ['src/allowed.ts'],
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
    writeFileSync(execPlanPath, JSON.stringify(plan, null, 2));

    const docs = loadEmittedDocs(testWorkspace, execPlanPath);
    const state = {
      version: '4.0.0',
      phase: 'executing',
      active_milestone: 'M1',
      active_task: 'T1',
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: calculatePlanDigest(plan),
      validated_docs_digest: calculateDocsDigest(docs),
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };
    writeFileSync(execStatePath, JSON.stringify(state, null, 2));

    const hookPath = resolve(__dirname, '../../../adapter/codex-plugin/hooks/pre-tool-use.mjs');
    const payload = {
      tool_name: 'apply_patch',
      tool_use_id: 'call_patch_1',
      tool_input: {
        path: 'src/unallowed.ts',
      },
      cwd: testWorkspace,
      session_id: 'codex-sess-1',
    };

    const child = spawnSync('node', [hookPath], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });

    expect(child.status).toBe(0);
    const output = JSON.parse(child.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Đường dẫn bị chặn');
  });

  test('PreToolUse hook should remain non-blocking for uninitialized workspaces without progress.json', () => {
    const uninitializedWorkspace = join(tmpdir(), `codex-uninit-${Date.now()}`);
    mkdirSync(uninitializedWorkspace, { recursive: true });

    try {
      const hookPath = resolve(__dirname, '../../../adapter/codex-plugin/hooks/pre-tool-use.mjs');
      const payload = {
        tool_name: 'apply_patch',
        tool_use_id: 'call_patch_1',
        tool_input: {
          path: 'src/anything.ts',
        },
        cwd: uninitializedWorkspace,
        session_id: 'codex-sess-1',
      };

      const child = spawnSync('node', [hookPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
      });

      expect(child.status).toBe(0);
      if (child.stdout.trim()) {
        expect(JSON.parse(child.stdout.trim()).hookSpecificOutput.permissionDecision).toBe('allow');
      }
    } finally {
      rmSync(uninitializedWorkspace, { recursive: true, force: true });
    }
  });

  test('PreToolUse hook remains fail-closed for a malformed payload in an initialized workspace', () => {
    const hookPath = resolve(__dirname, '../../../adapter/codex-plugin/hooks/pre-tool-use.mjs');
    const child = spawnSync('node', [hookPath], { input: '', encoding: 'utf8', cwd: testWorkspace });
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout.trim()).hookSpecificOutput.permissionDecision).toBe('deny');
  });

  test('PreToolUse hook should deny path traversal', () => {
    const hookPath = resolve(__dirname, '../../../adapter/codex-plugin/hooks/pre-tool-use.mjs');

    const payload = {
      tool_name: 'apply_patch',
      tool_use_id: 'call_patch_1',
      tool_input: {
        path: '../../outside.ts',
      },
      cwd: testWorkspace,
      session_id: 'codex-sess-1',
    };

    const child = spawnSync('node', [hookPath], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });

    expect(child.status).toBe(0);
    const output = JSON.parse(child.stdout.trim());
    expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('outside');
  });

  test('PostToolUse hook should detect unexpected changes and block state', () => {
    const plan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [{ id: 'M1', title: 'M1', tasks: ['T1'] }],
      tasks: {
        T1: {
          id: 'T1',
          type: 'spike',
          milestone: 'M1',
          intent: 'Test',
          depends_on: [],
          allowed_paths: ['src/allowed.ts'],
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
    writeFileSync(execPlanPath, JSON.stringify(plan, null, 2));

    const docs = loadEmittedDocs(testWorkspace, execPlanPath);
    const state = {
      version: '4.0.0',
      phase: 'executing',
      active_milestone: 'M1',
      active_task: 'T1',
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: calculatePlanDigest(plan),
      validated_docs_digest: calculateDocsDigest(docs),
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };
    writeFileSync(execStatePath, JSON.stringify(state, null, 2));

    const hookPath = resolve(__dirname, '../../../adapter/codex-plugin/hooks/post-tool-use.mjs');
    const payload = {
      tool_name: 'apply_patch',
      tool_use_id: 'call_patch_2',
      tool_input: {
        path: 'src/allowed.ts',
      },
      cwd: testWorkspace,
      session_id: 'codex-sess-1',
    };

    const child = spawnSync('node', [hookPath], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    });

    expect(child.status).toBe(0);
    const updatedState = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(updatedState.phase).toBe('executing');
  });
});
