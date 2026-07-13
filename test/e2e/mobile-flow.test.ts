import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onSessionStart } from '../../src/adapters/claude/sessionStart.js';
import { onUserPromptSubmit } from '../../src/adapters/claude/userPromptSubmit.js';
import { onPreToolUse } from '../../src/adapters/claude/preToolUse.js';
import { loadProgress, saveProgress, loadScript, commitStep, emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const testWorkspaceRoot = join(__dirname, '../../test/fixtures/progress/e2e-mobile-workspace');
const progressPath = join(testWorkspaceRoot, 'progress.json');
const docsDir = join(testWorkspaceRoot, 'docs');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');

describe('E2E Mobile Interview & Gating Flow', () => {
  beforeEach(() => {
    // 1. Recreate clean workspace directory
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }

    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });

    // 2. Copy script and policy files
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

  test('should run full mobile phỏng vấn flow, block code before docs are emitted, and allow code after docs are emitted', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // --- PHASE 1: SessionStart ---
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    expect(existsSync(progressPath)).toBe(true);

    let progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.phase).toBe('interview');

    // --- PHASE 2: CAL0 -> S7 phỏng vấn ---
    const answers: Record<string, string> = {
      CAL0: 'Giải thích tối giản',
      S0: 'RecipeShare mobile app giúp chia sẻ công thức nấu ăn',
      S1: 'Nỗi đau là khó tìm công thức cũ trong chat; giải quyết tạm bằng notepad.',
      S2: 'My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ.',
      S3: 'Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List.',
      S4: 'User, Recipe, ShoppingList',
      S5: 'Mở app -> xem công thức -> chọn món -> tích nguyên liệu',
      S6: 'Solo, 3 tuần',
      S7: 'mobile',
      M1: 'React Native cross-platform',
      M2: 'Offline-first với SQLite sync',
      M3: 'Camera và Photo Library access',
      M4: 'FCM push notifications',
      M5: 'TestFlight beta trước, thu phí IAP',
    };

    const coreSteps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    for (let i = 0; i < coreSteps.length; i++) {
      const step = coreSteps[i];
      const turnId = `turn-core-${step}`;

      // Submit prompt check
      const promptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      expect(promptResult.decision).toBe('allow');
      expect(promptResult.injectedContext).toContain(`ID câu hỏi: ${step}`);

      // Skill commits the step
      progress = loadProgress(progressPath);
      const commitOpts: { userTurnId: string; branchChoice?: string } = { userTurnId: turnId };
      if (step === 'S7') {
        commitOpts.branchChoice = 'mobile';
      }
      progress = commitStep(progress, script, commitOpts);
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.branch).toBe('mobile');
    expect(progress.current_step).toBe('R1');

    // Commit R1
    const r1PromptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-core-R1' });
    expect(r1PromptResult.decision).toBe('allow');

    progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-core-R1' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('M1');

    // --- PHASE 3: Gating verification (while gate is closed) ---
    // Try writing to apps/mobile/src/index.ts -> must be blocked by scope-locked gate
    const preToolResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'apps/mobile/src/index.ts' },
    });
    expect(preToolResult.decision).toBe('deny');
    expect(preToolResult.message).toContain('Phỏng vấn chưa xong tới S3 (scope). Hoàn tất doc trước khi sinh code.');

    // Try running npm install -> must be blocked
    const preToolBashResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'npm install' },
    });
    expect(preToolBashResult.decision).toBe('deny');

    // Document writing is allowed
    const preToolDocResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'docs/02-scope.md' },
    });
    expect(preToolDocResult.decision).toBe('allow');

    // --- PHASE 4: M1 -> M5 phỏng vấn ---
    const mobileSteps = ['M1', 'M2', 'M3', 'M4', 'M5'];
    for (let i = 0; i < mobileSteps.length; i++) {
      const step = mobileSteps[i];
      const turnId = `turn-mobile-${step}`;

      const promptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      expect(promptResult.decision).toBe('allow');
      expect(promptResult.injectedContext).toContain(`ID câu hỏi: ${step}`);

      if (step === 'M2') {
        expect(promptResult.injectedContext).toContain('[CẢNH BÁO]');
        expect(promptResult.injectedContext).toContain('offline');
      }
      if (step === 'M5') {
        expect(promptResult.injectedContext).toContain('[CẢNH BÁO]');
        expect(promptResult.injectedContext).toContain('store');
      }

      progress = loadProgress(progressPath);
      progress = commitStep(progress, script, { userTurnId: turnId });
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBeNull();
    expect(progress.phase).toBe('docs-emitted');

    // --- PHASE 5: Docs Scaffolding / Emission ---
    const emittedDocs = emitTree(answers, 'mobile', realTemplatesDir);
    expect(emittedDocs).toHaveLength(10);

    const fileNames = emittedDocs.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).not.toContain('07-deployment.md');

    // Write emitted docs to docs/ folder
    mkdirSync(docsDir, { recursive: true });
    for (const doc of emittedDocs) {
      const filePath = join(docsDir, doc.file);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, doc.content, 'utf8');
    }

    // Verify anchor prefixes start with apps/mobile/src/
    const visionDoc = emittedDocs.find((d) => d.file === '00-vision.md');
    expect(visionDoc).toBeDefined();
    expect(visionDoc!.content).toContain('src=apps/mobile/src/features/vision/vision.ts::projectVision');

    // --- PHASE 6: Gating verification (after gate is open) ---
    // Try writing to apps/mobile/src/index.ts -> must be allowed now
    const postToolResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'apps/mobile/src/index.ts' },
    });
    expect(postToolResult.decision).toBe('allow');

    // Verify gates_passed contains scope-locked
    progress = loadProgress(progressPath);
    expect(progress.gates_passed).toContain('scope-locked');
  });
});
