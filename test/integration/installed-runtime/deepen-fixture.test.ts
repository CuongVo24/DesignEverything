import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { initializeInterviewStore, transactInterviewStore } from '../../../src/core/index.js';

/**
 * P10 (bonus-plan Phase 6, item 4) — every deepen behavior above this file
 * is proven against the in-repo TypeScript source (test/integration/
 * deepen-cli.test.ts) or via runCliOperation called in-process (cli-health.
 * test.ts). Neither exercises the actual packaged artifact: a real install
 * (adapter/claude-code/install.mjs) followed by spawning the TARGET-LOCAL
 * cli.mjs as its own child process against the installed
 * .design-everything/runtime/<version>/ layout. That's the only path that
 * would have caught the installer's own former bug (deepen-script.yaml and
 * artifact-catalog.yaml not shipped at all — see install.mjs's comments) or
 * a runtimeBundleEntry.ts export gap for the deepen surface specifically.
 */
describe('B5c — installed-target deepen fixture', () => {
  const REPO_ROOT = join(__dirname, '../../..');
  const INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');
  let tempTarget: string;

  beforeEach(() => {
    tempTarget = join(tmpdir(), `de-deepen-install-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempTarget)) {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  function targetCliPath(): string {
    const runtimeDir = join(tempTarget, '.design-everything/runtime');
    const version = readFileSync(join(tempTarget, '.design-everything/install-manifest.json'), 'utf8');
    const runtimeVersion = JSON.parse(version).runtime_version as string;
    return join(runtimeDir, runtimeVersion, 'cli.mjs');
  }

  // deepen's own CLI/CLI-adjacent envelopes are always a well-formed JSON
  // object on stdout, ok:true or ok:false — non-zero exit (any real
  // ok:false severity) makes execFileSync throw, so this reads the same
  // envelope back from err.stdout in that case instead of treating a
  // typed rejection as a harness failure.
  function runTargetCli(args: string[]): Record<string, unknown> {
    try {
      const out = execFileSync('node', [targetCliPath(), ...args, '--json'], {
        encoding: 'utf8',
        cwd: tempTarget,
      });
      return JSON.parse(out);
    } catch (err: unknown) {
      const stdout = (err as { stdout?: string }).stdout;
      if (stdout) return JSON.parse(stdout);
      throw err;
    }
  }

  it('deepen --json (list, no --module) on a fresh un-initialized install resolves via the installed bundle instead of UNKNOWN_SUBCOMMAND or crashing', () => {
    execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });

    // No --module is the informational "list module status" shape, which
    // legitimately succeeds even pre-init (nothing opted in yet) — the
    // real proof here is that the installed, spawned bundle resolves the
    // 'deepen' subcommand at all (a genuine packaging gap would surface as
    // UNKNOWN_SUBCOMMAND or a raw module-resolution crash, not this).
    const res = runTargetCli(['deepen']);
    expect(res.reason_code).not.toBe('UNKNOWN_SUBCOMMAND');
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('DEEPEN_STATUS');
  });

  it('deepen --module glossary --opt-in on a fresh un-initialized install fails closed, not UNKNOWN_SUBCOMMAND', () => {
    execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });

    const res = runTargetCli(['deepen', '--module', 'glossary', '--opt-in']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).not.toBe('UNKNOWN_SUBCOMMAND');
  });

  it('full opt-in -> next -> commit -> emit journey works end-to-end through the installed, spawned runtime bundle', () => {
    execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });

    // Seed a ready-to-execute canonical interview store directly (fast,
    // in-process) — same shape test/integration/deepen-cli.test.ts's
    // seedDeepenReadyWorkspace uses, just pointed at the installed target
    // instead of a bare temp dir.
    const base = initializeInterviewStore(tempTarget).payload.progress;
    transactInterviewStore(tempTarget, 0, (env) => ({
      ...env,
      payload: {
        ...env.payload,
        progress: { ...base, branch: 'cli', phase: 'ready-for-validation', current_step: null },
        answers: {
          S0: 'CLI tool',
          S1: 'Nỗi đau A, xoay xở B',
          S2: 'Dev (Contributor)',
          S3: 'Must: chạy lệnh chính.',
          S4: 'Config, Job',
          S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
          S6: 'Solo, 2 tuần',
          C1: 'Node.js (TypeScript)',
          C2: 'flags/arguments',
          C3: 'file config JSON',
          C4: 'macOS',
          C5: 'NPM registry',
        },
      },
    }));

    const emit = runTargetCli(['emit']);
    expect(emit.ok).toBe(true);

    const optIn = runTargetCli(['deepen', '--module', 'glossary', '--opt-in']);
    expect(optIn.ok).toBe(true);
    expect(optIn.reason_code).toBe('DEEPEN_OPTED_IN');

    const next = runTargetCli(['deepen', '--module', 'glossary', '--next']);
    expect(next.ok).toBe(true);
    const data = next.data as { question_id: string; capability_token: string };
    expect(typeof data.capability_token).toBe('string');

    const commit = runTargetCli([
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data.capability_token,
      '--question',
      data.question_id,
      '--answer',
      'Job, Config là hai thực thể lõi.',
    ]);
    expect(commit.ok).toBe(true);
    expect(commit.reason_code).toBe('DEEPEN_COMMIT_SUCCESS');

    // Token replay must be denied, not silently re-accepted.
    const replay = runTargetCli([
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data.capability_token,
      '--question',
      data.question_id,
      '--answer',
      'Trying to reuse the same token.',
    ]);
    expect(replay.ok).toBe(false);
  });
});
