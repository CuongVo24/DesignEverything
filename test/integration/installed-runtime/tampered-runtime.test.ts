import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

describe('tampered-runtime — DEBT3.2 end-to-end: a real install with a hand-tampered asset fails CLI status closed', () => {
  let tempTarget: string;

  afterEach(() => {
    if (existsSync(tempTarget)) {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  it('tampering the installed runtime.mjs bundle makes target-local `cli.mjs status --json` fail closed with exit 3', () => {
    tempTarget = join(tmpdir(), `de-tampered-runtime-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    // Create the canonical interview store so the ONLY health problem after
    // tampering is the tampered asset itself — otherwise a fresh install's
    // pre-existing MISSING_INTERVIEW_STORE (install manifest present, no
    // .design-everything/interview-state.json yet) would be issues[0] and
    // mask the reason_code this test is actually about. Since the P2.2a
    // canonical-store cutover, the legacy progress.json write below is not
    // by itself enough — inspectRuntimeHealth checks interview-state.json,
    // not progress.json, for this issue (runtimeHealth.ts's
    // hasCanonicalStore check).
    const runtimeDirForInit = join(tempTarget, '.design-everything/runtime');
    const versionForInit = readdirSync(runtimeDirForInit).sort().pop()!;
    execFileSync('node', [join(runtimeDirForInit, versionForInit, 'cli.mjs'), 'init'], {
      cwd: tempTarget,
      encoding: 'utf8',
    });

    // Legacy progress.json — kept for back-compat coverage alongside the
    // canonical store; no longer sufficient on its own (see above).
    writeFileSync(
      join(tempTarget, 'progress.json'),
      JSON.stringify(
        {
          version: '4.0.0',
          phase: 'ready-for-validation',
          branch: 'web',
          calibrate_mode: 'fast',
          current_step: null,
          answered: [],
          emitted_docs: [],
          gates_passed: [],
          last_user_turn_id: null,
          answered_len_at_last_turn: 0,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );

    const runtimeDir = join(tempTarget, '.design-everything/runtime');
    const version = readdirSync(runtimeDir).sort().pop()!;
    const cliPath = join(runtimeDir, version, 'cli.mjs');
    const runtimeMjsPath = join(runtimeDir, version, 'runtime.mjs');

    // Sanity: healthy right after a fresh install.
    const before = spawnSync('node', [cliPath, 'status', '--json'], { cwd: tempTarget, encoding: 'utf8' });
    expect(JSON.parse(before.stdout).reason_code).not.toBe('TAMPERED_RUNTIME_ASSET');

    // Bit-flip the installed bundle in place.
    const original = readFileSync(runtimeMjsPath, 'utf8');
    writeFileSync(runtimeMjsPath, original + '\n// tampered\n', 'utf8');

    const after = spawnSync('node', [cliPath, 'status', '--json'], { cwd: tempTarget, encoding: 'utf8' });
    const result = JSON.parse(after.stdout);
    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe('TAMPERED_RUNTIME_ASSET');
    expect(after.status).toBe(3);
  });

  it('`repair` degrades to REPAIR_PARTIAL instead of crashing when the runtime is tampered', () => {
    tempTarget = join(tmpdir(), `de-tampered-runtime-repair-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const runtimeDir = join(tempTarget, '.design-everything/runtime');
    const version = readdirSync(runtimeDir).sort().pop()!;
    const cliPath = join(runtimeDir, version, 'cli.mjs');
    const runtimeMjsPath = join(runtimeDir, version, 'runtime.mjs');

    const original = readFileSync(runtimeMjsPath, 'utf8');
    writeFileSync(runtimeMjsPath, original + '\n// tampered\n', 'utf8');

    const repairRun = spawnSync('node', [cliPath, 'repair', '--json'], { cwd: tempTarget, encoding: 'utf8' });
    expect(repairRun.status).not.toBe(null);
    const result = JSON.parse(repairRun.stdout);
    expect(result.reason_code).toBe('REPAIR_PARTIAL');
    expect(result.ok).toBe(false);
  });
});
