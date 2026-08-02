import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

describe('installer-repair — rerunning the installer over an existing install heals it, never duplicates, never clobbers user config', () => {
  let tempTarget: string;

  beforeEach(() => {
    tempTarget = join(tmpdir(), `de-install-repair-${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempTarget)) {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  it('running the installer twice does not duplicate hook entries in settings.json', () => {
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const settings = JSON.parse(readFileSync(join(tempTarget, '.claude/settings.json'), 'utf8'));
    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].hooks).toHaveLength(1);
  });

  it('preserves a user-authored hook entry unrelated to DesignEverything across a rerun', () => {
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const settingsPath = join(tempTarget, '.claude/settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    settings.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: 'node "/some/other/users/custom-hook.mjs"' }],
    });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const after = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const commands = after.hooks.PreToolUse.flatMap((e: { hooks: { command: string }[] }) =>
      e.hooks.map((h) => h.command)
    );
    expect(commands).toContain('node "/some/other/users/custom-hook.mjs"');
    // And DesignEverything's own entry is still exactly one (repaired in
    // place, not duplicated) among the surviving entries.
    const deCommands = commands.filter((c: string) => c.includes('.design-everything/runtime/'));
    expect(deCommands).toHaveLength(1);
  });

  it('restores a tampered installed asset (bit-flip) to the correct bytes on rerun, after backing up the tampered copy', () => {
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(tempTarget, '.design-everything/install-manifest.json'), 'utf8')
    );
    const runtimeAsset = manifest.assets.find((a: { path: string }) => a.path.endsWith('runtime.mjs'));
    const runtimeLivePath = join(tempTarget, runtimeAsset.path);

    const original = readFileSync(runtimeLivePath, 'utf8');
    writeFileSync(runtimeLivePath, original + '\n// tampered\n', 'utf8');
    expect(readFileSync(runtimeLivePath, 'utf8')).not.toBe(original);

    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    expect(readFileSync(runtimeLivePath, 'utf8')).toBe(original);

    // The tampered bytes were backed up, not silently discarded.
    const backupsDir = join(tempTarget, '.design-everything/backups');
    const generations = readdirSync(backupsDir);
    const foundTamperedBackup = generations.some((gen: string) => {
      const backupPath = join(backupsDir, gen, runtimeAsset.path);
      return existsSync(backupPath) && readFileSync(backupPath, 'utf8').includes('// tampered');
    });
    expect(foundTamperedBackup).toBe(true);
  });

  it('replaces every stale versioned DesignEverything hook without changing a user hook', () => {
    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const settingsPath = join(tempTarget, '.claude/settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const staleVersion = '0.0.0-stale';
    const roleFiles = ['session-start.mjs', 'user-prompt-submit.mjs', 'pre-tool-use.mjs'];

    for (const entries of Object.values(settings.hooks) as { hooks: { command: string }[] }[][]) {
      for (const entry of entries) {
        for (const hook of entry.hooks ?? []) {
          if (roleFiles.some((file) => hook.command.includes(`/hooks/${file}`))) {
            hook.command = hook.command.replace(/\.design-everything\/runtime\/[^"']+/, `.design-everything/runtime/${staleVersion}`);
          }
        }
      }
    }

    const userHook = 'node "/some/other/users/custom-hook.mjs" --preserve-this-byte-sequence';
    settings.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: userHook }],
    });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

    execFileSync('node', [CLAUDE_INSTALLER, tempTarget], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(tempTarget, '.design-everything/install-manifest.json'), 'utf8')
    );
    const after = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const hookGroups = Object.values(after.hooks) as Array<
      Array<{ hooks?: Array<{ command: string }> }>
    >;
    const commands = hookGroups
      .flatMap((entries) => entries)
      .flatMap((entry) => entry.hooks ?? [])
      .map((hook) => hook.command);

    for (const file of roleFiles) {
      const matching = commands.filter((command: string) => command.includes(`/hooks/${file}`));
      expect(matching).toHaveLength(1);
      expect(matching[0]).toContain(`.design-everything/runtime/${manifest.runtime_version}/hooks/${file}`);
      expect(matching[0]).not.toContain(staleVersion);
    }
    expect(commands).toContain(userHook);
  });
});
