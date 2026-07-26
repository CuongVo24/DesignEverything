import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, cpSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import { exitCodeFor } from '../../src/adapters/shared/cliResult.js';
import { manifestPath } from '../../src/core/emitTransactionActivate.js';
import { seedCanonicalProgress } from '../helpers/canonicalProgress.js';

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
    seedCanonicalProgress(workspace, { branch: 'cli' });
    const interviewDir = join(workspace, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(
      join(interviewDir, 'answers.json'),
      JSON.stringify({
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
      }),
      'utf8'
    );
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

  test('P3.1 — a successful tier-1 activation creates execution-state.json at plan-validating', async () => {
    seedEmitReadyWorkspace(tempDir);

    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    expect(existsSync(execStatePath)).toBe(false);

    const res = await runCliOperation(tempDir, ['emit']);
    expect(res.ok).toBe(true);

    expect(existsSync(execStatePath)).toBe(true);
    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('plan-validating');
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
