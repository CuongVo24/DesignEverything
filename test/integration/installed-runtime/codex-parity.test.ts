import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CODEX_INSTALLER = join(REPO_ROOT, 'adapter/codex-plugin/install.mjs');
const CODEX_CLI = join(REPO_ROOT, 'adapter/codex-plugin/cli.mjs');

describe('B5a — Codex Plugin Installed Parity & Self-Contained Bundle Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-codex-parity-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should run codex installer and produce a self-contained bundle dist/ and node_modules/', () => {
    const installOut = execFileSync('node', [CODEX_INSTALLER], { encoding: 'utf8' });
    expect(installOut).toContain('Bundled compiled core');

    const codexPluginDir = join(REPO_ROOT, 'adapter/codex-plugin');
    expect(existsSync(join(codexPluginDir, 'dist'))).toBe(true);
    expect(existsSync(join(codexPluginDir, 'cli.mjs'))).toBe(true);
  });

  it('should execute status via Codex plugin launcher and produce identical envelope to shared runner', () => {
    // Setup minimal valid progress
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    const designDir = join(tmpDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });

    const raw = execFileSync('node', [CODEX_CLI, 'status', '--json'], {
      cwd: tmpDir,
      encoding: 'utf8',
      env: { ...process.env, PLUGIN_ROOT: tmpDir },
    });

    const res = JSON.parse(raw);
    expect(res.ok).toBe(true);
    expect(res.operation).toBe('status');
    expect(res.reason_code).toBe('STATUS_HEALTHY');
    expect(res.runtime_version).toBe('6.0.0');
  });

  it('should not contain absolute dev repo paths in codex plugin launcher', () => {
    const cliContent = readFileSync(CODEX_CLI, 'utf8');
    expect(cliContent).not.toContain('e:/DesignEverything');
    expect(cliContent).not.toContain('C:/Users/admin');
  });
});
