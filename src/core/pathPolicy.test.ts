import { test, expect, describe } from 'vitest';
import {
  canonicalizeWorkspacePath,
  matchesPathPattern,
  isContainedRealPath,
} from './index.js';
import { resolve, join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

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

  describe('UNC / device path rejection', () => {
    // The generic PATH_OUTSIDE_WORKSPACE boundary check already denies
    // every one of these (resolve() treats them as already-absolute, never
    // joined with workspaceRoot, so their normalized form never textually
    // starts with the workspace root) — verified empirically before adding
    // this test, not assumed. These earlier, specific checks change no
    // security outcome; they only give a caller a clearer reason code than
    // the generic one, and lock in the already-correct deny with an
    // explicit regression test (none existed before).
    test('rejects a UNC network path with a dedicated reason code', () => {
      const res = canonicalizeWorkspacePath(workspaceRoot, String.raw`\\server\share\x`);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason_code).toBe('UNC_PATH_DENIED');
    });

    test('rejects a \\\\.\\ device path with a dedicated reason code', () => {
      const res = canonicalizeWorkspacePath(workspaceRoot, String.raw`\\.\PhysicalDrive0`);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason_code).toBe('DEVICE_PATH_DENIED');
    });

    test('rejects a \\\\?\\ extended-length device path with a dedicated reason code', () => {
      const res = canonicalizeWorkspacePath(workspaceRoot, String.raw`\\?\C:\x`);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason_code).toBe('DEVICE_PATH_DENIED');
    });

    test('rejects a \\\\?\\UNC\\ extended-length UNC path with a dedicated reason code', () => {
      const res = canonicalizeWorkspacePath(workspaceRoot, String.raw`\\?\UNC\server\share\x`);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason_code).toBe('DEVICE_PATH_DENIED');
    });

    test('an ordinary relative path is unaffected by the new UNC/device checks', () => {
      const res = canonicalizeWorkspacePath(workspaceRoot, 'src/index.ts');
      expect(res.ok).toBe(true);
    });
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

  test('matchesPathPattern treats ** as matching zero intervening segments too', () => {
    // 'src/**/*.ts' must also match a file directly under src/, not just one
    // nested at least one directory deep.
    expect(matchesPathPattern('src/app.ts', 'src/**/*.ts')).toBe(true);
    expect(matchesPathPattern('Design/notes.md', 'Design/**')).toBe(true);
    expect(matchesPathPattern('Design', 'Design/**')).toBe(true);
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

  describe('sibling-prefix escape', () => {
    test('rejects a target whose path merely starts with the root string (sibling dir)', () => {
      const base = mkdtempSync(join(tmpdir(), 'de-sibling-'));
      const root = join(base, 'foo');
      const sibling = join(base, 'foobar');
      mkdirSync(root, { recursive: true });
      mkdirSync(sibling, { recursive: true });
      writeFileSync(join(sibling, 'secret.txt'), 'top secret');

      try {
        // '../foobar/secret.txt' resolved against root escapes to the sibling
        // directory whose name merely shares the "foo" string prefix.
        const res = canonicalizeWorkspacePath(root, '../foobar/secret.txt');
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reason_code).toBe('PATH_OUTSIDE_WORKSPACE');
        }
        expect(isContainedRealPath(root, '../foobar/secret.txt')).toBe(false);
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    });

    test('still allows a real path inside the root after the fix', () => {
      const base = mkdtempSync(join(tmpdir(), 'de-sibling-'));
      const root = join(base, 'foo');
      mkdirSync(join(root, 'sub'), { recursive: true });
      writeFileSync(join(root, 'sub', 'file.txt'), 'hello');

      try {
        const res = canonicalizeWorkspacePath(root, 'sub/file.txt');
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.canonicalPath).toBe('sub/file.txt');
        }
        expect(isContainedRealPath(root, 'sub/file.txt')).toBe(true);
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    });

    test('rejects a mixed-separator traversal that lands on a sibling', () => {
      const base = mkdtempSync(join(tmpdir(), 'de-sibling-'));
      const root = join(base, 'foo');
      const sibling = join(base, 'foobaz');
      mkdirSync(root, { recursive: true });
      mkdirSync(sibling, { recursive: true });
      writeFileSync(join(sibling, 'x.txt'), 'x');

      try {
        const res = canonicalizeWorkspacePath(root, '..\\foobaz\\x.txt');
        expect(res.ok).toBe(false);
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    });

    test('accepts paths with spaces and unicode characters inside the root', () => {
      const base = mkdtempSync(join(tmpdir(), 'de-sibling-'));
      const root = join(base, 'foo');
      mkdirSync(join(root, 'dir with space'), { recursive: true });
      writeFileSync(join(root, 'dir with space', 'tệp-tin 文件.txt'), 'ok');

      try {
        const res = canonicalizeWorkspacePath(root, 'dir with space/tệp-tin 文件.txt');
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.canonicalPath).toBe('dir with space/tệp-tin 文件.txt');
        }
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    });
  });
});
