import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, execFileSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

describe('B5a — Claude Installed Runtime Integration Flow', () => {
  let tempTarget: string;

  beforeEach(() => {
    // Install target with spaces to test path robustness
    tempTarget = join(tmpdir(), `de install target ${Date.now()}`);
    mkdirSync(tempTarget, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempTarget)) {
      rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  it('should run installer and correctly wire settings.json, skills and content files in temp target', () => {
    const installOutput = execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });
    expect(installOutput).toContain('Đã cài DesignEverything');

    // Assert settings.json exists and has 3 hooks
    const settingsPath = join(tempTarget, '.claude/settings.json');
    expect(existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.UserPromptSubmit).toBeDefined();
    expect(settings.hooks.PreToolUse).toBeDefined();

    // Assert skills exist
    expect(existsSync(join(tempTarget, '.claude/skills/design-everything/SKILL.md'))).toBe(true);
    expect(existsSync(join(tempTarget, '.claude/skills/build/SKILL.md'))).toBe(true);

    // Assert content files exist
    expect(existsSync(join(tempTarget, 'Design/Content/interview-script/script.yaml'))).toBe(true);
    expect(existsSync(join(tempTarget, 'Design/Content/interview-script/gate-policy.yaml'))).toBe(true);
  });

  it('should execute installed PreToolUse hook via stdin payload and fail closed when project has active interview phase', () => {
    execFileSync('node', [INSTALLER, tempTarget], { encoding: 'utf8' });

    // Create progress.json in interview phase
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
    writeFileSync(join(tempTarget, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    // Run PreToolUse hook directly on a Write tool call targeting src/index.ts
    const hookPath = join(REPO_ROOT, 'adapter/claude-code/hooks/pre-tool-use.mjs');
    const inputPayload = JSON.stringify({
      cwd: tempTarget,
      tool_name: 'Write',
      tool_input: { file_path: join(tempTarget, 'src/index.ts') },
    });

    const resultRaw = execSync(`node "${hookPath}"`, {
      input: inputPayload,
      encoding: 'utf8',
      cwd: tempTarget,
    });

    const result = JSON.parse(resultRaw);
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('[DesignEverything gate]');
  });
});
