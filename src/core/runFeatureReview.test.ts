import { expect, test, describe } from 'vitest';
import { reviewCommandsFor, extractIssues, runFeatureReview } from './runFeatureReview.js';
import { ProjectConventions } from './schemas/index.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function conventions(target: ProjectConventions['tech_stack']['target']): ProjectConventions {
  return {
    allowed_paths: [],
    allowed_dependencies: [],
    tech_stack: { target, language: target === 'python-cli' ? 'python' : 'typescript', runtime: 'node' },
  };
}

describe('reviewCommandsFor', () => {
  test('node dùng npm scripts', () => {
    expect(reviewCommandsFor(conventions('node-cli'))).toEqual({
      lint: ['npm', 'run', 'lint'],
      test: ['npm', 'test'],
    });
  });

  test('python dùng pytest và không có lint mặc định', () => {
    const c = reviewCommandsFor(conventions('python-cli'));
    expect(c.test).toEqual(['pytest']);
    expect(c.lint).toBeNull();
  });

  test('vite-web dùng npm scripts', () => {
    expect(reviewCommandsFor(conventions('vite-web')).test).toEqual(['npm', 'test']);
  });
});

describe('extractIssues', () => {
  test('rút dòng có error/fail làm mô tả break-task', () => {
    const out = [
      'Running tests...',
      'FAIL src/auth.test.ts > rejects bad password',
      'ok 1 - something fine',
      'Error: expected 401 got 200',
    ].join('\n');

    const issues = extractIssues(out);
    expect(issues).toContain('FAIL src/auth.test.ts > rejects bad password');
    expect(issues).toContain('Error: expected 401 got 200');
    expect(issues).not.toContain('Running tests...');
  });

  test('bỏ dòng trùng và giới hạn số lượng', () => {
    const out = Array(20).fill('Error: same thing').join('\n');
    expect(extractIssues(out)).toEqual(['Error: same thing']);

    const many = Array.from({ length: 20 }, (_, i) => `Error: khác nhau ${i}`).join('\n');
    expect(extractIssues(many, 3)).toHaveLength(3);
  });

  test('output sạch thì không rút được issue nào', () => {
    expect(extractIssues('All tests passed\n5 passing')).toEqual([]);
  });
});

describe('runFeatureReview', () => {
  test('lệnh không chạy được thì coi là KHÔNG sạch (fail-closed)', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'review-test-'));
    try {
      // Workspace trống, không có package.json → `npm test` không thể xanh.
      const signal = await runFeatureReview({
        workspace: ws,
        featureMilestone: 'M4-login',
        changedPaths: ['src/auth/login.ts'],
        conventions: conventions('node-cli'),
        conventionsRef: 'docs/conventions/',
      });

      expect(signal.featureMilestone).toBe('M4-login');
      expect(signal.test.ok).toBe(false);
      expect(signal.changedPaths).toEqual(['src/auth/login.ts']);
      expect(signal.verification.some((v) => v.id === 'review-test')).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  }, 120_000);

  test('python không có lint thì lint mặc định sạch, không bịa lỗi lint', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'review-py-'));
    try {
      const signal = await runFeatureReview({
        workspace: ws,
        featureMilestone: 'M4-x',
        changedPaths: [],
        conventions: conventions('python-cli'),
        conventionsRef: 'docs/conventions/',
      });

      expect(signal.lint.ok).toBe(true);
      expect(signal.lint.issues).toEqual([]);
      expect(signal.verification.some((v) => v.id === 'review-lint')).toBe(false);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  }, 120_000);
});
