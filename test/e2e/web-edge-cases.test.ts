import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onSessionStart } from '../../src/adapters/claude/sessionStart.js';
import { onUserPromptSubmit } from '../../src/adapters/claude/userPromptSubmit.js';
import { loadProgress, saveProgress, loadScript, commitStep, stampTurn } from '../../src/core/index.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const testWorkspaceRoot = join(__dirname, '../../test/fixtures/progress/e2e-edge-workspace');
const progressPath = join(testWorkspaceRoot, 'progress.json');

describe('E2E Web Edge Cases Flow', () => {
  beforeEach(() => {
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/script.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml')
    );
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/gate-policy.yaml')
    );
  });

  afterEach(() => {
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
  });

  test('Case (a): Trả lời lan man chưa xác nhận -> state đứng yên', () => {
    // 1. Initialize session
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');
    expect(progress.answered).toHaveLength(0);

    // 2. User replies with a verbose message
    const result1 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-1' });
    expect(result1.decision).toBe('allow');

    // State DOES NOT advance because commitStep is not called (user has not confirmed the translate-back)
    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');
    expect(progress.answered).toHaveLength(0);

    // 3. User replies with another verbose message in the next turn
    const result2 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-2' });
    expect(result2.decision).toBe('allow');

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');
    expect(progress.answered).toHaveLength(0);
  });

  test('Case (b): Cố trả lời gộp nhiều câu/lượt -> chỉ commit 1 bước, rate limit chặn đứng nếu nhảy cóc', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session
    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    // 2. User answers S0
    onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-1' });
    let progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-1' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S1');
    expect(progress.answered).toEqual(['S0']);

    // 3. Simulate bypass attempt: manually modifying progress.json to answer S1 and S2 without new turn stamp
    progress.answered.push('S1');
    progress.answered.push('S2');
    saveProgress(progressPath, progress);

    // 4. Next prompt submit must be BLOCKED because answered jumped by 2 since last turn stamp
    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-2' });
    expect(result.decision).toBe('block');
    expect(result.message).toContain('Rate limit violation');
  });

  test('Case (c): Đổi nhánh sau S6 -> không rollback ngầm, bảo vệ nhánh đã cam kết', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session and answer S0 -> S6
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);

    const steps = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    for (const step of steps) {
      const turnId = `turn-${step}`;
      onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      progress = loadProgress(progressPath);

      const opts: { userTurnId: string; branchChoice?: 'web' | 'mobile' } = { userTurnId: turnId };
      if (step === 'S6') {
        opts.branchChoice = 'web';
      }
      progress = commitStep(progress, script, opts);
      saveProgress(progressPath, progress);

      // Stamp turn ID as normal CLI/skill interaction would do
      progress = loadProgress(progressPath);
      progress = stampTurn(progress, progress.answered.length);
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('W1');

    // 2. User/Skill tries to commit a step forcing mobile branch choice
    expect(() => {
      commitStep(progress, script, { userTurnId: 'turn-wrong', branchChoice: 'mobile' });
    }).toThrow('Cannot change branch once set. Current: web, New: mobile');

    // 3. Verify next step is still on web track and doesn't rollback
    progress = loadProgress(progressPath);
    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('W1');
  });
});

function dirname(path: string): string {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}
