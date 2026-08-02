import { expect, test, describe, afterAll } from 'vitest';
import { loadProgress, saveProgress } from './loadProgress.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

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
    expect(defaultProgress.version).toBe('7.0.0');
    expect(defaultProgress.phase).toBe('interview');
    expect(defaultProgress.branch).toBeNull();
    expect(defaultProgress.current_step).toBe('CAL0');
    expect(defaultProgress.answered.length).toBe(0);
    expect(defaultProgress.answered_len_at_last_turn).toBe(0);
  });

  test('fails closed instead of fabricating fresh state when managed markers exist', () => {
    const corruptCanonicalDir = mkdtempSync(join(tmpdir(), 'de-load-progress-canonical-'));
    const orphanAnswersDir = mkdtempSync(join(tmpdir(), 'de-load-progress-answers-'));
    const corruptAnswersDir = mkdtempSync(join(tmpdir(), 'de-load-progress-corrupt-answers-'));
    try {
      mkdirSync(join(corruptCanonicalDir, '.design-everything'), { recursive: true });
      writeFileSync(
        join(corruptCanonicalDir, '.design-everything/interview-state.json'),
        '{ not valid json'
      );
      expect(() => loadProgress(join(corruptCanonicalDir, 'progress.json'))).toThrow(/CANONICAL_CORRUPT/);

      mkdirSync(join(orphanAnswersDir, 'Design/.interview'), { recursive: true });
      writeFileSync(join(orphanAnswersDir, 'Design/.interview/answers.json'), JSON.stringify({ S0: 'Vision' }));
      expect(() => loadProgress(join(orphanAnswersDir, 'progress.json'))).toThrow(/STORE_MISSING/);

      mkdirSync(join(corruptAnswersDir, 'Design/.interview'), { recursive: true });
      writeFileSync(join(corruptAnswersDir, 'Design/.interview/answers.json'), '{ not valid json');
      expect(() => loadProgress(join(corruptAnswersDir, 'progress.json'))).toThrow(
        /MIGRATION_BLOCKED_LEGACY_CORRUPT/
      );
    } finally {
      rmSync(corruptCanonicalDir, { recursive: true, force: true });
      rmSync(orphanAnswersDir, { recursive: true, force: true });
      rmSync(corruptAnswersDir, { recursive: true, force: true });
    }
  });

  test('should throw Zod error when loading invalid progress templates', () => {
    const invalidDir = join(__dirname, '../../test/fixtures/progress/invalid');
    const missingFieldPath = join(invalidDir, 'missing-field.json');
    const invalidBranchPath = join(invalidDir, 'invalid-branch.json');
    const invalidVersionPath = join(invalidDir, 'invalid-version-format.json');

    expect(() => loadProgress(missingFieldPath)).toThrow(/Invalid progress schema/);
    expect(() => loadProgress(invalidBranchPath)).toThrow(/Invalid progress schema/);
    expect(() => loadProgress(invalidVersionPath)).toThrow(/Invalid progress schema/);
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
