import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { evaluatePreAction } from './evaluatePreAction.js';
import { PreActionRequest, AdapterCapability } from './schemas/index.js';
import { initializeInterviewStore, transactInterviewStore } from './interviewStore.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { mkdtempSync, mkdirSync, cpSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

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

  function baseExecState(overrides: Partial<import('./schemas/index.js').ExecutionState>) {
    return {
      version: '1.0.0',
      phase: 'plan-validating' as const,
      active_task: null,
      active_milestone: null,
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: 'digest',
      validated_docs_digest: 'digest',
      validation_result_digest: 'digest',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('P4.3 — shell classifier must be the sole authority (no basename safe-list bypass)', () => {
    test('plan-validating phase denies git branch -D via the real classifier, not a basename safe-list', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['git', 'branch', '-D', 'feature'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'plan-validating' }),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('GIT_BRANCH_MUTATION_DENIED');
    });

    test('active-task phase denies find -delete via the real classifier, not a basename safe-list', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['find', '.', '-name', '*.ts', '-delete'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'executing', active_task: 'T1' }),
        plan: { tasks: { T1: { id: 'T1', allowed_paths: ['src/**'], commands: [] } } },
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      // Not proven read-only (real classifier denies -delete) and not an
      // exact-registered verification command either -> generic deny, never
      // the old basename safe-list "read-only-allowed".
      expect(decision.reason_code).not.toBe('read-only-allowed');
    });

    test('active-task write path matching does not let regex metacharacters in allowed_paths create false-positive matches', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['src/aXb/file.ts'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'executing', active_task: 'T1' }),
        plan: { tasks: { T1: { id: 'T1', allowed_paths: ['src/a.b/**'], commands: [] } } },
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('path-outside-scope');
    });
  });

  describe('P3.2 — blocked-phase actions must follow allowedRemediation, not a hardcoded deny-all', () => {
    function blockedState(block: import('./schemas/index.js').BlockRecord | null) {
      return baseExecState({ phase: 'blocked', block_reason: block });
    }

    test('write inside the declared remediation scope for a validation block is allowed, not denied outright', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['Design/02-scope.md'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: blockedState({
          kind: 'validation',
          reason_code: 'MISSING_MUST_SCOPE',
          origin_phase: 'plan-validating',
          task_id: null,
          recoverable_by: '/build',
          detail: '02-scope.md is missing Must items.',
          created_at: new Date().toISOString(),
        }),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('blocked-remediation-write-allowed');
    });

    test('write outside the declared remediation scope is still denied while blocked', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['src/index.ts'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: blockedState({
          kind: 'validation',
          reason_code: 'MISSING_MUST_SCOPE',
          origin_phase: 'plan-validating',
          task_id: null,
          recoverable_by: '/build',
          detail: '02-scope.md is missing Must items.',
          created_at: new Date().toISOString(),
        }),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('state-blocked');
    });

    test('the exact recoverable_by verify command is allowed for a verification-failed block', () => {
      const recoverCmd = 'node adapter/claude-code/cli.mjs verify --task T1-setup';
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: recoverCmd.split(' '),
        workspace: testWorkspace,
        session_id: 'test-session',
        state: blockedState({
          kind: 'verification-failed',
          reason_code: 'TASK_COMMAND_FAILED',
          origin_phase: 'verifying',
          task_id: 'T1-setup',
          recoverable_by: recoverCmd,
          detail: 'Exit code 1 on npm test',
          created_at: new Date().toISOString(),
        }),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('blocked-remediation-verify-allowed');
    });

    test('a lookalike/padded shell command is still denied, even inside a verification-failed block', () => {
      const recoverCmd = 'node adapter/claude-code/cli.mjs verify --task T1-setup';
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: [...recoverCmd.split(' '), '&&', 'rm', '-rf', '/'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: blockedState({
          kind: 'verification-failed',
          reason_code: 'TASK_COMMAND_FAILED',
          origin_phase: 'verifying',
          task_id: 'T1-setup',
          recoverable_by: recoverCmd,
          detail: 'Exit code 1 on npm test',
          created_at: new Date().toISOString(),
        }),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
    });

    test('a blocked phase with no block_reason at all fails closed to read-only, never a blanket allow', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['src/index.ts'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: blockedState(null),
      };

      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('state-blocked');
    });
  });

  describe('P6 10.3 — real compiled catalog wired into the write pre-action gate', () => {
    let catalogWorkspace: string;

    beforeAll(() => {
      catalogWorkspace = mkdtempSync(join(tmpdir(), 'pre-action-catalog-test-'));
      const designDir = join(catalogWorkspace, 'Design/Content');
      mkdirSync(designDir, { recursive: true });
      cpSync(join(projectRoot, 'Design/Content'), designDir, { recursive: true });

      const base = initializeInterviewStore(catalogWorkspace).payload.progress;
      transactInterviewStore(catalogWorkspace, 0, (env) => ({
        ...env,
        payload: { ...env.payload, progress: { ...base, phase: 'interview', current_step: 'S0' } },
      }));
    });

    afterAll(() => {
      rmSync(catalogWorkspace, { recursive: true, force: true });
    });

    test('the write-gate catalog loader and the emit catalog loader are the same function — digest is identical by construction', () => {
      // "Giữ một compiler/catalog authority" (P6 10.3 exit criteria): both
      // evaluatePreAction and emitTier1 import loadRuntimeCatalogFor from
      // the same runtimeCatalogLoader.ts module, so there is no separate
      // digest-reconciliation mechanism to test — there is only one loader.
      const first = loadRuntimeCatalogFor(catalogWorkspace);
      const second = loadRuntimeCatalogFor(catalogWorkspace);
      expect(first.digest).toBe(second.digest);
      expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    });

    test('interview-phase doc writes are still bypassed with the real catalog present (deliberately-deferred gap, untouched by this wiring)', () => {
      // Every real catalog artifact today lives under docs/ — exactly what
      // the interview-phase bypass covers — so this pins that wiring the
      // real catalog in did not silently start denying it. Closing that
      // known gap (plan-v1-bonus-tasks.md P4.2) is explicitly out of scope
      // here; it needs its own task/gate-based authorization redesign.
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['docs/00-vision.md'],
        command_argv: [],
        workspace: catalogWorkspace,
        session_id: 'test-session',
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('interview-doc-write-allowed');
    });

    test('a missing artifact-catalog.yaml degrades to empty catalog entries rather than crashing the write gate', () => {
      const brokenWorkspace = mkdtempSync(join(tmpdir(), 'pre-action-catalog-broken-'));
      try {
        // Otherwise-healthy workspace (script.yaml/shapes.yaml present, so
        // inspectRuntimeHealth doesn't deny writes outright) but with only
        // artifact-catalog.yaml removed — isolates catalog-load failure
        // specifically from "no Design/Content at all".
        const designDir = join(brokenWorkspace, 'Design/Content');
        mkdirSync(designDir, { recursive: true });
        cpSync(join(projectRoot, 'Design/Content'), designDir, { recursive: true });
        rmSync(join(designDir, 'artifact-catalog.yaml'), { force: true });

        const base = initializeInterviewStore(brokenWorkspace).payload.progress;
        transactInterviewStore(brokenWorkspace, 0, (env) => ({
          ...env,
          payload: { ...env.payload, progress: { ...base, phase: 'interview', current_step: 'S0' } },
        }));

        // A non-doc-write path (src/index.ts) is used specifically so the
        // request reaches collectCatalogEntries's real catalog load (a
        // docs/-prefixed path would take the untouched interview-doc-write
        // bypass instead, see the previous test) — but this early in the
        // interview, a non-doc write is denied by an unrelated gate-policy
        // scope check regardless of catalog/ownership. The point here is
        // only that a missing artifact-catalog.yaml must not make that
        // evaluation throw; it must still resolve to a well-formed decision.
        const request: PreActionRequest = {
          runtime: 'claude',
          tool_name: 'Write',
          action_kind: 'write',
          target_paths: ['src/index.ts'],
          command_argv: [],
          workspace: brokenWorkspace,
          session_id: 'test-session',
        };
        let decision: ReturnType<typeof evaluatePreAction> | undefined;
        expect(() => {
          decision = evaluatePreAction(request);
        }).not.toThrow();
        expect(decision?.decision === 'allow' || decision?.decision === 'deny').toBe(true);
      } finally {
        rmSync(brokenWorkspace, { recursive: true, force: true });
      }
    });
  });
});
