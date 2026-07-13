import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { onPreToolUse } from './preToolUse.js';
import {
  initExecutionState,
  saveExecutionState,
  startTask,
  recordEvidence,
} from '../../core/advanceExecutionState.js';
import { ExecutionState } from '../../core/schemas/executionState.js';

describe('B9a Build Workflow and PreToolUse path gating', () => {
  let testWorkspaceRoot: string;
  let progressPath: string;
  let execStatePath: string;
  let execPlanPath: string;

  beforeAll(() => {
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'de-build-workflow-test-'));
    progressPath = join(testWorkspaceRoot, 'progress.json');
    execStatePath = join(testWorkspaceRoot, '.design-everything/execution-state.json');
    execPlanPath = join(testWorkspaceRoot, '.design-everything/execution-plan.json');

    // Setup base directories
    mkdirSync(join(testWorkspaceRoot, '.design-everything'), { recursive: true });
    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });
    mkdirSync(join(testWorkspaceRoot, 'docs'), { recursive: true });

    // Write mock progress.json
    writeFileSync(
      progressPath,
      JSON.stringify(
        {
          version: '2.0.0',
          phase: 'ready-to-build',
          branch: 'web',
          calibrate_mode: 'deep',
          current_step: null,
          answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'W1', 'W2', 'W3', 'W4', 'W5'],
          emitted_docs: [
            '00-vision.md',
            '01-personas.md',
            '02-scope.md',
            '03-data-model.md',
            '04-flows.md',
            '05-architecture.md',
            '06-constraints.md',
            '07-deployment.md',
            '08-build-plan.md',
            '09-execution-plan.md',
            'README.md',
          ],
          gates_passed: ['scope-locked'],
          last_user_turn_id: null,
          answered_len_at_last_turn: 0,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    // Write mock gate-policy.yaml
    writeFileSync(
      join(testWorkspaceRoot, 'Design/Content/interview-script/gate-policy.yaml'),
      `
version: 2.0.0
gates:
  - id: scope-locked
    requires_docs:
      - 02-scope.md
    blocks:
      - Write
      - Edit
    message: Scope is locked.
`,
      'utf8'
    );

    // Write mock execution-plan.json (V3)
    const planJson = {
      metadata: {
        version: '4.0.0',
        updated_at: new Date().toISOString(),
      },
      trace_links: {},
      risks: [
        {
          id: 'R1-tech-uncertainty',
          title: 'Risk 1',
          status: 'spike-required',
          exit_criterion: 'exit criteria',
        },
      ],
      milestones: [
        {
          id: 'M0',
          title: 'Walking Skeleton',
          tasks: ['T0-preflight', 'T1-scaffold'],
        },
        {
          id: 'M1',
          title: 'Core Features',
          tasks: ['T2-implementation'],
        },
      ],
      tasks: {
        'T0-preflight': {
          id: 'T0-preflight',
          type: 'spike',
          milestone: 'M0',
          intent: 'Preflight check',
          depends_on: [],
          allowed_paths: [],
          preconditions: [],
          commands: ['npm --version'],
          expected_result: 'NPM ready',
          evidence_required: ['npm-log.txt'],
          failure_policy: 'abort',
        },
        'T1-scaffold': {
          id: 'T1-scaffold',
          type: 'scaffold',
          milestone: 'M0',
          intent: 'Scaffold project files',
          depends_on: ['T0-preflight'],
          allowed_paths: ['src/index.ts', 'src/types.ts'],
          preconditions: ['T0-preflight'],
          commands: ['npm run build'],
          expected_result: 'build success',
          evidence_required: ['build-log.txt'],
          failure_policy: 'abort',
        },
        'T2-implementation': {
          id: 'T2-implementation',
          type: 'implementation',
          milestone: 'M1',
          intent: 'Implement feature',
          depends_on: ['T1-scaffold'],
          allowed_paths: ['src/**/*.ts'],
          preconditions: ['T1-scaffold'],
          commands: ['npm test'],
          expected_result: 'test success',
          evidence_required: ['test-log.txt'],
          failure_policy: 'debug',
        },
      },
    };
    writeFileSync(execPlanPath, JSON.stringify(planJson, null, 2), 'utf8');
  });

  afterAll(() => {
    if (existsSync(testWorkspaceRoot)) {
      rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
  });

  test('should handle plan validation and allowed paths gating', () => {
    // 1. Initial State: plan-validating
    const state = initExecutionState();
    expect(state.phase).toBe('plan-validating');
    saveExecutionState(execStatePath, state);

    // Editing source files should be denied during plan-validating
    const preResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(preResult.decision).toBe('deny');
    expect(preResult.message).toContain('Không có task hoạt động');

    // Documents/Design files can be edited anytime
    const docResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'docs/00-vision.md' },
    });
    expect(docResult.decision).toBe('allow');

    // 2. Start preflight task T0-preflight (Preconditions met)
    const plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    let nextState: ExecutionState = { ...state, phase: 'ready-to-execute' }; // Simulate transition to ready-to-execute after validation
    nextState = startTask(nextState, 'M0', 'T0-preflight', plan);
    expect(nextState.phase).toBe('executing');
    expect(nextState.active_task).toBe('T0-preflight');
    saveExecutionState(execStatePath, nextState);

    // Preflight task T0-preflight has allowed_paths: []
    // So writing to src/index.ts should be denied
    const writeResult1 = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(writeResult1.decision).toBe('deny');
    expect(writeResult1.message).toContain('không nằm trong danh sách được sửa');

    // 3. Complete T0-preflight
    const preflightEvidence = {
      task_id: 'T0-preflight',
      command: 'npm --version',
      exit_code: 0,
      expected_result: 'NPM ready',
      observed_result: 'NPM v10',
      timestamp: new Date().toISOString(),
      artifact_paths: [],
      actor: 'vitest',
    };
    nextState = recordEvidence(nextState, preflightEvidence, plan);
    expect(nextState.phase).toBe('ready-to-execute');
    expect(nextState.completed_tasks).toContain('T0-preflight');
    saveExecutionState(execStatePath, nextState);

    // 4. Start T1-scaffold
    nextState = startTask(nextState, 'M0', 'T1-scaffold', plan);
    expect(nextState.phase).toBe('executing');
    expect(nextState.active_task).toBe('T1-scaffold');
    saveExecutionState(execStatePath, nextState);

    // Scaffold task T1-scaffold has allowed_paths: ['src/index.ts', 'src/types.ts']
    // So writing to src/index.ts is allowed, but src/app.ts is denied
    const writeResult2 = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(writeResult2.decision).toBe('allow');

    const writeResult3 = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/app.ts' },
    });
    expect(writeResult3.decision).toBe('deny');

    // 5. Fail T1-scaffold
    const scaffoldEvidenceFail = {
      task_id: 'T1-scaffold',
      command: 'npm run build',
      exit_code: 1,
      expected_result: 'build success',
      observed_result: 'compilation error',
      timestamp: new Date().toISOString(),
      artifact_paths: [],
      actor: 'vitest',
    };
    nextState = recordEvidence(nextState, scaffoldEvidenceFail, plan);
    expect(nextState.phase).toBe('repairing');
    expect(nextState.active_task).toBe('T1-scaffold');
    saveExecutionState(execStatePath, nextState);

    // In repairing phase, allows_paths is still enforced for the active task
    const repairAllowedResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(repairAllowedResult.decision).toBe('allow');

    const repairDeniedResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/app.ts' },
    });
    expect(repairDeniedResult.decision).toBe('deny');

    // 6. Complete T1-scaffold after repair
    const scaffoldEvidencePass = {
      task_id: 'T1-scaffold',
      command: 'npm run build',
      exit_code: 0,
      expected_result: 'build success',
      observed_result: 'build success',
      timestamp: new Date().toISOString(),
      artifact_paths: [],
      actor: 'vitest',
    };
    // Since recordEvidence requires active task status, check executing/repairing phase
    nextState = recordEvidence(nextState, scaffoldEvidencePass, plan);
    expect(nextState.phase).toBe('ready-to-execute');
    expect(nextState.completed_tasks).toContain('T1-scaffold');
    saveExecutionState(execStatePath, nextState);

    // 7. Start T2-implementation
    nextState = startTask(nextState, 'M1', 'T2-implementation', plan);
    expect(nextState.phase).toBe('executing');
    expect(nextState.active_task).toBe('T2-implementation');
    saveExecutionState(execStatePath, nextState);

    // T2-implementation has allowed_paths: ['src/**/*.ts'] (glob pattern)
    // So writing to src/app.ts is allowed
    const globAllowedResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/app.ts' },
    });
    expect(globAllowedResult.decision).toBe('allow');

    // Writing outside src/ is still denied
    const globDeniedResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'test/app.test.ts' },
    });
    expect(globDeniedResult.decision).toBe('deny');
  });
});
