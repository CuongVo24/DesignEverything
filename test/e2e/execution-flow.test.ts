import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { onPreToolUse } from '../../src/adapters/claude/preToolUse.js';
import {
  initExecutionState,
  saveExecutionState,
  startTask,
  runTaskVerification,
  calculatePlanDigest,
  calculateDocsDigest,
  validateExecutionPlan,
  loadEmittedDocs,
} from '../../src/core/index.js';

describe('B10a Newbie Journey & Plan Validation Fixtures', () => {
  const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/plan-validation');

  test('invalid-shape-docs fixture should fail with invalid-shape-docs issue', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'invalid-shape-docs.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'invalid-shape-docs')).toBe(true);
  });

  test('readme-mismatch fixture should fail with readme-mismatch issue', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'readme-mismatch.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'readme-mismatch')).toBe(true);
  });

  test('traceability-missing fixture should fail with traceability-missing issue', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'traceability-missing.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'traceability-missing')).toBe(true);
  });

  test('phantom-command fixture should fail with phantom-command issue', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'phantom-command.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'phantom-command')).toBe(true);
  });

  test('scope-leak fixture should fail with scope-leak issue', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'scope-leak.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'scope-leak')).toBe(true);
  });

  test('risk-unresolved fixture should block validation with a risk-unresolved error', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'risk-unresolved.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(false);
    expect(result.issues.some((i) => i.id === 'risk-unresolved' && i.severity === 'error')).toBe(true);
  });

  test('valid-cli fixture should pass validation', () => {
    const input = JSON.parse(readFileSync(join(fixtureDir, 'valid-cli.json'), 'utf8'));
    const result = validateExecutionPlan({
      shape: input.shape,
      answers: input.answers,
      emitted_docs: input.emitted_docs,
      execution_plan: input.execution_plan,
    });
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe('E2E Execution Flow Journey', () => {
  let testWorkspaceRoot: string;
  let progressPath: string;
  let execStatePath: string;
  let execPlanPath: string;

  beforeAll(() => {
    testWorkspaceRoot = join(tmpdir(), `de-e2e-exec-flow-${Date.now()}`);
    progressPath = join(testWorkspaceRoot, 'progress.json');
    execStatePath = join(testWorkspaceRoot, '.design-everything/execution-state.json');
    execPlanPath = join(testWorkspaceRoot, '.design-everything/execution-plan.json');

    mkdirSync(join(testWorkspaceRoot, '.design-everything'), { recursive: true });
    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });
    mkdirSync(join(testWorkspaceRoot, 'docs'), { recursive: true });
    writeFileSync(join(testWorkspaceRoot, 'docs/02-scope.md'), 'dummy scope');

    // Write a mock valid progress.json
    writeFileSync(
      progressPath,
      JSON.stringify(
        {
          version: '2.0.0',
          phase: 'ready-to-build',
          branch: 'web',
          calibrate_mode: 'deep',
          current_step: null,
          answered: [],
          emitted_docs: [
            '00-vision.md',
            '01-personas.md',
            '02-scope.md',
            '03-data-model.md',
            '04-flows.md',
            '05-architecture.md',
            '06-constraints.md',
            '08-build-plan.md',
            'README.md',
          ],
          gates_passed: ['scope-locked'],
          last_user_turn_id: null,
          answered_len_at_last_turn: 0,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // Copy plan from fixtures
    const mockPlan = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../fixtures/execution/plan-v3-mock.json'),
      'utf8'
    );
    writeFileSync(execPlanPath, mockPlan);

    const planJson = JSON.parse(mockPlan);
    const planDigest = calculatePlanDigest(planJson);

    writeFileSync(
      join(testWorkspaceRoot, 'docs/09-execution-plan.md'),
      `# Plan\n\n<!-- plan-digest: ${planDigest} -->`
    );

    writeFileSync(
      join(testWorkspaceRoot, 'docs/README.md'),
      `- 02-scope.md\n- 09-execution-plan.md\n- README.md\n`
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
  });

  afterAll(() => {
    if (existsSync(testWorkspaceRoot)) {
      rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
  });

  test('rules-only smoke - verify self-reported limitation', () => {
    const state = initExecutionState();
    expect(state.phase).toBe('plan-validating');
    saveExecutionState(execStatePath, state);
    // In rules-only smoke testing, state phase restricts any writing of source code
    const result = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(result.decision).toBe('deny');
    expect(result.message).toContain('Không có task hoạt động');
  });

  test('should execute full developer workflow (Validate -> Start -> Deny/Allow Path -> Record Evidence Fail -> Repair -> Record Evidence Pass)', async () => {
    let state = initExecutionState();
    const plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    const planDigest = calculatePlanDigest(plan);
    const emittedDocs = loadEmittedDocs(testWorkspaceRoot, execPlanPath);
    const docsDigest = calculateDocsDigest(emittedDocs);

    state.phase = 'ready-to-execute';
    state.completed_tasks = ['T0-preflight'];
    state.validated_plan_digest = planDigest;
    state.validated_docs_digest = docsDigest;
    state.validation_result_digest = '';
    saveExecutionState(execStatePath, state);

    // 1. Start T1-scaffold (allowed_paths: ['src/index.ts', 'tsconfig.json'])
    state = startTask(state, 'M0', 'T1-scaffold', plan);
    expect(state.phase).toBe('executing');
    expect(state.active_task).toBe('T1-scaffold');
    saveExecutionState(execStatePath, state);

    // Gating check: write to allowed file tsconfig.json -> allowed
    const allowResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'tsconfig.json' },
    });
    expect(allowResult.decision).toBe('allow');

    // Gating check: write to disallowed file src/app.ts -> denied
    const denyResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/app.ts' },
    });
    expect(denyResult.decision).toBe('deny');

    // 2. Record failed evidence (exit code 1) -> repairing phase
    const failingPlan = JSON.parse(JSON.stringify(plan));
    failingPlan.tasks['T1-scaffold'].commands[0].argv = ['node', '-e', 'process.exit(1)'];

    state = await runTaskVerification({
      workspace: testWorkspaceRoot,
      plan: failingPlan,
      state,
      task_id: 'T1-scaffold',
      command_id: 'scaffold-file'
    });
    expect(state.phase).toBe('repairing');
    expect(state.active_task).toBe('T1-scaffold');
    saveExecutionState(execStatePath, state);

    // In repairing phase, allowed path is still editable
    const repairAllowResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'tsconfig.json' },
    });
    expect(repairAllowResult.decision).toBe('allow');

    // In repairing phase, disallowed path is still blocked
    const repairDenyResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/app.ts' },
    });
    expect(repairDenyResult.decision).toBe('deny');

    // 3. Record successful evidence after repair (exit code 0) -> ready-to-execute
    state = await runTaskVerification({
      workspace: testWorkspaceRoot,
      plan,
      state,
      task_id: 'T1-scaffold',
      command_id: 'scaffold-file'
    });
    expect(state.phase).toBe('ready-to-execute');
    expect(state.completed_tasks).toContain('T1-scaffold');
    expect(state.active_task).toBeNull();
  });
});
