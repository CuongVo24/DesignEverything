import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onUserPromptSubmit } from './userPromptSubmit.js';
import { loadProgress } from '../../core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We also need to make sure Design/Content/interview-script/script.yaml exists relative to workspaceRoot.
// Since vitest runs in e:\DesignEverything, the workspace root contains Design/Content/interview-script/script.yaml.
// We can use the project root e:\DesignEverything as ctx.workspaceRoot for loader testing, or we can copy/mock if needed.
// Wait, the project root e:\DesignEverything already contains:
// - Design/Content/interview-script/script.yaml
// - Design/Content/interview-script/gate-policy.yaml
// So if we setctx.workspaceRoot to e:\DesignEverything, we can use a temporary progress.json at e:\DesignEverything\progress.json
// and clean it up. That is very robust and uses actual script files!
// Let's do that:
const projectRoot = join(__dirname, '../../..');
const projectProgressPath = join(projectRoot, 'progress.json');

describe('onUserPromptSubmit hook', () => {
  beforeEach(() => {
    // Ensure no progress.json in projectRoot
    try {
      if (existsSync(projectProgressPath)) {
        unlinkSync(projectProgressPath);
      }
    } catch {
      // Ignore
    }
  });

  afterEach(() => {
    try {
      if (existsSync(projectProgressPath)) {
        unlinkSync(projectProgressPath);
      }
    } catch {
      // Ignore
    }
  });

  test('should allow turn, stampanswered_len_at_last_turn, and inject S3 question details when current_step is S3', () => {
    const mockState = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-2',
      answered_len_at_last_turn: 2, // grew by 1 in previous turn, which is allowed
      updated_at: new Date().toISOString(),
    };
    writeFileSync(projectProgressPath, JSON.stringify(mockState, null, 2), 'utf8');

    const result = onUserPromptSubmit({ workspaceRoot: projectRoot, userTurnId: 'turn-3' });

    expect(result.decision).toBe('allow');
    expect(result.injectedContext).toBeDefined();
    expect(result.injectedContext).toContain('ID câu hỏi: S3');
    expect(result.injectedContext).toContain('Cứ kể lộn xộn những việc bạn muốn người dùng làm được');
    expect(result.injectedContext).toContain('Must / Should / Could / Won\'t');
    expect(result.injectedContext).toContain('4 Quy tắc vàng của phỏng vấn');

    // Verify progress.json is updated: answered_len_at_last_turn is stamped to answered.length (3)
    const updatedProgress = loadProgress(projectProgressPath);
    expect(updatedProgress.answered_len_at_last_turn).toBe(3);
    // answered should NOT change
    expect(updatedProgress.answered).toEqual(['S0', 'S1', 'S2']);
  });

  test('should block turn when rate limit is violated (answered length grew by 2 without stamping)', () => {
    const mockState = {
      version: '0.1.0',
      phase: 'interview',
      branch: null,
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 'turn-2',
      answered_len_at_last_turn: 1, // answered length (3) - answered_len_at_last_turn (1) = 2 > 1 (violation)
      updated_at: new Date().toISOString(),
    };
    writeFileSync(projectProgressPath, JSON.stringify(mockState, null, 2), 'utf8');

    const result = onUserPromptSubmit({ workspaceRoot: projectRoot, userTurnId: 'turn-3' });

    expect(result.decision).toBe('block');
    expect(result.message).toContain('Rate limit violation');

    // Verify progress.json was NOT modified
    const progress = loadProgress(projectProgressPath);
    expect(progress.answered_len_at_last_turn).toBe(1);
  });

  test('should allow turn but not inject context when current_step is null (interview complete)', () => {
    const mockState = {
      version: '0.1.0',
      phase: 'ready-to-build',
      branch: 'web',
      current_step: null,
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'W1', 'W2', 'W3', 'W4', 'W5'],
      emitted_docs: [
        '00-vision.md',
        '01-personas.md',
        '02-scope.md',
        '03-data-model.md',
        '04-flows.md',
        '05-architecture.md',
        '06-constraints.md',
        '07-deployment.md',
      ],
      gates_passed: ['scope-locked'],
      last_user_turn_id: 'turn-web-5',
      answered_len_at_last_turn: 12,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(projectProgressPath, JSON.stringify(mockState, null, 2), 'utf8');

    const result = onUserPromptSubmit({ workspaceRoot: projectRoot, userTurnId: 'turn-web-6' });

    expect(result.decision).toBe('allow');
    expect(result.injectedContext).toBeUndefined();

    // Verify progress.json was stamped
    const progress = loadProgress(projectProgressPath);
    expect(progress.answered_len_at_last_turn).toBe(12);
  });

  test('should return block when progress.json is missing or invalid', () => {
    // Missing file
    const resultMissing = onUserPromptSubmit({ workspaceRoot: projectRoot, userTurnId: 'turn-1' });
    expect(resultMissing.decision).toBe('block');
    expect(resultMissing.message).toContain('Failed to load progress state');

    // Invalid schema
    writeFileSync(projectProgressPath, JSON.stringify({ version: 'invalid' }), 'utf8');
    const resultInvalid = onUserPromptSubmit({ workspaceRoot: projectRoot, userTurnId: 'turn-1' });
    expect(resultInvalid.decision).toBe('block');
    expect(resultInvalid.message).toContain('Failed to load progress state');
  });
});
