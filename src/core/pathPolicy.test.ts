import { test, expect, describe } from 'vitest';
import {
  canonicalizeWorkspacePath,
  matchesPathPattern,
  isContainedRealPath,
} from './index.js';
import { resolve } from 'path';

describe('B2c — Canonical workspace path matcher contract', () => {
  const workspaceRoot = resolve(process.cwd());

  test('canonicalizeWorkspacePath normalizes separators and checks boundaries', () => {
    const res = canonicalizeWorkspacePath(workspaceRoot, 'src\\index.ts');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.canonicalPath).toBe('src/index.ts');
    }
  });

  test('canonicalizeWorkspacePath rejects traversal outside workspace', () => {
    const res = canonicalizeWorkspacePath(workspaceRoot, '../../secret.txt');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('PATH_OUTSIDE_WORKSPACE');
    }
  });

  test('isContainedRealPath verifies containment', () => {
    expect(isContainedRealPath(workspaceRoot, 'src/index.ts')).toBe(true);
    expect(isContainedRealPath(workspaceRoot, '../../outside.txt')).toBe(false);
  });

  test('matchesPathPattern correctly matches single-star * within segment', () => {
    expect(matchesPathPattern('src/index.ts', 'src/*.ts')).toBe(true);
    expect(matchesPathPattern('src/utils/index.ts', 'src/*.ts')).toBe(false);
  });

  test('matchesPathPattern correctly matches double-star ** across segments', () => {
    expect(matchesPathPattern('src/utils/helpers/math.ts', 'src/**/*.ts')).toBe(true);
    expect(matchesPathPattern('Design/Content/notes.md', 'Design/**')).toBe(true);
  });

  test('matchesPathPattern prevents regex metacharacter injection', () => {
    // Literal dots and pluses should not be treated as regex wildcard or 1+ repetition
    expect(matchesPathPattern('docs/v1.0+final/file.md', 'docs/v1.0+final/*.md')).toBe(true);
    expect(matchesPathPattern('docs/v1X0Xfinal/file.md', 'docs/v1.0+final/*.md')).toBe(false);
  });

  test('matchesPathPattern handles exact directory boundaries', () => {
    expect(matchesPathPattern('docs/foo', 'docs/foo')).toBe(true);
    expect(matchesPathPattern('docs/foobar', 'docs/foo')).toBe(false);
  });
});
