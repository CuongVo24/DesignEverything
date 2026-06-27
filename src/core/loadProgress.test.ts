import { expect, test, describe, afterAll } from 'vitest';
import { loadProgress, saveProgress } from './loadProgress.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tempJsonPath = join(__dirname, '../../test/fixtures/progress/temp-test-progress.json');

describe('loadProgress & saveProgress', () => {
  afterAll(() => {
    try {
      unlinkSync(tempJsonPath);
    } catch {
      // Ignore
    }
  });

  test('should successfully load valid progress fixtures', () => {
    const initPath = join(__dirname, '../../test/fixtures/progress/init-s0.json');
    const progress = loadProgress(initPath);
    expect(progress.version).toBe('0.1.0');
    expect(progress.phase).toBe('interview');
    expect(progress.current_step).toBe('S0');
    expect(progress.answered.length).toBe(0);

    const midPath = join(__dirname, '../../test/fixtures/progress/mid-web.json');
    const midProgress = loadProgress(midPath);
    expect(midProgress.current_step).toBe('W2');
    expect(midProgress.branch).toBe('web');
  });

  test('should auto-initialize to S0 default state when file does not exist', () => {
    if (existsSync(tempJsonPath)) {
      unlinkSync(tempJsonPath);
    }
    const defaultProgress = loadProgress(tempJsonPath);
    expect(defaultProgress.version).toBe('0.1.0');
    expect(defaultProgress.phase).toBe('interview');
    expect(defaultProgress.branch).toBeNull();
    expect(defaultProgress.current_step).toBe('S0');
    expect(defaultProgress.answered.length).toBe(0);
    expect(defaultProgress.answered_len_at_last_turn).toBe(0);
  });

  test('should throw Zod error when loading invalid progress templates', () => {
    const invalidDir = join(__dirname, '../../test/fixtures/progress/invalid');
    const missingFieldPath = join(invalidDir, 'missing-field.json');
    const invalidBranchPath = join(invalidDir, 'invalid-branch.json');

    expect(() => loadProgress(missingFieldPath)).toThrow(/Invalid progress schema/);
    expect(() => loadProgress(invalidBranchPath)).toThrow(/Invalid progress schema/);
  });

  test('should successfully save valid progress and fail saving invalid progress', () => {
    const initPath = join(__dirname, '../../test/fixtures/progress/init-s0.json');
    const progress = loadProgress(initPath);

    // Save valid progress
    progress.answered.push('S0');
    progress.answered_len_at_last_turn = 1;
    saveProgress(tempJsonPath, progress);

    const reloaded = loadProgress(tempJsonPath);
    expect(reloaded.answered).toContain('S0');
    expect(reloaded.answered_len_at_last_turn).toBe(1);

    // Try saving invalid progress (should throw)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidProgress = { ...progress, phase: 'invalid-phase' as any };
    expect(() => saveProgress(tempJsonPath, invalidProgress)).toThrow(/Cannot save invalid progress state/);
  });
});
