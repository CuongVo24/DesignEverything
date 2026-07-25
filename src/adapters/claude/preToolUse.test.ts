import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onPreToolUse } from './preToolUse.js';
import { loadInterviewStore } from '../../core/index.js';
import { seedCanonicalProgress } from '../../../test/helpers/canonicalProgress.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');
const testWorkspaceRoot = join(__dirname, '../../../test/fixtures/progress/pre-tool-use-workspace');
const docsDir = join(testWorkspaceRoot, 'docs');

describe('onPreToolUse hook', () => {
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

  test('should deny code writing when gate is closed (missing doc S2/S3)', () => {
    // Create closed gate progress state
    seedCanonicalProgress(testWorkspaceRoot, { phase: 'interview', branch: null, current_step: 'S0' });

    // Create empty docs dir
    mkdirSync(docsDir, { recursive: true });

    // Try writing to source code outside doc area -> deny
    const result = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });

    expect(result.decision).toBe('deny');
    expect(result.message).toContain('Phỏng vấn chưa xong tới S3');

    // Try running build/install command -> deny
    const resultBash = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'npm install' },
    });
    expect(resultBash.decision).toBe('deny');
    expect(resultBash.message).toMatch(/Phỏng vấn chưa xong|cannot be proven read-only|unknown/);
  });

  test('should allow doc writing even when gate is closed', () => {
    seedCanonicalProgress(testWorkspaceRoot, { phase: 'interview', branch: null, current_step: 'S0' });
    mkdirSync(docsDir, { recursive: true });

    // Writing to docs/ area should be allowed
    const resultDocs = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'docs/02-scope.md' },
    });
    expect(resultDocs.decision).toBe('allow');

    // Writing to Design/ area should be allowed
    const resultDesign = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'Design/Content/taxonomy.md' },
    });
    expect(resultDesign.decision).toBe('allow');
  });

  test('should allow safe read-only Bash commands when gate is closed', () => {
    seedCanonicalProgress(testWorkspaceRoot, { phase: 'interview', branch: null, current_step: 'S0' });
    mkdirSync(docsDir, { recursive: true });

    // ls command -> allow
    const resultLs = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'ls docs/' },
    });
    expect(resultLs.decision).toBe('allow');

    // cat command -> allow
    const resultCat = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'cat docs/00-vision.md' },
    });
    expect(resultCat.decision).toBe('allow');

    // redirecting echo to source file -> deny
    const resultEchoRedirect = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'echo "hello" > src/index.ts' },
    });
    expect(resultEchoRedirect.decision).toBe('deny');
  });

  test('should allow code writing, updates gates_passed and opens gate when all required docs exist', () => {
    seedCanonicalProgress(testWorkspaceRoot, { phase: 'interview', branch: null, current_step: 'S0' });

    // Create docs dir and write all 3 required files
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, '00-vision.md'), 'Content', 'utf8');
    writeFileSync(join(docsDir, '01-personas.md'), 'Content', 'utf8');
    writeFileSync(join(docsDir, '02-scope.md'), 'Content', 'utf8');

    // Try writing to code area -> allow
    const result = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(result.decision).toBe('allow');

    // Verify canonical gates_passed now contains scope-locked
    const updated = loadInterviewStore(testWorkspaceRoot);
    expect(updated.payload.progress.gates_passed).toContain('scope-locked');
  });

  test('should deny path traversal and drives on Write/Edit tools', () => {
    // 1. Path traversal via relative parent dir
    const result1 = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: '../../outside.ts' },
    });
    expect(result1.decision).toBe('deny');
    expect(result1.message).toMatch(/outside the workspace root|path traversal/);

    // 2. Drive letter or absolute path on Windows/Unix
    const result2 = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'C:/Windows/System32/cmd.exe' },
    });
    expect(result2.decision).toBe('deny');
  });

  test('should deny disallowed Git commands', () => {
    const resultCheckout = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'git checkout main' },
    });
    expect(resultCheckout.decision).toBe('deny');
    expect(resultCheckout.message).toContain('Không được phép sử dụng lệnh git ghi sửa');

    const resultApply = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'git apply patch.diff' },
    });
    expect(resultApply.decision).toBe('deny');
  });

  test('should deny Bash commands with shell operators, separators, or inline interpreters', () => {
    const resultSeparator = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'npm install && node index.js' },
    });
    expect(resultSeparator.decision).toBe('deny');
    expect(resultSeparator.message).toContain('chứa ký tự shell đặc biệt hoặc inline interpreter');

    const resultRedirect = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'echo "test" > out.txt' },
    });
    expect(resultRedirect.decision).toBe('deny');

    const resultNodeEval = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Bash',
      toolInput: { command: 'node -e "console.log(1)"' },
    });
    expect(resultNodeEval.decision).toBe('deny');
  });

  test('should deny when execution-state.json is missing or corrupted outside interview phase', () => {
    // Phase is ready-to-build, but no execution-state.json exists
    seedCanonicalProgress(testWorkspaceRoot, { phase: 'ready-to-build', branch: 'web', current_step: null });

    // No execution-state.json file -> deny
    const resultMissing = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(resultMissing.decision).toBe('deny');
    expect(resultMissing.message).toContain('Thiếu tệp trạng thái thực thi');

    // Corrupted execution-state.json -> deny
    const execStatePath = join(testWorkspaceRoot, '.design-everything/execution-state.json');
    mkdirSync(dirname(execStatePath), { recursive: true });
    writeFileSync(execStatePath, 'invalid json data', 'utf8');

    const resultCorrupt = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(resultCorrupt.decision).toBe('deny');
    expect(resultCorrupt.message).toMatch(/Runtime state is broken|Tệp trạng thái thực thi bị lỗi/);
  });
});
