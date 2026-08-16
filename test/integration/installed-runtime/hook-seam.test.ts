import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: string;
    permissionDecisionReason?: string;
  };
}

/**
 * H5 (v8-hotfix) — every existing gate test in this repo
 * (evaluatePreAction.test.ts, artifactOwnership.test.ts, classifyCliSubcommand
 * test, etc.) calls Core's TypeScript functions in-process. That proves
 * Core's policy is correct but never proves the real .mjs hook script Claude
 * Code actually spawns passes Core's decision through unmodified — the first
 * real field session against 8.1 broke exactly at that boundary: a fresh
 * install's own `init` command was denied by the hook, and a PowerShell write
 * sailed through completely ungated, while every in-process test stayed
 * green throughout. This file spawns the real installed
 * pre-tool-use.mjs/cli.mjs as child processes against a real install.mjs
 * output, the same way Claude Code itself invokes them — the seam where H1/
 * H2/H3 actually broke.
 */
describe('H5 — hook-seam: real installed hook processes at the Core<->host boundary', () => {
  function installFreshTarget(): { workspace: string; cliPath: string; preToolHook: string } {
    const workspace = join(tmpdir(), `de-hook-seam-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    mkdirSync(workspace, { recursive: true });
    execFileSync('node', [INSTALLER, workspace], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(workspace, '.design-everything/install-manifest.json'), 'utf8')
    );
    const version = manifest.runtime_version as string;
    const runtimeDir = join(workspace, '.design-everything/runtime', version);
    return {
      workspace,
      cliPath: join(runtimeDir, 'cli.mjs'),
      preToolHook: join(runtimeDir, 'hooks/pre-tool-use.mjs'),
    };
  }

  function runHook(preToolHook: string, cwd: string, payload: Record<string, unknown>): HookOutput | null {
    const raw = execFileSync('node', [preToolHook], { input: JSON.stringify(payload), encoding: 'utf8', cwd });
    return raw && raw.trim() ? (JSON.parse(raw) as HookOutput) : null;
  }

  // (a) — H1: the exact bootstrap deadlock. install.mjs has just produced a
  // real target (install-manifest.json exists, canonical store does not),
  // and the hook must not deny the one command whose whole purpose is
  // creating that store — Core's own error message for this exact state
  // names `init` as the safe_next_command.
  it('(a) init is not denied on the workspace install.mjs itself just produced', () => {
    const { workspace, cliPath, preToolHook } = installFreshTarget();
    try {
      expect(existsSync(join(workspace, '.design-everything/interview-state.json'))).toBe(false);

      const result = runHook(preToolHook, workspace, {
        cwd: workspace,
        tool_name: 'Bash',
        tool_input: { command: `node "${cliPath}" init --json` },
      });
      // pre-tool-use.mjs only emits a hookSpecificOutput block on deny; a
      // silent/empty stdout means the tool call was allowed through.
      expect(result).toBeNull();
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  describe('mid-interview (real canonical store, seeded via the real installed CLI)', () => {
    let workspace: string;
    let cliPath: string;
    let preToolHook: string;

    beforeAll(() => {
      ({ workspace, cliPath, preToolHook } = installFreshTarget());
      execFileSync('node', [cliPath, 'init', '--json'], { cwd: workspace, encoding: 'utf8' });
    });

    afterAll(() => {
      if (existsSync(workspace)) rmSync(workspace, { recursive: true, force: true });
    });

    // (b) — H3: a write-capable PowerShell command must be gated exactly
    // like the same command run through Bash, not sail through ungated
    // because the hook matcher/dispatch never saw the "PowerShell" tool.
    it('(b) a PowerShell write command is denied during interview', () => {
      const result = runHook(preToolHook, workspace, {
        cwd: workspace,
        tool_name: 'PowerShell',
        tool_input: { command: 'Set-Content -Path src/index.ts -Value "console.log(1)"' },
      });
      expect(result).not.toBeNull();
      expect(result!.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    // (c) — H2: the documented --slots-file staging path must actually be
    // writable, matching loadSlotsFile.ts's read-time containment check
    // (SLOTS_FILE_ROOT) instead of the two disjoint areas the write gate and
    // the read gate previously named.
    it('(c) writing the documented Design/.interview/slots-<qid>.json path is allowed', () => {
      const result = runHook(preToolHook, workspace, {
        cwd: workspace,
        tool_name: 'Write',
        tool_input: {
          file_path: 'Design/.interview/slots-CAL0.json',
          content: JSON.stringify({ some_slot: 'value' }),
        },
      });
      expect(result).toBeNull();
    });

    // Contrast case — proves (c) is a narrow exception for the documented
    // slots-file shape, not a general Design/.interview/ bypass: the
    // canonical answers file itself must still be protected.
    it('(c-contrast) writing Design/.interview/answers.json directly is still denied', () => {
      const result = runHook(preToolHook, workspace, {
        cwd: workspace,
        tool_name: 'Write',
        tool_input: { file_path: 'Design/.interview/answers.json', content: '{}' },
      });
      expect(result).not.toBeNull();
      expect(result!.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });
});
