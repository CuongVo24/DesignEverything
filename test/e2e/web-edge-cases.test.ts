import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onSessionStart } from '../../src/adapters/claude/sessionStart.js';
import { onUserPromptSubmit } from '../../src/adapters/claude/userPromptSubmit.js';
import { onPreToolUse } from '../../src/adapters/claude/preToolUse.js';
import { loadProgress, saveProgress, loadScript, commitStep, stampTurn, emitTree } from '../../src/core/index.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from 'fs';

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
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);

    // 2. User replies with a verbose message
    const result1 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-1' });
    expect(result1.decision).toBe('allow');

    // State DOES NOT advance because commitStep is not called (user has not confirmed the translate-back)
    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);

    // 3. User replies with another verbose message in the next turn
    const result2 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-2' });
    expect(result2.decision).toBe('allow');

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);
  });

  test('Case (b): Cố trả lời gộp nhiều câu/lượt -> chỉ commit 1 bước, rate limit chặn đứng nếu nhảy cóc', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session
    onSessionStart({ workspaceRoot: testWorkspaceRoot });

    // 2. User answers CAL0
    onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-1' });
    let progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-1' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');
    expect(progress.answered).toEqual(['CAL0']);

    // 3. Simulate bypass attempt: manually modifying progress.json to answer S0 and S1 without new turn stamp
    progress.answered.push('S0');
    progress.answered.push('S1');
    saveProgress(progressPath, progress);

    // 4. Next prompt submit must be BLOCKED because answered jumped by 2 since last turn stamp
    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-2' });
    expect(result.decision).toBe('block');
    expect(result.message).toContain('Rate limit violation');
  });

  test('Case (c): Đổi nhánh sau S7 -> không rollback ngầm, bảo vệ nhánh đã cam kết', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session and answer CAL0 -> S7
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);

    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    for (const step of steps) {
      const turnId = `turn-${step}`;
      onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      progress = loadProgress(progressPath);

      const opts: { userTurnId: string; branchChoice?: string } = { userTurnId: turnId };
      if (step === 'S7') {
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

  test('Case (d): Gating edge cases - thiếu/đủ/thừa doc và emit anchor check ở Web', () => {
    const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
    const docsDir = join(testWorkspaceRoot, 'docs');
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    const progress = loadProgress(progressPath);

    // Fast-forward progress to docs-emitted phase
    progress.phase = 'docs-emitted';
    progress.branch = 'web';
    progress.current_step = null;
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'W1', 'W2', 'W3', 'W4', 'W5'];
    saveProgress(progressPath, progress);

    // 1. Missing docs (only write 00-vision and 01-personas, missing 02-scope)
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, '00-vision.md'), '# Vision\n<!-- anchor: id=00-vision/elevator-pitch status=planned -->', 'utf8');
    writeFileSync(join(docsDir, '01-personas.md'), '# Personas\n<!-- anchor: id=01-personas/primary-persona status=planned -->', 'utf8');

    // Pre-tool use check -> must deny writing code since scope-locked requires 02-scope.md
    const denyResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(denyResult.decision).toBe('deny');

    // 2. Extra doc (outside taxonomy, like 08-unknown.md) should not open gate incorrectly
    writeFileSync(join(docsDir, '08-unknown.md'), '# Unknown\n<!-- anchor: id=08-unknown/test status=planned -->', 'utf8');
    const denyResultWithExtra = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(denyResultWithExtra.decision).toBe('deny');

    // 3. Write missing 02-scope.md -> must now allow writing code
    writeFileSync(join(docsDir, '02-scope.md'), '# Scope\n<!-- anchor: id=02-scope/must-have status=planned -->', 'utf8');
    const allowResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(allowResult.decision).toBe('allow');

    // 4. Emit tree checks for Web
    const answers: Record<string, string> = {
      CAL0: 'Fast', S0: 'A', S1: 'B', S2: 'C', S3: 'D', S4: 'E', S5: 'F', S6: 'Solo', S7: 'web',
      W1: 'Next', W2: 'CSS', W3: 'Vercel', W4: 'Auth', W5: 'NoRealtime'
    };
    const emittedDocs = emitTree(answers, 'web', realTemplatesDir);
    expect(emittedDocs).toHaveLength(9);

    const fileNames = emittedDocs.map(d => d.file);
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');

    // Verify all emitted docs have status=planned and correct web source path prefix (src/)
    for (const doc of emittedDocs) {
      expect(doc.content).toContain('status=planned');
      if (doc.file !== 'README.md') {
        expect(doc.content).toContain('src=src/');
      }
    }
  });

  test('Case (e): Double-commit and duplicate turnId edge cases ở Web', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);

    // Answer CAL0
    onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-dup-w-1' });
    progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-dup-w-1' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');

    expect(() => {
      commitStep(progress, script, { userTurnId: 'turn-dup-w-1' });
    }).toThrow('Duplicate commit');
  });
});

function dirname(path: string): string {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}
