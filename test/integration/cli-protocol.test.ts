import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, cpSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import { exitCodeFor } from '../../src/adapters/shared/cliResult.js';
import { evaluatePreAction } from '../../src/core/evaluatePreAction.js';
import { manifestPath } from '../../src/core/emitTransactionActivate.js';
import { seedCanonicalProgress, seedCanonicalAnswers } from '../helpers/canonicalProgress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

describe('B4c — CLI exit, output and health protocol contract', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cli-protocol-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  test('status on uninvolved project returns UNINVOLVED envelope with exit code 0', async () => {
    const res = await runCliOperation(tempDir, ['status']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('UNINVOLVED');
    expect(exitCodeFor(res)).toBe(0);
  });

  test('init on fresh directory initializes state and returns INIT_SUCCESS', async () => {
    // Write minimal script and gate-policy so init can work
    const scriptDir = join(tempDir, 'Design/Content/interview-script');
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(scriptDir, 'script.yaml'), 'version: "0.1.0"\nsteps: []\n', 'utf8');

    const res = await runCliOperation(tempDir, ['init']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('INIT_SUCCESS');
    expect(exitCodeFor(res)).toBe(0);
  });

  test('P8 — a raw internal error surfaced by init does not leak the local filesystem path', async () => {
    // Force initializeInterviewStore to fail with a real Node fs error whose
    // message embeds an absolute path: create a FILE where the canonical
    // store expects a directory, so any write under it fails with ENOTDIR/
    // ENOENT and the local temp-dir path baked into the message.
    writeFileSync(join(tempDir, '.design-everything'), 'not a directory', 'utf8');

    const res = await runCliOperation(tempDir, ['init']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('INIT_FAILED');
    expect(res.message).not.toContain(tempDir);
  });

  function seedEmitReadyWorkspace(workspace: string): void {
    cpSync(join(REPO_ROOT, 'Design/Content'), join(workspace, 'Design/Content'), { recursive: true });
    seedCanonicalProgress(workspace, {
      phase: 'ready-for-validation',
      branch: 'cli',
      current_step: null,
    });
    // P10 — tier-1 emit reads payload.answers off the canonical store, not
    // the legacy Design/.interview/answers.json file (dead for tier-1 since
    // the P2.2a canonical-authority cutover; see handleEmit).
    seedCanonicalAnswers(workspace, {
      S0: 'CLI tool',
      S1: 'Nỗi đau A, xoay xở B',
      S2: 'Dev (Contributor)',
      S3: 'Must: chạy lệnh chính. Should: log đẹp.',
      S4: 'Config, Job',
      S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
      S6: 'Solo, 2 tuần',
      C1: 'Node.js (TypeScript)',
      C2: 'flags/arguments',
      C3: 'file config JSON ~/.config/myapp.json',
      C4: 'macOS',
      C5: 'NPM registry',
    });
  }

  test('P7.1 — production emit activates through the real transaction kernel, not a direct write loop', async () => {
    seedEmitReadyWorkspace(tempDir);

    const res = await runCliOperation(tempDir, ['emit']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('EMIT_ACTIVATED');
    expect(exitCodeFor(res)).toBe(0);
    // A production emit that only writes files directly (the old
    // writeFileSync loop) never produces a manifest/journal — asserting
    // these exist proves the CLI is actually routing through the
    // stage->validate->activate kernel, not just writing docs/ ad hoc.
    expect(existsSync(manifestPath(tempDir, 'tier1'))).toBe(true);
    expect(existsSync(join(tempDir, '.design-everything/emit-journal.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'docs/00-vision.md'))).toBe(true);
  });

  test('P10 — emit sources tier-1 answers from the canonical store, not the dead legacy Design/.interview/answers.json file', async () => {
    seedEmitReadyWorkspace(tempDir);
    // No legacy file exists at all — a real post-canonical-cutover project
    // never writes one. If emit still read it, S0's answer would never
    // reach the rendered doc and this assertion would fail on blank content.
    expect(existsSync(join(tempDir, 'Design/.interview/answers.json'))).toBe(false);

    const res = await runCliOperation(tempDir, ['emit']);
    expect(res.ok).toBe(true);

    const vision = readFileSync(join(tempDir, 'docs/00-vision.md'), 'utf8');
    expect(vision).toContain('CLI tool');
  });

  test('P10 — emit --slots-file merges build-plan-derived slots into the rendered doc and into canonical payload.slots', async () => {
    seedEmitReadyWorkspace(tempDir);
    const interviewDir = join(tempDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(
      join(interviewDir, 'slots-buildplan.json'),
      JSON.stringify({
        build_plan_principles: 'Nguyên tắc: nhỏ, có test, review từng bước.',
        build_milestones: 'M1: dựng khung CLI. M2: hoàn thiện lệnh chính.',
      }),
      'utf8'
    );

    const res = await runCliOperation(tempDir, [
      'emit',
      '--slots-file',
      'Design/.interview/slots-buildplan.json',
    ]);
    expect(res.ok).toBe(true);

    const buildPlan = readFileSync(join(tempDir, 'docs/08-build-plan.md'), 'utf8');
    expect(buildPlan).toContain('Nguyên tắc: nhỏ, có test, review từng bước.');
    expect(buildPlan).toContain('M1: dựng khung CLI. M2: hoàn thiện lệnh chính.');

    const canonical = JSON.parse(
      readFileSync(join(tempDir, '.design-everything/interview-state.json'), 'utf8')
    );
    expect(canonical.payload.slots.build_plan_principles.value).toBe(
      'Nguyên tắc: nhỏ, có test, review từng bước.'
    );
  });

  test('P3.1 — a successful tier-1 activation creates execution-state.json at plan-validating', async () => {
    seedEmitReadyWorkspace(tempDir);

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    expect(existsSync(execStatePath)).toBe(false);

    const res = await runCliOperation(tempDir, ['emit']);
    expect(res.ok).toBe(true);

    expect(existsSync(execStatePath)).toBe(true);
    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    const manifest = JSON.parse(readFileSync(manifestPath(tempDir, 'tier1'), 'utf8'));
    const journal = JSON.parse(readFileSync(join(tempDir, '.design-everything/emit-journal.json'), 'utf8'));
    expect(state.phase).toBe('plan-validating');
    expect(journal).toMatchObject({
      step: 'done',
      handoff: {
        manifest_generation_id: manifest.generation_id,
        state_status: 'created',
      },
    });
    expect(state.handoff).toMatchObject({
      manifest_generation_id: manifest.generation_id,
      interview_state_revision: journal.handoff.interview_state_revision,
      manifest_digest: journal.handoff.manifest_digest,
      plan_digest: journal.handoff.plan_digest,
      docs_digest: journal.handoff.docs_digest,
    });
  });

  test('P3.1 — deleting execution-state.json after an emit denies direct code writes, next, and start', async () => {
    seedEmitReadyWorkspace(tempDir);
    expect((await runCliOperation(tempDir, ['emit'])).ok).toBe(true);

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    rmSync(execStatePath);

    const next = await runCliOperation(tempDir, ['next']);
    const start = await runCliOperation(tempDir, ['start', '--task', 'T1-scaffold']);
    const codeWrite = evaluatePreAction({
      workspace: tempDir,
      session_id: 'p3-missing-state',
      runtime: 'claude',
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['src/should-not-be-written.ts'],
      command_argv: [],
    });

    // B2e §3 — next/start now consult the same Core health result codeWrite
    // (evaluatePreAction) already did, so all three report the same
    // MISSING_EXECUTION_STATE reason_code instead of next/start's own
    // previously-separate 'EXECUTION_STATE_MISSING' string.
    expect(next).toMatchObject({ ok: false, reason_code: 'MISSING_EXECUTION_STATE' });
    expect(start).toMatchObject({ ok: false, reason_code: 'MISSING_EXECUTION_STATE' });
    expect(codeWrite).toMatchObject({ decision: 'deny', reason_code: 'MISSING_EXECUTION_STATE' });
  });

  test('P3.1 — re-emitting tier-1 never resets execution state that already progressed past plan-validating', async () => {
    seedEmitReadyWorkspace(tempDir);
    const first = await runCliOperation(tempDir, ['emit']);
    expect(first.ok).toBe(true);

    // Simulate the build having already advanced past plan-validating.
    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    const advanced = { ...JSON.parse(readFileSync(execStatePath, 'utf8')), phase: 'ready-to-execute' };
    writeFileSync(execStatePath, JSON.stringify(advanced, null, 2), 'utf8');

    const second = await runCliOperation(tempDir, ['emit']);
    expect(second.ok).toBe(true);

    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('ready-to-execute');
  });

  test('P3.1 — next on a freshly-emitted, not-yet-validated workspace reports PLAN_VALIDATION_REQUIRED via evaluateBuildReadiness, not a generic stale-snapshot error', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const res = await runCliOperation(tempDir, ['next']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('PLAN_VALIDATION_REQUIRED');
    expect(res.next_command).toBe('/build');
  });

  test('P1 (DEBT1) — validate on a tampered doc fails closed to SEMANTIC_VALIDATION_FAILED and blocks the plan', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    writeFileSync(join(tempDir, 'docs/00-vision.md'), 'tampered, does not match emit manifest digest', 'utf8');

    const res = await runCliOperation(tempDir, ['validate']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('SEMANTIC_VALIDATION_FAILED');
    expect(exitCodeFor(res)).toBe(2);

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('blocked');
    expect(state.block_reason.kind).toBe('validation');
    expect(state.block_reason.reason_code).toBe('SEMANTIC_VALIDATION_FAILED');
  });

  test('P1 (DEBT1) — validate on an untampered freshly-emitted workspace passes with a real digest, not the literal "pass"', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const res = await runCliOperation(tempDir, ['validate']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('VALIDATION_PASSED');

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('ready-to-execute');
    expect(state.validation_result_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(state.validation_result_digest).not.toBe('pass');
  });

  test('P1 (DEBT1) — validate never clears a verification-failed block; it stays blocked with the same reason', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    const existingState = JSON.parse(readFileSync(execStatePath, 'utf8'));
    const recoveryCommand = 'node adapter/claude-code/cli.mjs verify --task T1-scaffold';
    const blockedState = {
      ...existingState,
      phase: 'blocked',
      active_task: 'T1-scaffold',
      block_reason: {
        kind: 'verification-failed',
        reason_code: 'TASK_COMMAND_FAILED_ABORT_POLICY',
        origin_phase: 'executing',
        task_id: 'T1-scaffold',
        recoverable_by: recoveryCommand,
        detail: 'Task verification failed under abort policy.',
        created_at: new Date().toISOString(),
        remediation: {
          actions: ['read', 'write-task-scope', 'run-command'],
          paths: ['src/scaffold.ts'],
          command: recoveryCommand,
          task_id: 'T1-scaffold',
          plan_revision: existingState.plan_revision,
        },
      },
    };
    writeFileSync(execStatePath, JSON.stringify(blockedState, null, 2), 'utf8');

    const res = await runCliOperation(tempDir, ['validate']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TASK_COMMAND_FAILED_ABORT_POLICY');

    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('blocked');
    expect(state.block_reason.kind).toBe('verification-failed');
    expect(state.active_task).toBe('T1-scaffold');
  });

  test('P1 gap-fix (§9.1) — start on a freshly-emitted, not-yet-validated workspace reports PLAN_VALIDATION_REQUIRED via evaluateBuildReadiness', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const res = await runCliOperation(tempDir, ['start', '--task', 'T1-scaffold']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('PLAN_VALIDATION_REQUIRED');
    expect(res.next_command).toBe('/build');
  });

  test('unknown subcommand returns UNKNOWN_SUBCOMMAND envelope with exit code 1', async () => {
    const res = await runCliOperation(tempDir, ['unknownSubcommand']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('UNKNOWN_SUBCOMMAND');
    expect(exitCodeFor(res)).toBe(1);
  });

  test('exitCodeFor correctly maps failure categories to exit codes', () => {
    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'USAGE_ERROR',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(1);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'GATE_CLOSED',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(2);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(3);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'DUPLICATE_COMMIT',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(4);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'INTERNAL_ERROR',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(5);
  });
});
