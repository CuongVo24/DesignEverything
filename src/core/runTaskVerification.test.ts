import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { runTaskVerification } from './runTaskVerification.js';
import { initExecutionState, startTask, transitionToReadyToExecute } from './advanceExecutionState.js';
import { ExecutionPlanV3 } from './schemas/executionPlan.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';

// Mỗi test spawn ít nhất một process node thật (test đầu spawn 3 lệnh tuần tự).
// 5s mặc định của vitest không đủ trên Windows/máy chậm — timeout ở cấp describe
// để cả file không flaky.
describe('runTaskVerification core engine', { timeout: 60_000 }, () => {
  let testWorkspace: string;

  beforeAll(() => {
    testWorkspace = mkdtempSync(join(tmpdir(), 'verify-test-'));
  });

  afterAll(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

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
        tasks: ['T1'],
      },
    ],
    tasks: {
      T1: {
        id: 'T1',
        type: 'implementation',
        milestone: 'M1',
        intent: 'Test task',
        depends_on: [],
        allowed_paths: ['test.txt'],
        preconditions: [],
        commands: [
          {
            id: 'cmd-zero',
            argv: ['node', '-e', 'console.log("hello world"); process.exit(0)'],
            expected: { kind: 'exit-code-zero' },
          },
          {
            id: 'cmd-includes',
            argv: ['node', '-e', 'console.log("expected output"); process.exit(0)'],
            expected: { kind: 'output-includes', value: 'expected' },
          },
          {
            id: 'cmd-file',
            argv: ['node', '-e', 'require("fs").writeFileSync("test.txt", "content"); process.exit(0)'],
            expected: { kind: 'file-exists', value: 'test.txt' },
          }
        ],
        expected_result: 'pass',
        evidence_required: ['test.txt'],
        failure_policy: 'debug',
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
    // Skeleton-only fixture: without this flag the feature gate keeps the
    // phase at ready-to-execute until an M4-* milestone is reviewed.
    no_features: true,
  };

  test('should pass verification and capture evidence correctly', async () => {
    let state = initExecutionState();
    state = transitionToReadyToExecute(state, true);
    state = startTask(state, 'M1', 'T1', plan);

    // Verify first command: cmd-zero (exit-code-zero)
    state = await runTaskVerification({
      workspace: testWorkspace,
      plan,
      state,
      task_id: 'T1',
      command_id: 'cmd-zero',
    });

    expect(state.phase).toBe('verifying'); // Since other commands are not yet verified
    expect(state.evidence).toHaveLength(1);
    expect(state.evidence[0].exit_code).toBe(0);
    expect(state.evidence[0].source).toBe('runner');
    expect(state.evidence[0].command_id).toBe('cmd-zero');

    const stdoutLog = join(testWorkspace, '.design-everything/evidence/T1/cmd-zero.stdout.log');
    expect(existsSync(stdoutLog)).toBe(true);
    expect(readFileSync(stdoutLog, 'utf8').trim()).toBe('hello world');

    // Verify second command: cmd-includes
    state = await runTaskVerification({
      workspace: testWorkspace,
      plan,
      state,
      task_id: 'T1',
      command_id: 'cmd-includes',
    });
    expect(state.phase).toBe('verifying');
    expect(state.evidence).toHaveLength(2);

    // Verify third command: cmd-file (which also satisfies evidence_required artifact check)
    state = await runTaskVerification({
      workspace: testWorkspace,
      plan,
      state,
      task_id: 'T1',
      command_id: 'cmd-file',
    });

    // Since all commands have passed, the task is completed
    expect(state.phase).toBe('ready-to-ship');
    expect(state.active_task).toBeNull();
    expect(state.completed_tasks).toContain('T1');
    expect(state.evidence).toHaveLength(3);
    expect(Object.keys(state.evidence[2].artifact_digests)).toContain('test.txt');
  });

  test('should fail when exit code is non-zero', async () => {
    let state = initExecutionState();
    state = transitionToReadyToExecute(state, true);
    state = startTask(state, 'M1', 'T1', plan);

    const failingPlan = JSON.parse(JSON.stringify(plan));
    failingPlan.tasks.T1.commands[0].argv = ['node', '-e', 'process.exit(1)'];

    state = await runTaskVerification({
      workspace: testWorkspace,
      plan: failingPlan,
      state,
      task_id: 'T1',
      command_id: 'cmd-zero',
    });

    expect(state.phase).toBe('repairing');
    expect(state.evidence[0].exit_code).toBe(1);
    expect(state.block_reason).toContain('failed with exit code 1');
  });

  test('should fail when output includes expectation is not met', async () => {
    let state = initExecutionState();
    state = transitionToReadyToExecute(state, true);
    state = startTask(state, 'M1', 'T1', plan);

    const failingPlan = JSON.parse(JSON.stringify(plan));
    failingPlan.tasks.T1.commands[1].argv = ['node', '-e', 'console.log("wrong output"); process.exit(0)'];

    state = await runTaskVerification({
      workspace: testWorkspace,
      plan: failingPlan,
      state,
      task_id: 'T1',
      command_id: 'cmd-includes',
    });

    expect(state.phase).toBe('repairing');
    expect(state.evidence[0].exit_code).toBe(1);
  });

  test('should reject path traversal in CWD or expected file path', async () => {
    let state = initExecutionState();
    state = transitionToReadyToExecute(state, true);
    state = startTask(state, 'M1', 'T1', plan);

    const evilPlan = JSON.parse(JSON.stringify(plan));
    evilPlan.tasks.T1.commands[0].cwd = '../../evil-dir';

    await expect(
      runTaskVerification({
        workspace: testWorkspace,
        plan: evilPlan,
        state,
        task_id: 'T1',
        command_id: 'cmd-zero',
      })
    ).rejects.toThrow(/security error/i);
  });
});
