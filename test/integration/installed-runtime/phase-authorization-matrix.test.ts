import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, execFileSync } from 'child_process';
import { calculatePlanDigest, calculateDocsDigest, loadEmittedDocs } from '../../../src/core/validatedSnapshot.js';
import { createBlockRecord, blockExecution } from '../../../src/core/advanceExecutionState.js';
import { ExecutionPlanV3, ExecutionState } from '../../../src/core/schemas/index.js';

const REPO_ROOT = join(__dirname, '../../..');
const INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: string;
    permissionDecisionReason: string;
  };
}

/**
 * U04/R04 (finding-coverage-matrix.md) — the previous installed-hook phase
 * test named itself "docs-emitted / plan-validating" but actually seeded
 * `phase: 'interview'`, so the real docs-emitted -> execution-state-required
 * transition, the plan-validating catalog-scoped write, and the blocked
 * typed-remediation scope were never exercised against the real spawned
 * hook. This file installs once and drives the real transitions each with
 * both a deny case and a positive control, per B5a Sec.6 (a suite that only
 * ever asserts deny can pass by denying everything).
 */
describe('U04/R04 — installed PreToolUse phase-authorization matrix', () => {
  let installedRoot: string;
  let preToolHook: string;
  let tmpDir: string;

  beforeAll(() => {
    installedRoot = join(tmpdir(), `de-phase-matrix-install-${Date.now()}`);
    mkdirSync(installedRoot, { recursive: true });
    execFileSync('node', [INSTALLER, installedRoot], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(installedRoot, '.design-everything/install-manifest.json'), 'utf8')
    );
    const version = manifest.runtime_version as string;
    const runtimeDir = join(installedRoot, '.design-everything/runtime', version);
    preToolHook = join(runtimeDir, 'hooks/pre-tool-use.mjs');
  });

  afterAll(() => {
    if (existsSync(installedRoot)) rmSync(installedRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-phase-matrix-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const designDir = join(tmpDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });
    cpSync(
      join(REPO_ROOT, 'Design/Content/artifact-catalog.yaml'),
      join(tmpDir, 'Design/Content/artifact-catalog.yaml')
    );
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  function runHook(payload: Record<string, unknown>): HookOutput | null {
    const raw = execSync(`node "${preToolHook}"`, { input: JSON.stringify(payload), encoding: 'utf8', cwd: tmpDir });
    return raw && raw.trim() ? (JSON.parse(raw) as HookOutput) : null;
  }

  function writeProgress(phase: string) {
    const progress = {
      version: '4.0.0',
      phase,
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: null,
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'W1', 'W2', 'W3', 'W4', 'W5'],
      emitted_docs: ['docs/01-vision.md'],
      gates_passed: ['interview_done'],
      last_user_turn_id: 'turn-1',
      answered_len_at_last_turn: 14,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');
  }

  const basePlan: ExecutionPlanV3 = {
    metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
    trace_links: [],
    risks: [],
    milestones: [{ id: 'M0-discovery', title: 'Discovery', tasks: ['T1-scaffold'] }],
    tasks: {
      'T1-scaffold': {
        id: 'T1-scaffold',
        type: 'spike',
        milestone: 'M0-discovery',
        intent: 'Scaffold',
        depends_on: [],
        allowed_paths: ['src/app.ts'],
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

  function baseExecState(phase: ExecutionState['phase']): ExecutionState {
    const execDir = join(tmpDir, '.design-everything');
    mkdirSync(execDir, { recursive: true });
    const execPlanPath = join(execDir, 'execution-plan.json');
    writeFileSync(execPlanPath, JSON.stringify(basePlan, null, 2), 'utf8');
    const docs = loadEmittedDocs(tmpDir, execPlanPath);
    return {
      version: '4.0.0',
      phase,
      active_task: phase === 'blocked' ? 'T1-scaffold' : null,
      active_milestone: 'M0-discovery',
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: calculatePlanDigest(basePlan),
      validated_docs_digest: calculateDocsDigest(docs),
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };
  }

  function writeExecState(state: ExecutionState) {
    writeFileSync(join(tmpDir, '.design-everything/execution-state.json'), JSON.stringify(state, null, 2), 'utf8');
  }

  // --- docs-emitted -> the actual fixture-name-vs-seed bug this file replaces ---

  it('deny: ready-for-validation with no execution-state.json must gate as EXECUTION_STATE_REQUIRED (the successor of the retired ready-to-build phase — evaluatePreAction.ts:92-98 says this must stay OUT of the interview-phase exclusion, or docs-emitted-but-unvalidated silently reopens code writes)', () => {
    writeProgress('ready-for-validation');
    const res = runHook({ cwd: tmpDir, tool_name: 'Write', tool_input: { file_path: join(tmpDir, 'src/app.ts') } });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(res?.hookSpecificOutput.permissionDecisionReason).toContain('execution-state.json');
  });

  it('deny (regression pin): docs-emitted with no execution-state.json also denies, via the interview-completeness fallback rather than EXECUTION_STATE_REQUIRED — still fail-closed, different reason_code', () => {
    writeProgress('docs-emitted');
    const res = runHook({ cwd: tmpDir, tool_name: 'Write', tool_input: { file_path: join(tmpDir, 'src/app.ts') } });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- plan-validating: deny outside doc scope, allow inside (positive control) ---

  it('deny: plan-validating denies a code write outside Design/docs/.design-everything', () => {
    writeProgress('docs-emitted');
    writeExecState(baseExecState('plan-validating'));
    const res = runHook({ cwd: tmpDir, tool_name: 'Write', tool_input: { file_path: join(tmpDir, 'src/app.ts') } });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('allow (positive control): plan-validating allows a catalog-routed write under Design/', () => {
    writeProgress('docs-emitted');
    writeExecState(baseExecState('plan-validating'));
    const res = runHook({
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'Design/RoadMap/scratch-note.md') },
    });
    expect(res).toBeNull(); // exit 0 == allow, no deny payload
  });

  // --- blocked: deny outside remediation scope, allow inside it (positive control) ---

  it('deny + allow: blocked phase enforces the exact typed remediation scope, not deny-all or allow-all', () => {
    writeProgress('docs-emitted');
    const state = baseExecState('blocked');
    const blockRecord = createBlockRecord(state, {
      kind: 'verification-failed',
      reason_code: 'TASK_COMMAND_FAILED_ABORT_POLICY',
      detail: 'Task verification failed under abort policy.',
      remediation: { actions: ['read', 'write-task-scope', 'run-command'], paths: ['src/app.ts'] },
    });
    const blocked = blockExecution(state, blockRecord);
    writeExecState(blocked);

    // Outside the declared remediation path -> deny.
    const denied = runHook({
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/unrelated.ts') },
    });
    expect(denied?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(denied?.hookSpecificOutput.permissionDecisionReason).toContain('blocked');

    // Inside the declared remediation path -> allow (positive control; without
    // this half the suite could pass by denying every path unconditionally).
    const allowed = runHook({
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(allowed).toBeNull();

    // Read is allowed anywhere while blocked with a typed remediation (actions
    // includes 'read') — second positive control, different action_kind.
    const read = runHook({
      cwd: tmpDir,
      tool_name: 'Read',
      tool_input: { file_path: join(tmpDir, 'src/unrelated.ts') },
    });
    expect(read).toBeNull();
  });
});
