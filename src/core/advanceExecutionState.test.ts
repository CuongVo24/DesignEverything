import { expect, test, describe } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import {
  initExecutionState,
  loadExecutionState,
  saveExecutionState,
  transitionToReadyToExecute,
  startTask,
  recordEvidence,
  checkExecutionGate,
  ExecutionPlanV3,
  GatePolicy,
} from './index.js';

describe('advanceExecutionState and checkExecutionGate logic', () => {
  const plan: ExecutionPlanV3 = {
    metadata: {
      version: '4.0.0',
      updated_at: new Date().toISOString(),
    },
    trace_links: [],
    risks: [],
    milestones: [
      {
        id: 'M1',
        title: 'Milestone 1',
        tasks: ['T1', 'T2'],
      },
    ],
    tasks: {
      T1: {
        id: 'T1',
        type: 'implementation',
        milestone: 'M1',
        intent: 'Task 1',
        depends_on: [],
        allowed_paths: ['src/index.ts'],
        preconditions: [],
        commands: [
          {
            id: 'test-index',
            argv: ['npm', 'run', 'test:index'],
            expected: { kind: 'exit-code-zero' },
          }
        ],
        expected_result: 'pass',
        evidence_required: ['T1-evidence.txt'],
        failure_policy: 'debug',
        requires_capability: 'node-npm-project',
      },
      T2: {
        id: 'T2',
        type: 'implementation',
        milestone: 'M1',
        intent: 'Task 2',
        depends_on: ['T1'],
        allowed_paths: ['src/util.ts'],
        preconditions: ['T1'],
        commands: [
          {
            id: 'test-util',
            argv: ['npm', 'run', 'test:util'],
            expected: { kind: 'exit-code-zero' },
          }
        ],
        expected_result: 'pass',
        evidence_required: ['T2-evidence.txt'],
        failure_policy: 'abort',
        requires_capability: 'node-npm-project',
      },
    },
    capabilities_evidence: [
      {
        id: 'node-npm-project',
        name: 'Node.js NPM Project Manifest',
        source: 'existing-manifest',
        checked_at: new Date().toISOString(),
      }
    ],
    discovery_status: 'pass',
    no_features: true,
  };

  test('should initialize and transition state correctly', () => {
    let state = initExecutionState();
    expect(state.phase).toBe('plan-validating');
    expect(state.active_task).toBeNull();
    expect(state.completed_tasks).toHaveLength(0);

    // Transition with validation failure
    const failState = transitionToReadyToExecute(state, false);
    expect(failState.phase).toBe('blocked');
    expect(failState.block_reason).toBeDefined();

    // Transition with validation success
    state = transitionToReadyToExecute(state, true);
    expect(state.phase).toBe('ready-to-execute');
    expect(state.block_reason).toBeNull();

    // Cannot start task T2 because T1 is not completed
    expect(() => {
      startTask(state, 'M1', 'T2', plan);
    }).toThrow(/precondition task T1/i);

    // Start task T1
    state = startTask(state, 'M1', 'T1', plan);
    expect(state.phase).toBe('executing');
    expect(state.active_task).toBe('T1');
    expect(state.active_milestone).toBe('M1');

    // Record failure evidence
    const failEvidence = {
      task_id: 'T1',
      command_id: 'test-index',
      argv: ['npm', 'run', 'test:index'],
      cwd: null,
      exit_code: 1,
      stdout_sha256: 'hash1',
      stderr_sha256: 'hash2',
      artifact_digests: {},
      captured_at: '2026-07-13T10:00:00.000Z',
      source: 'runner' as const,
    };

    state = recordEvidence(state, failEvidence, plan);
    expect(state.phase).toBe('repairing');
    expect(state.active_task).toBe('T1');
    expect(state.evidence).toHaveLength(1);

    // Duplicate evidence check during repairing phase (so it is not blocked by phase check)
    expect(() => {
      recordEvidence(state, failEvidence, plan);
    }).toThrow(/duplicate evidence/i);

    // Start task T1 again (from repairing phase)
    state = startTask(state, 'M1', 'T1', plan);
    expect(state.phase).toBe('executing');

    // Record success evidence
    const successEvidence = {
      task_id: 'T1',
      command_id: 'test-index',
      argv: ['npm', 'run', 'test:index'],
      cwd: null,
      exit_code: 0,
      stdout_sha256: 'hash1',
      stderr_sha256: 'hash2',
      artifact_digests: {
        'T1-evidence.txt': 'hash-artifact'
      },
      captured_at: '2026-07-13T10:00:01.000Z',
      source: 'runner' as const,
    };

    state = recordEvidence(state, successEvidence, plan);
    expect(state.phase).toBe('ready-to-execute');
    expect(state.active_task).toBeNull();
    expect(state.completed_tasks).toContain('T1');

    // Start task T2 (precondition T1 is satisfied)
    state = startTask(state, 'M1', 'T2', plan);
    expect(state.active_task).toBe('T2');

    // Record success evidence for T2 -> completes the plan!
    const successEvidence2 = {
      task_id: 'T2',
      command_id: 'test-util',
      argv: ['npm', 'run', 'test:util'],
      cwd: null,
      exit_code: 0,
      stdout_sha256: 'hash3',
      stderr_sha256: 'hash4',
      artifact_digests: {
        'T2-evidence.txt': 'hash-artifact-2'
      },
      captured_at: '2026-07-13T10:00:02.000Z',
      source: 'runner' as const,
    };

    state = recordEvidence(state, successEvidence2, plan);
    expect(state.phase).toBe('ready-to-ship');
    expect(state.active_task).toBeNull();
    expect(state.completed_tasks).toContain('T2');
  });

  test('should load and save execution state to file system', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'exec-state-test-'));
    const statePath = join(tempDir, 'execution-state.json');

    const state = initExecutionState();
    saveExecutionState(statePath, state);
    expect(existsSync(statePath)).toBe(true);

    const loaded = loadExecutionState(statePath);
    expect(loaded.phase).toBe(state.phase);
    expect(loaded.version).toBe(state.version);

    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should check execution gates allows_paths correctly', () => {
    let state = initExecutionState();
    state = transitionToReadyToExecute(state, true);
    state = startTask(state, 'M1', 'T1', plan);

    const policy: GatePolicy = {
      version: '2.0.0',
      gates: [
        {
          id: 'task-1-gate',
          requires_docs: [],
          blocks: ['Write', 'Edit'],
          message: 'Task 1 blocks',
          task_id: 'T1',
          allows_paths: ['src/index.ts'],
        },
      ],
    };

    // Allowed path
    const check1 = checkExecutionGate(state, policy, 'Write', 'src/index.ts');
    expect(check1.allowed).toBe(true);

    // Blocked path
    const check2 = checkExecutionGate(state, policy, 'Write', 'src/util.ts');
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain('allows_paths');

    // Null state is allowed
    const check3 = checkExecutionGate(null, policy, 'Write', 'src/util.ts');
    expect(check3.allowed).toBe(true);
  });
});
