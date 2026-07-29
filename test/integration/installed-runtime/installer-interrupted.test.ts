import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

describe('installer-interrupted — a crash mid-install never leaves a "half installed" target', () => {
  let tempTarget: string;

  beforeEach(() => {
    tempTarget = join(tmpdir(), `de-install-interrupted-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempTarget)) {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  const manifestPath = (target: string) => join(target, '.design-everything/install-manifest.json');

  for (const step of ['stage', 'promote', 'settings', 'health']) {
    it(`crashing right after step "${step}" leaves no install-manifest.json, and a clean rerun completes`, () => {
      const crashed = spawnSync('node', [CLAUDE_INSTALLER, tempTarget], {
        encoding: 'utf8',
        env: { ...process.env, DE_INSTALL_CRASH_AFTER: step },
      });
      expect(crashed.status).toBe(9);
      expect(existsSync(manifestPath(tempTarget))).toBe(false);

      const rerun = spawnSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });
      expect(rerun.status).toBe(0);
      expect(rerun.stdout).toContain('Đã cài DesignEverything');
      expect(existsSync(manifestPath(tempTarget))).toBe(true);

      // The rerun must have produced a fully working, healthy install — not
      // just a manifest file — by actually invoking the target-local CLI.
      const runtimeDir = join(tempTarget, '.design-everything/runtime');
      const version = readdirSync(runtimeDir).sort().pop()!;
      const statusRun = spawnSync('node', [join(runtimeDir, version, 'cli.mjs'), 'status', '--json'], {
        cwd: tempTarget,
        encoding: 'utf8',
      });
      const result = JSON.parse(statusRun.stdout);
      expect(typeof result.ok).toBe('boolean');
      expect(result.runtime_version).toBe('6.0.0');
    });
  }

  it('leaves no leftover .design-everything/staging/ directories after a successful (non-crashed) install', () => {
    const result = spawnSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    const stagingRoot = join(tempTarget, '.design-everything/staging');
    expect(existsSync(stagingRoot) ? readdirSync(stagingRoot).length : 0).toBe(0);
  });
});
