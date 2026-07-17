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
const testWorkspaceRoot = join(__dirname, '../../test/fixtures/progress/e2e-web-workspace');
const progressPath = join(testWorkspaceRoot, 'progress.json');
const docsDir = join(testWorkspaceRoot, 'docs');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');

describe('E2E Web Interview & Gating Flow', () => {
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

  test('should run full web phỏng vấn flow, block code before docs are emitted, and allow code after docs are emitted', () => {
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
      S0: 'RecipeShare web app giúp chia sẻ công thức nấu ăn',
      S1: 'Nỗi đau là khó tìm công thức cũ trong chat; giải quyết tạm bằng notepad.',
      S2: 'My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ.',
      S3: 'Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List.',
      S4: 'User, Recipe, ShoppingList',
      S5: 'Mở web -> xem công thức -> chọn món -> tích nguyên liệu',
      S6: 'Solo, 3 tuần',
      S7: 'web',
      S8: 'Chỉ email đăng nhập, không có dữ liệu thanh toán; vài trăm người dùng năm đầu.',
      W1: 'Next.js SSR cho SEO',
      W2: 'Responsive mobile-first',
      W3: 'Triển khai lên Vercel',
      W4: 'NextAuth Google OAuth',
      W5: 'Không realtime ở MVP',
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
        commitOpts.branchChoice = 'web';
      }
      progress = commitStep(progress, script, commitOpts);
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('R1');

    // Commit R1
    const r1PromptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-core-R1' });
    expect(r1PromptResult.decision).toBe('allow');

    progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-core-R1' });
    saveProgress(progressPath, progress);

    // S8 — yêu cầu phi chức năng (dữ liệu nhạy cảm + quy mô), câu lõi cuối trước khi rẽ nhánh.
    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('S8');

    // onUserPromptSubmit đóng dấu lượt và GHI progress; phải load lại sau nó,
    // nếu không commit sẽ ghi đè mất dấu và lượt kế bị rate-limit chặn oan.
    const s8PromptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-core-S8' });
    expect(s8PromptResult.decision).toBe('allow');

    progress = loadProgress(progressPath);
    progress = commitStep(progress, script, { userTurnId: 'turn-core-S8' });
    saveProgress(progressPath, progress);

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBe('W1');

    // --- PHASE 3: Gating verification (while gate is closed) ---
    // Try writing to src/index.ts -> must be blocked by scope-locked gate
    const preToolResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
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

    // --- PHASE 4: W1 -> W5 phỏng vấn ---
    const webSteps = ['W1', 'W2', 'W3', 'W4', 'W5'];
    for (let i = 0; i < webSteps.length; i++) {
      const step = webSteps[i];
      const turnId = `turn-web-${step}`;

      const promptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: turnId });
      expect(promptResult.decision).toBe('allow');
      expect(promptResult.injectedContext).toContain(`ID câu hỏi: ${step}`);

      progress = loadProgress(progressPath);
      progress = commitStep(progress, script, { userTurnId: turnId });
      saveProgress(progressPath, progress);
    }

    progress = loadProgress(progressPath);
    expect(progress.current_step).toBeNull();
    expect(progress.phase).toBe('docs-emitted');

    // --- PHASE 5: Docs Scaffolding / Emission ---
    const emittedDocs = emitTree(answers, 'web', realTemplatesDir);
    expect(emittedDocs).toHaveLength(13);

    // Write emitted docs to docs/ folder
    mkdirSync(docsDir, { recursive: true });
    for (const doc of emittedDocs) {
      const filePath = join(docsDir, doc.file);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, doc.content, 'utf8');
    }

    // --- PHASE 6: Gating verification (after gate is open) ---
    // Try writing to src/index.ts -> must be allowed now
    const postToolResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(postToolResult.decision).toBe('allow');

    // Verify gates_passed contains scope-locked
    progress = loadProgress(progressPath);
    expect(progress.gates_passed).toContain('scope-locked');

    // --- PHASE 7: Rate-limit checking ---
    // Manually push to answered to simulate double commit bypass attempt
    progress.answered.push('ExtraStep');
    saveProgress(progressPath, progress);

    // Call submit prompt on same turn or next turn without stamping -> block
    const promptViolatedResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-violation' });
    expect(promptViolatedResult.decision).toBe('block');
    expect(promptViolatedResult.message).toContain('Rate limit violation');
  });
});
