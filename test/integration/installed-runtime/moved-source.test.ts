import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, cpSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');
const CODEX_INSTALLER = join(REPO_ROOT, 'adapter/codex-plugin/install.mjs');

function assertNoDevRepoPaths(root: string) {
  const forbidden = [REPO_ROOT.replace(/\\/g, '/'), REPO_ROOT];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        walk(p);
      } else {
        const content = readFileSync(p, 'utf8');
        for (const bad of forbidden) {
          expect(content.includes(bad)).toBe(false);
        }
      }
    }
  }
  walk(root);
}

describe('moved-source — an installed target is byte-scannable free of the dev checkout and survives being relocated', () => {
  let originalTarget: string;
  let movedTarget: string;

  afterEach(() => {
    for (const dir of [originalTarget, movedTarget]) {
      if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Claude install: no absolute dev-repo path anywhere in the installed tree, and it still runs after being copied to a second directory', () => {
    originalTarget = join(tmpdir(), `de-moved-source-claude-orig-${Date.now()}`);
    movedTarget = join(tmpdir(), `de-moved-source-claude-copy-${Date.now()}`);
    mkdirSync(originalTarget, { recursive: true });

    execFileSync('node', [CLAUDE_INSTALLER, originalTarget], { encoding: 'utf8' });
    assertNoDevRepoPaths(originalTarget);

    // Copying the ENTIRE installed tree to a brand-new location and running
    // from there (no re-install, no re-pointing of anything) is the honest
    // equivalent of "the source checkout it was installed from is gone" —
    // if anything inside still hardcoded originalTarget or REPO_ROOT, this
    // would fail to resolve.
    cpSync(originalTarget, movedTarget, { recursive: true });
    rmSync(originalTarget, { recursive: true, force: true });

    const runtimeDir = join(movedTarget, '.design-everything/runtime');
    const version = readdirSync(runtimeDir).sort().pop()!;
    const cliPath = join(runtimeDir, version, 'cli.mjs');

    const statusRun = spawnSync('node', [cliPath, 'status', '--json'], { cwd: movedTarget, encoding: 'utf8' });
    const result = JSON.parse(statusRun.stdout);
    expect(result.runtime_version).toBe('6.0.0');
    expect(typeof result.ok).toBe('boolean');

    // Force a deterministic "deny" (interview phase, Write outside scope) so
    // the hook is guaranteed to emit a JSON envelope rather than the silent
    // exit-0/no-output "implicit allow" it uses for in-scope actions.
    writeFileSync(
      join(movedTarget, 'progress.json'),
      JSON.stringify({
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
      }),
      'utf8'
    );
    const hookPath = join(runtimeDir, version, 'hooks/pre-tool-use.mjs');
    const hookRaw = execFileSync('node', [hookPath], {
      cwd: movedTarget,
      input: JSON.stringify({ cwd: movedTarget, tool_name: 'Write', tool_input: { file_path: join(movedTarget, 'src/index.ts') } }),
      encoding: 'utf8',
    });
    const hookResult = JSON.parse(hookRaw);
    expect(hookResult.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('Codex install: no absolute dev-repo path anywhere in the installed plugin tree, and it still runs after being copied to a second directory', () => {
    originalTarget = join(tmpdir(), `de-moved-source-codex-orig-${Date.now()}`);
    movedTarget = join(tmpdir(), `de-moved-source-codex-copy-${Date.now()}`);
    mkdirSync(originalTarget, { recursive: true });

    execFileSync('node', [CODEX_INSTALLER, originalTarget], { encoding: 'utf8' });
    assertNoDevRepoPaths(originalTarget);

    cpSync(originalTarget, movedTarget, { recursive: true });
    rmSync(originalTarget, { recursive: true, force: true });

    const workspace = join(tmpdir(), `de-moved-source-codex-ws-${Date.now()}`);
    mkdirSync(workspace, { recursive: true });
    try {
      const raw = execFileSync('node', [join(movedTarget, 'cli.mjs'), 'status', '--json'], {
        cwd: workspace,
        encoding: 'utf8',
      });
      const result = JSON.parse(raw);
      expect(result.runtime_version).toBe('6.0.0');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
