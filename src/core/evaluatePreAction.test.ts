import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { evaluatePreAction } from './evaluatePreAction.js';
import { PreActionRequest, AdapterCapability } from './schemas/index.js';
import { initializeInterviewStore, transactInterviewStore } from './interviewStore.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { mkdtempSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'fs';

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

  describe('P4.2/R07 — interview-phase scratch writes are bound to the real session and current question', () => {
    test('allows a scratch write for the request session_id and current_step (S0)', () => {
      const decision = evaluatePreAction({
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['.design-everything/scratch/test-session/S0/draft.md'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
      });
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('interview-doc-write-allowed');
    });

    test('denies a scratch write for a different session_id than the request', () => {
      const decision = evaluatePreAction({
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['.design-everything/scratch/someone-elses-session/S0/draft.md'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
      });
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('SCRATCH_SESSION_MISMATCH');
    });

    test('denies a scratch write for a question that is not the current current_step', () => {
      const decision = evaluatePreAction({
        runtime: 'claude',
        tool_name: 'Write',
        action_kind: 'write',
        target_paths: ['.design-everything/scratch/test-session/S9/draft.md'],
        command_argv: [],
        workspace: testWorkspace,
        session_id: 'test-session',
      });
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('SCRATCH_QUESTION_MISMATCH');
    });
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

  function baseProgress(overrides: Partial<import('./schemas/index.js').Progress> = {}) {
    return {
      version: '7.0.0',
      phase: 'interview' as const,
      session_id: 'test-session',
      state_revision: 0,
      branch: null,
      current_step: 'S0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
      calibrate_mode: null,
      ...overrides,
    };
  }

  describe('P8.2 — CLI shell commands get Core\'s own subcommand+phase authority', () => {
    test('a CLI commit invocation during interview (no execution state) is allowed directly by Core', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'commit', '--capability-token', 'x'],
        workspace: testWorkspace,
        session_id: 'test-session',
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('cli-allowed');
    });

    test('a CLI deepen invocation during interview (no execution state) is denied with the typed reason, not just generically', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'deepen', '--module', 'glossary'],
        workspace: testWorkspace,
        session_id: 'test-session',
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('DEEPEN_NOT_ALLOWED');
    });

    test('a CLI commit invocation is denied once the real phase is past interview, even during active-task execution (previous blanket-allow gap)', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'commit', '--capability-token', 'x'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'executing', active_task: 'T1' }),
        plan: { tasks: { T1: { id: 'T1', allowed_paths: ['src/**'], commands: [] } } },
        progress: baseProgress({ phase: 'ready-for-validation', current_step: null }),
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('COMMIT_NOT_ALLOWED');
    });

    test('a CLI deepen invocation is allowed during active-task execution once the real phase is past interview', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'deepen', '--module', 'glossary'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'executing', active_task: 'T1' }),
        plan: { tasks: { T1: { id: 'T1', allowed_paths: ['src/**'], commands: [] } } },
        progress: baseProgress({ phase: 'ready-for-validation', current_step: null }),
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('allow');
      expect(decision.reason_code).toBe('cli-allowed');
    });

    test('an unrecognized CLI subcommand is denied during active-task execution, not blanket-allowed as any CLI launch was before', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'totally-not-a-real-subcommand'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'executing', active_task: 'T1' }),
        plan: { tasks: { T1: { id: 'T1', allowed_paths: ['src/**'], commands: [] } } },
        progress: baseProgress({ phase: 'ready-for-validation', current_step: null }),
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('UNRECOGNIZED_CLI_SUBCOMMAND');
    });

    test('an unrecognized CLI subcommand is denied during plan-validating, not blanket-allowed as any CLI launch was before', () => {
      const request: PreActionRequest = {
        runtime: 'claude',
        tool_name: 'Bash',
        action_kind: 'shell',
        target_paths: [],
        command_argv: ['node', 'adapter/claude-code/cli.mjs', 'totally-not-a-real-subcommand'],
        workspace: testWorkspace,
        session_id: 'test-session',
        state: baseExecState({ phase: 'plan-validating' }),
        progress: baseProgress({ phase: 'ready-for-validation', current_step: null }),
      };
      const decision = evaluatePreAction(request);
      expect(decision.decision).toBe('deny');
      expect(decision.reason_code).toBe('UNRECOGNIZED_CLI_SUBCOMMAND');
    });
  });

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
          remediation: {
            actions: ['read', 'write-docs', 'run-command'],
            paths: ['Design/02-scope.md'],
            command: '/build',
            task_id: null,
            plan_revision: 1,
          },
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
          remediation: {
            actions: ['read', 'write-docs', 'run-command'],
            paths: ['Design/02-scope.md'],
            command: '/build',
            task_id: null,
            plan_revision: 1,
          },
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
          remediation: {
            actions: ['read', 'write-task-scope', 'run-command'],
            paths: [],
            command: recoverCmd,
            task_id: 'T1-setup',
            plan_revision: 1,
          },
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
          remediation: {
            actions: ['read', 'write-task-scope', 'run-command'],
            paths: [],
            command: recoverCmd,
            task_id: 'T1-setup',
            plan_revision: 1,
          },
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

    test('interview-phase pre-create of a real catalog doc is allowed (it does not exist on disk yet and no emit has activated it)', () => {
      // Every real catalog artifact today lives under docs/ — exactly what
      // the interview-phase bypass covers. This is the genuine "drafting a
      // doc before the first emit" case (P4.2/X02's `preCreateAllowed`
      // branch), which must stay allowed — see the next test for the case
      // this bypass no longer covers: overwriting an already-claimed doc.
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

    describe('P4.2/X02 — direct overwrite of an already-claimed managed doc is no longer bypassed', () => {
      test('a managed doc that already exists on disk denies a direct interview-phase write', () => {
        const claimedWorkspace = mkdtempSync(join(tmpdir(), 'pre-action-catalog-claimed-'));
        try {
          const designDir = join(claimedWorkspace, 'Design/Content');
          mkdirSync(designDir, { recursive: true });
          cpSync(join(projectRoot, 'Design/Content'), designDir, { recursive: true });
          mkdirSync(join(claimedWorkspace, 'docs'), { recursive: true });
          writeFileSync(join(claimedWorkspace, 'docs/00-vision.md'), '# already emitted\n');

          const base = initializeInterviewStore(claimedWorkspace).payload.progress;
          transactInterviewStore(claimedWorkspace, 0, (env) => ({
            ...env,
            payload: { ...env.payload, progress: { ...base, phase: 'interview', current_step: 'S0' } },
          }));

          const decision = evaluatePreAction({
            runtime: 'claude',
            tool_name: 'Write',
            action_kind: 'write',
            target_paths: ['docs/00-vision.md'],
            command_argv: [],
            workspace: claimedWorkspace,
            session_id: 'test-session',
          });
          expect(decision.decision).toBe('deny');
          expect(decision.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
        } finally {
          rmSync(claimedWorkspace, { recursive: true, force: true });
        }
      });
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

    describe('P4.2/DEBT2 — plan-validating writes go through catalog-aware authorizeMutation, not a prefix blanket-allow', () => {
      function planValidatingRequest(overrides: Partial<PreActionRequest>): PreActionRequest {
        return {
          runtime: 'claude',
          tool_name: 'Write',
          action_kind: 'write',
          target_paths: [],
          command_argv: [],
          workspace: catalogWorkspace,
          session_id: 'test-session',
          state: baseExecState({ phase: 'plan-validating' }),
          ...overrides,
        };
      }

      test('a managed catalog doc (docs/00-vision.md) is denied, not blanket-allowed', () => {
        const decision = evaluatePreAction(planValidatingRequest({ target_paths: ['docs/00-vision.md'] }));
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
      });

      test('engine-state (.design-everything/execution-state.json) is denied', () => {
        const decision = evaluatePreAction(
          planValidatingRequest({ target_paths: ['.design-everything/execution-state.json'] })
        );
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
      });

      test('engine-policy (Design/Content/interview-script/gate-policy.yaml) is denied', () => {
        const decision = evaluatePreAction(
          planValidatingRequest({ target_paths: ['Design/Content/interview-script/gate-policy.yaml'] })
        );
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
      });

      test('a well-formed scratch path is still allowed', () => {
        const decision = evaluatePreAction(
          planValidatingRequest({ target_paths: ['.design-everything/scratch/sess1/q1/note.md'] })
        );
        expect(decision.decision).toBe('allow');
        expect(decision.reason_code).toBe('plan-validating-write-allowed');
      });

      test('a malformed scratch path (missing session/question segments) is denied', () => {
        const decision = evaluatePreAction(
          planValidatingRequest({ target_paths: ['.design-everything/scratch/loose.md'] })
        );
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('INVALID_SCRATCH_PATH');
      });

      test('positive control — a user-owned path under Design/ (not catalog, not engine-*) is still allowed', () => {
        const decision = evaluatePreAction(planValidatingRequest({ target_paths: ['Design/notes/idea.md'] }));
        expect(decision.decision).toBe('allow');
        expect(decision.reason_code).toBe('plan-validating-write-allowed');
      });

      test('regression pin — a path outside the Design/docs/.design-everything scope is still denied PLAN_VALIDATION_REQUIRED', () => {
        const decision = evaluatePreAction(planValidatingRequest({ target_paths: ['src/index.ts'] }));
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('PLAN_VALIDATION_REQUIRED');
      });

      test('a missing/unloadable catalog degrades to empty entries (docs/ write still allowed as user-owned), matching the interview-phase branch', () => {
        // Same best-effort contract as the "P6 10.3" describe's "missing
        // artifact-catalog.yaml degrades..." test above, for the
        // plan-validating branch: a workspace with no catalog at all (e.g.
        // a minimal fixture, or a target predating P9 shipping the catalog
        // asset) must not have every docs/ write hard-denied — it just
        // cannot benefit from managed-output protection until the catalog
        // is available.
        const brokenWorkspace = mkdtempSync(join(tmpdir(), 'pre-action-plan-validating-broken-catalog-'));
        try {
          const designDir = join(brokenWorkspace, 'Design/Content');
          mkdirSync(designDir, { recursive: true });
          cpSync(join(projectRoot, 'Design/Content'), designDir, { recursive: true });
          rmSync(join(designDir, 'artifact-catalog.yaml'), { force: true });

          const decision = evaluatePreAction({
            runtime: 'claude',
            tool_name: 'Write',
            action_kind: 'write',
            target_paths: ['docs/some-doc.md'],
            command_argv: [],
            workspace: brokenWorkspace,
            session_id: 'test-session',
            state: baseExecState({ phase: 'plan-validating' }),
          });
          expect(decision.decision).toBe('allow');
          expect(decision.reason_code).toBe('plan-validating-write-allowed');
        } finally {
          rmSync(brokenWorkspace, { recursive: true, force: true });
        }
      });
    });
  });

  describe('EXECUTION_STATE_REQUIRED — ready-for-validation with no execution-state.json must fail closed', () => {
    // Regression pin: `ready-for-validation` is the direct successor of the
    // retired `ready-to-build` phase (migrateInterviewStore converts old
    // stores one-way) and inherits its "code gate not open yet" semantics.
    // A stale copy of the exclusion list below once still excluded
    // `ready-for-validation` from this deny check — from when it meant
    // something distinct, pre-rename — which made the whole branch
    // unreachable (the schema only allows interview/docs-emitted/
    // ready-for-validation) and let a workspace with docs already emitted
    // but a missing/deleted execution-state.json fall through to the
    // interview-time gate-policy fallback and get silently ALLOWED to
    // write code, instead of denied. See evaluatePreAction.ts's
    // EXECUTION_STATE_REQUIRED check.
    test('denies a code write when phase is ready-for-validation, docs already exist, but execution-state.json is missing', () => {
      const workspace = mkdtempSync(join(tmpdir(), 'pre-action-exec-state-required-'));
      try {
        const designDir = join(workspace, 'Design/Content');
        mkdirSync(designDir, { recursive: true });
        cpSync(join(projectRoot, 'Design/Content'), designDir, { recursive: true });

        // A real `ready-for-validation` workspace has docs on disk (tier-1
        // emit wrote them) — seed the ones scope-locked's gate requires so
        // this test proves EXECUTION_STATE_REQUIRED fires specifically,
        // not a docs-missing gate denying for an unrelated reason.
        const docsDir = join(workspace, 'docs');
        mkdirSync(docsDir, { recursive: true });
        for (const f of ['00-vision.md', '01-personas.md', '02-scope.md']) {
          writeFileSync(join(docsDir, f), '# real content\n', 'utf8');
        }

        const base = initializeInterviewStore(workspace).payload.progress;
        transactInterviewStore(workspace, 0, (env) => ({
          ...env,
          payload: {
            ...env.payload,
            progress: {
              ...base,
              phase: 'ready-for-validation',
              current_step: null,
              answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
              emitted_docs: ['00-vision.md', '01-personas.md', '02-scope.md'],
            },
          },
        }));
        // No execution-state.json written — simulates corruption, an
        // interrupted handoff, or a manually deleted file.

        const decision = evaluatePreAction({
          runtime: 'claude',
          tool_name: 'Write',
          action_kind: 'write',
          target_paths: ['src/index.ts'],
          command_argv: [],
          workspace,
          session_id: 'test-session',
        });
        expect(decision.decision).toBe('deny');
        expect(decision.reason_code).toBe('EXECUTION_STATE_REQUIRED');
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  });

  // H1 — bootstrap CLI subcommands must survive a workspace that has an
  // install-manifest.json but no canonical interview store yet (the exact
  // shape a fresh `install.mjs` run leaves behind). Before this fix,
  // loadProgressGuard denied with `progress-missing` ahead of the CLI
  // subcommand table, so `init` — the command Core's own error message
  // names as the fix — was itself denied by the error it was meant to
  // recover from.
  describe('H1 — bootstrap CLI subcommands bypass the missing-store deadlock', () => {
    test('init is allowed on a fresh install (install-manifest.json only, no canonical store)', () => {
      const workspace = mkdtempSync(join(tmpdir(), 'pre-action-bootstrap-'));
      try {
        mkdirSync(join(workspace, '.design-everything'), { recursive: true });
        writeFileSync(
          join(workspace, '.design-everything/install-manifest.json'),
          JSON.stringify({ files: [] })
        );

        const decision = evaluatePreAction({
          runtime: 'claude',
          tool_name: 'Bash',
          action_kind: 'shell',
          target_paths: [],
          command_argv: ['node', 'adapter/claude-code/cli.mjs', 'init', '--json'],
          workspace,
          session_id: 'test-session',
        });
        expect(decision.decision).toBe('allow');
        expect(decision.reason_code).toBe('cli-allowed');
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    test('status and repair are also allowed on a fresh install; commit is not', () => {
      const workspace = mkdtempSync(join(tmpdir(), 'pre-action-bootstrap-'));
      try {
        mkdirSync(join(workspace, '.design-everything'), { recursive: true });
        writeFileSync(
          join(workspace, '.design-everything/install-manifest.json'),
          JSON.stringify({ files: [] })
        );

        for (const sub of ['status', 'repair']) {
          const decision = evaluatePreAction({
            runtime: 'claude',
            tool_name: 'Bash',
            action_kind: 'shell',
            target_paths: [],
            command_argv: ['node', 'adapter/claude-code/cli.mjs', sub],
            workspace,
            session_id: 'test-session',
          });
          expect(decision.decision).toBe('allow');
        }

        // `commit` is not a bootstrap/recovery subcommand — it legitimately
        // needs a real interview store, so it must keep failing closed here.
        const commitDecision = evaluatePreAction({
          runtime: 'claude',
          tool_name: 'Bash',
          action_kind: 'shell',
          target_paths: [],
          command_argv: ['node', 'adapter/claude-code/cli.mjs', 'commit', '--capability-token', 'x'],
          workspace,
          session_id: 'test-session',
        });
        expect(commitDecision.decision).toBe('deny');
        expect(commitDecision.reason_code).toBe('progress-missing');
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    test('status on a workspace with a real, healthy store still returns the real progress-driven decision, not a blanket bypass', () => {
      // Bootstrap exemption must not silently swallow a genuinely corrupt
      // store for a command whose whole purpose is reading real state —
      // this seeds a real store and confirms status still reflects it
      // (proven indirectly: a non-CLI write inside the same interview phase
      // is still gated normally, showing progress was actually loaded, not
      // discarded to null).
      const workspace = mkdtempSync(join(tmpdir(), 'pre-action-bootstrap-'));
      try {
        const base = initializeInterviewStore(workspace).payload.progress;
        transactInterviewStore(workspace, 0, (env) => ({
          ...env,
          payload: { ...env.payload, progress: { ...base, phase: 'interview', current_step: 'S0' } },
        }));

        const statusDecision = evaluatePreAction({
          runtime: 'claude',
          tool_name: 'Bash',
          action_kind: 'shell',
          target_paths: [],
          command_argv: ['node', 'adapter/claude-code/cli.mjs', 'status'],
          workspace,
          session_id: 'test-session',
        });
        expect(statusDecision.decision).toBe('allow');

        // A protected engine-state path must still deny even though this
        // workspace was just touched by a bootstrap-exempt status call —
        // the exemption must not have leaked into a general write bypass.
        const writeDecision = evaluatePreAction({
          runtime: 'claude',
          tool_name: 'Write',
          action_kind: 'write',
          target_paths: ['.design-everything/interview-state.json'],
          command_argv: [],
          workspace,
          session_id: 'test-session',
        });
        expect(writeDecision.decision).toBe('deny');
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  });
});
