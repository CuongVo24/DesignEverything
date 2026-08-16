import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { RUNTIME_VERSION } from '../../../src/version.js';

const REPO_ROOT = join(__dirname, '../../..');
const CODEX_INSTALLER = join(REPO_ROOT, 'adapter/codex-plugin/install.mjs');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

function latestRuntimeDir(pluginRoot: string): string {
  const runtimeDir = join(pluginRoot, '.design-everything/runtime');
  const version = readdirSync(runtimeDir).sort().pop()!;
  return join(runtimeDir, version);
}

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

  it('installs a self-contained plugin bundle to an explicit target dir, never writing into the source tree', () => {
    const installOut = execFileSync('node', [CODEX_INSTALLER, tmpDir], { encoding: 'utf8' });
    expect(installOut).toContain('Đã cài DesignEverything Codex plugin');

    expect(existsSync(join(tmpDir, '.codex-plugin/plugin.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'hooks/hooks.json'))).toBe(true);
    expect(existsSync(join(tmpDir, 'cli.mjs'))).toBe(true);
    const interviewSkillPath = join(tmpDir, 'skills/design-everything/SKILL.md');
    expect(existsSync(interviewSkillPath)).toBe(true);
    const interviewSkill = readFileSync(interviewSkillPath, 'utf8');
    expect(interviewSkill).toContain('name: design-everything');
    expect(interviewSkill).toContain('${PLUGIN_ROOT}/cli.mjs');
    expect(interviewSkill).not.toContain('__ENGINE_ROOT__');
    expect(existsSync(join(tmpDir, '.design-everything/install-manifest.json'))).toBe(true);
    expect(interviewSkill).toContain('text-only');
    expect(interviewSkill).toContain('deferred in 8.1.0');

    const runtimeDir = latestRuntimeDir(tmpDir);
    expect(existsSync(join(runtimeDir, 'runtime.mjs'))).toBe(true);
    expect(existsSync(join(runtimeDir, 'cli.mjs'))).toBe(true);
    expect(existsSync(join(runtimeDir, 'hooks/pre-tool-use.mjs'))).toBe(true);

    // The old installer bundled dist/+node_modules straight into
    // adapter/codex-plugin/ in the source checkout — assert that no longer
    // happens.
    expect(existsSync(join(REPO_ROOT, 'adapter/codex-plugin/dist'))).toBe(false);
    expect(existsSync(join(REPO_ROOT, 'adapter/codex-plugin/node_modules'))).toBe(false);

    const manifest = JSON.parse(readFileSync(join(tmpDir, '.design-everything/install-manifest.json'), 'utf8'));
    expect(manifest.adapter).toBe('codex');
    expect(manifest.runtime_version).toBe(RUNTIME_VERSION);
  });

  it('should execute status via the root cli.mjs redirector and produce the shared envelope', () => {
    execFileSync('node', [CODEX_INSTALLER, tmpDir], { encoding: 'utf8' });

    const workspace = join(tmpdir(), `de-codex-parity-ws-${Date.now()}`);
    mkdirSync(workspace, { recursive: true });
    try {
      const raw = execFileSync('node', [join(tmpDir, 'cli.mjs'), 'status', '--json'], {
        cwd: workspace,
        encoding: 'utf8',
      });

      const res = JSON.parse(raw);
      expect(res.ok).toBe(true);
      expect(res.operation).toBe('status');
      expect(res.reason_code).toBe('UNINVOLVED');
      expect(res.runtime_version).toBe(RUNTIME_VERSION);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('should not contain absolute dev repo paths anywhere in the installed plugin tree', () => {
    execFileSync('node', [CODEX_INSTALLER, tmpDir], { encoding: 'utf8' });

    const forbidden = [REPO_ROOT.replace(/\\/g, '/'), REPO_ROOT.replace(/\//g, '\\')];

    function walk(dir: string) {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) {
          walk(p);
        } else {
          const content = readFileSync(p, 'utf8');
          for (const bad of forbidden) {
            expect(content.includes(bad)).toBe(false);
          }
        }
      }
    }

    // install-manifest.json legitimately records target_root (tmpDir itself,
    // not the dev repo) — everything else must be free of the source path.
    walk(tmpDir);
  });

  it('Claude and Codex installs of the same version replay an identical PreToolUse decision for the same fixture', () => {
    const claudeTarget = join(tmpdir(), `de-parity-claude-${Date.now()}`);
    const codexTarget = join(tmpdir(), `de-parity-codex-${Date.now()}`);
    mkdirSync(claudeTarget, { recursive: true });
    try {
      execFileSync('node', [CLAUDE_INSTALLER, claudeTarget], { encoding: 'utf8' });
      execFileSync('node', [CODEX_INSTALLER, codexTarget], { encoding: 'utf8' });

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
      writeFileSync(join(claudeTarget, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

      const claudeHook = join(latestRuntimeDir(claudeTarget), 'hooks/pre-tool-use.mjs');
      const claudePayload = JSON.stringify({
        cwd: claudeTarget,
        tool_name: 'Write',
        tool_input: { file_path: join(claudeTarget, 'src/index.ts') },
      });
      const claudeRaw = execFileSync('node', [claudeHook], { input: claudePayload, encoding: 'utf8' });
      const claudeDecision = JSON.parse(claudeRaw);

      const codexWorkspace = join(tmpdir(), `de-parity-codex-ws-${Date.now()}`);
      mkdirSync(codexWorkspace, { recursive: true });
      writeFileSync(join(codexWorkspace, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');
      try {
        const codexHook = join(latestRuntimeDir(codexTarget), 'hooks/pre-tool-use.mjs');
        const codexPayload = JSON.stringify({
          cwd: codexWorkspace,
          tool_name: 'Write',
          tool_input: { path: join(codexWorkspace, 'src/index.ts') },
        });
        const codexRaw = execFileSync('node', [codexHook], { input: codexPayload, encoding: 'utf8' });
        const codexDecision = JSON.parse(codexRaw);

        expect(codexDecision.hookSpecificOutput.permissionDecision).toBe(
          claudeDecision.hookSpecificOutput.permissionDecision
        );
        expect(claudeDecision.hookSpecificOutput.permissionDecision).toBe('deny');
      } finally {
        rmSync(codexWorkspace, { recursive: true, force: true });
      }
    } finally {
      rmSync(claudeTarget, { recursive: true, force: true });
      rmSync(codexTarget, { recursive: true, force: true });
    }
  });
});
