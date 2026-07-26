import { test, expect, describe } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { isGitReadOnly } from './gitReadOnly.js';

describe('isGitReadOnly — branch creation and scope-escape hardening', () => {
  test('git branch with no args is read-only (listing)', () => {
    expect(isGitReadOnly(['git', 'branch']).safe).toBe(true);
  });

  test('git branch -a / -r / -v are read-only', () => {
    expect(isGitReadOnly(['git', 'branch', '-a']).safe).toBe(true);
    expect(isGitReadOnly(['git', 'branch', '-r']).safe).toBe(true);
    expect(isGitReadOnly(['git', 'branch', '-v']).safe).toBe(true);
  });

  test('git branch <new-name> is a mutation (creates a branch)', () => {
    const res = isGitReadOnly(['git', 'branch', 'feature-x']);
    expect(res.safe).toBe(false);
    expect(res.reason_code).toBe('GIT_BRANCH_MUTATION_DENIED');
  });

  test('git branch <new-name> <start-point> is a mutation', () => {
    const res = isGitReadOnly(['git', 'branch', 'feature-x', 'origin/main']);
    expect(res.safe).toBe(false);
  });

  test('git branch --list <pattern> stays read-only', () => {
    expect(isGitReadOnly(['git', 'branch', '--list', 'feature-*']).safe).toBe(true);
  });

  test('git -C pointing inside the workspace stays read-only', () => {
    const base = mkdtempSync(join(tmpdir(), 'de-git-scope-'));
    const sub = join(base, 'sub');
    mkdirSync(sub, { recursive: true });
    try {
      const res = isGitReadOnly(['git', '-C', 'sub', 'status'], base);
      expect(res.safe).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test('git -C escaping the workspace is denied even for a read-only subcommand', () => {
    const base = mkdtempSync(join(tmpdir(), 'de-git-scope-'));
    const root = join(base, 'root');
    const outside = join(base, 'outside');
    mkdirSync(root, { recursive: true });
    mkdirSync(outside, { recursive: true });
    try {
      const res = isGitReadOnly(['git', '-C', '../outside', 'status'], root);
      expect(res.safe).toBe(false);
      expect(res.reason_code).toBe('GIT_SCOPE_ESCAPE_DENIED');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test('--git-dir=<path> escaping the workspace is denied', () => {
    const base = mkdtempSync(join(tmpdir(), 'de-git-scope-'));
    const root = join(base, 'root');
    mkdirSync(root, { recursive: true });
    try {
      const res = isGitReadOnly(['git', '--git-dir=../outside/.git', 'log'], root);
      expect(res.safe).toBe(false);
      expect(res.reason_code).toBe('GIT_SCOPE_ESCAPE_DENIED');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test('git -C with no cwd context to resolve against fails closed', () => {
    const res = isGitReadOnly(['git', '-C', '/tmp/whatever', 'status']);
    expect(res.safe).toBe(false);
    expect(res.reason_code).toBe('GIT_SCOPE_UNRESOLVED_DENIED');
  });
});
