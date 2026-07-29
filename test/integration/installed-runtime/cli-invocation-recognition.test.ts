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
 * A real, previously-undiscovered bug found while converting B5a's
 * adversarial suite onto the installed seam (X18): resolveCliInvocation's
 * isExactCliPath check was hardcoded to the dev-mode source-relative
 * literal "adapter/claude-code/cli.mjs". A real target-local install's own
 * SKILL.md teaches the agent to invoke an ABSOLUTE path
 * (.design-everything/runtime/<version>/cli.mjs) — every prior test of this
 * hook spawned it from REPO_ROOT with dev-mode-relative command text, so
 * nothing ever caught that the installed hook denied the exact command its
 * own installed docs teach, with INVALID_CLI_LAUNCHER, on every single CLI
 * invocation the agent would ever make. Fixed by computing the real
 * expected launcher path from the hook's own on-disk location
 * (_shared.mjs's resolveCliLauncherPath) and passing it through.
 */
describe('B5a/X18 — installed target recognizes its own real CLI launcher path', () => {
  let tempTarget: string;
  let cliPath: string;
  let hookPath: string;

  beforeAll(() => {
    tempTarget = join(tmpdir(), `de-cli-recognition-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
    execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(tempTarget, '.design-everything/install-manifest.json'), 'utf8')
    );
    const version = manifest.runtime_version as string;
    cliPath = join(tempTarget, '.design-everything/runtime', version, 'cli.mjs');
    hookPath = join(tempTarget, '.design-everything/runtime', version, 'hooks/pre-tool-use.mjs');

    execFileSync('node', [cliPath, 'init', '--json'], { cwd: tempTarget, encoding: 'utf8' });
  });

  afterAll(() => {
    if (existsSync(tempTarget)) rmSync(tempTarget, { recursive: true, force: true });
  });

  function runHook(payload: Record<string, unknown>): HookOutput | null {
    const raw = execFileSync('node', [hookPath], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      cwd: tempTarget,
    });
    return raw && raw.trim() ? (JSON.parse(raw) as HookOutput) : null;
  }

  it('an absolute, real target-local CLI invocation (exactly what installed SKILL.md teaches) is recognized as the CLI, not rejected as an invalid launcher', () => {
    const res = runHook({
      cwd: tempTarget,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" status --json` },
    });
    // Allow is a silent exit-0 (null result); the regression this guards
    // against returned a deny with reason_code INVALID_CLI_LAUNCHER instead.
    expect(res).toBeNull();
  });

  it('the same real absolute path with an unknown subcommand still denies via the real CLI-subcommand authority, not a launcher-path rejection', () => {
    const res = runHook({
      cwd: tempTarget,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" totally-not-a-real-subcommand` },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(res?.hookSpecificOutput.permissionDecisionReason).not.toContain('INVALID_CLI_LAUNCHER');
    expect(res?.hookSpecificOutput.permissionDecisionReason).toContain('totally-not-a-real-subcommand');
  });

  it('chaining a real operator onto the real absolute launcher path is still denied, not silently treated as a non-CLI command', () => {
    const res = runHook({
      cwd: tempTarget,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" status && rm -rf /` },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('an unrelated command targeting a completely different path is still not treated as a CLI invocation', () => {
    const res = runHook({
      cwd: tempTarget,
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(res?.hookSpecificOutput.permissionDecisionReason).toContain('unknown and cannot be proven read-only');
  });
});
