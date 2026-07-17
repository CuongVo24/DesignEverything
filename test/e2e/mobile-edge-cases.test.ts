import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onSessionStart } from '../../src/adapters/claude/sessionStart.js';
import { onUserPromptSubmit } from '../../src/adapters/claude/userPromptSubmit.js';
import { onPreToolUse } from '../../src/adapters/claude/preToolUse.js';
import { loadProgress, saveProgress, loadScript, commitStep, stampTurn, emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const testWorkspaceRoot = join(__dirname, '../../test/fixtures/progress/e2e-mobile-edge-workspace');
const progressPath = join(testWorkspaceRoot, 'progress.json');
const docsDir = join(testWorkspaceRoot, 'docs');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');

describe('E2E Mobile Edge Cases Flow', () => {
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

  test('Case (a): Trả lời lan man chưa xác nhận ở Mobile -> state đứng yên', () => {
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);

    const result1 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-m-1' });
    expect(result1.decision).toBe('allow');

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);
  });

  test('Case (b): Cố đổi nhánh sang web sau S7 -> bị chặn throw error', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);

    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    for (const step of steps) {
      const turnId = `turn-m-edge-${step}`;
      onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      progress = loadProgress(progressPath);

      const opts: { userTurnId: string; branchChoice?: string } = { userTurnId: turnId };
      if (step === 'S7') {
        opts.branchChoice = 'mobile';
      }
      progress = commitStep(progress, script, opts);
      saveProgress(progressPath, progress);

      progress = loadProgress(progressPath);
      progress = stampTurn(progress, progress.answered.length);
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.branch).toBe('mobile');
    expect(progress.current_step).toBe('R1');

    // Attempt to change branch
    expect(() => {
      commitStep(progress, script, { userTurnId: 'turn-m-wrong', branchChoice: 'web' });
    }).toThrow('Cannot change branch once set. Current: mobile, New: web');
  });

  test('Case (c): Gating edge cases - thiếu/đủ/thừa doc và emit anchor check', () => {
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    const progress = loadProgress(progressPath);

    // Fast-forward progress to docs-emitted phase
    progress.phase = 'docs-emitted';
    progress.branch = 'mobile';
    progress.current_step = null;
    progress.answered = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'M1', 'M2', 'M3', 'M4', 'M5'];
    saveProgress(progressPath, progress);

    // 1. Missing docs (only write 00-vision and 01-personas, missing 02-scope)
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, '00-vision.md'), '# Vision\n<!-- anchor: id=00-vision/elevator-pitch status=planned -->', 'utf8');
    writeFileSync(join(docsDir, '01-personas.md'), '# Personas\n<!-- anchor: id=01-personas/primary-persona status=planned -->', 'utf8');

    // Pre-tool use check -> must deny writing code since scope-locked requires 02-scope.md
    const denyResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'apps/mobile/src/index.ts' },
    });
    expect(denyResult.decision).toBe('deny');

    // 2. Extra doc (outside taxonomy, like 08-unknown.md) should not open gate incorrectly
    writeFileSync(join(docsDir, '08-unknown.md'), '# Unknown\n<!-- anchor: id=08-unknown/test status=planned -->', 'utf8');
    const denyResultWithExtra = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'apps/mobile/src/index.ts' },
    });
    expect(denyResultWithExtra.decision).toBe('deny');

    // 3. Write missing 02-scope.md -> must now allow writing code
    writeFileSync(join(docsDir, '02-scope.md'), '# Scope\n<!-- anchor: id=02-scope/must-have status=planned -->', 'utf8');
    const allowResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'apps/mobile/src/index.ts' },
    });
    expect(allowResult.decision).toBe('allow');

    // 4. Emit tree checks for Mobile
    const answers: Record<string, string> = {
      CAL0: 'Fast', S0: 'A', S1: 'B', S2: 'C', S3: 'D', S4: 'E', S5: 'F', S6: 'Solo', S7: 'mobile',
      M1: 'RN', M2: 'Offline', M3: 'Camera', M4: 'FCM', M5: 'Store'
    };
    const emittedDocs = emitTree(answers, 'mobile', realTemplatesDir);
    const docFilesOnly = emittedDocs.filter(d => !d.file.startsWith('.design-everything/'));
    expect(docFilesOnly).toHaveLength(12);

    const fileNames = docFilesOnly.map(d => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).not.toContain('07-deployment.md');

    // Verify all emitted docs have status=planned and correct mobile source path prefix
    for (const doc of docFilesOnly) {
      expect(doc.content).toContain('status=planned');
      if (doc.file !== 'README.md') {
        expect(doc.content).toContain('src=apps/mobile/src/');
      }
    }
  });

  test('Case (d): Double-commit and duplicate turnId edge cases', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    let progress = loadProgress(progressPath);

    // Answer CAL0
    onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-dup-1' });
    progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-dup-1' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S0');

    expect(() => {
      commitStep(progress, script, { userTurnId: 'turn-dup-1' });
    }).toThrow('Duplicate commit');
  });
});
