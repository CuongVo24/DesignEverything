import { test, expect, describe } from 'vitest';
import { classifyCommand } from './index.js';

describe('B2b — Safe shell command classifier contract', () => {
  test('classifies proven read-only git status / log / diff', () => {
    expect(classifyCommand({ argv: ['git', 'status'] }).outcome).toBe('proven_read_only');
    expect(classifyCommand({ argv: ['git', 'log', '-n', '5'] }).outcome).toBe('proven_read_only');
    expect(classifyCommand({ argv: ['git', 'diff'] }).outcome).toBe('proven_read_only');
  });

  test('denies mutating git subcommands clean / restore / reset / branch -D', () => {
    expect(classifyCommand({ argv: ['git', 'clean', '-fd'] }).outcome).toBe('mutation');
    expect(classifyCommand({ argv: ['git', 'restore', '.'] }).outcome).toBe('mutation');
    expect(classifyCommand({ argv: ['git', 'reset', '--hard'] }).outcome).toBe('mutation');
    expect(classifyCommand({ argv: ['git', 'branch', '-D', 'feature'] }).outcome).toBe('mutation');
  });

  test('classifies proven read-only find command', () => {
    expect(classifyCommand({ argv: ['find', '.', '-name', '*.ts'] }).outcome).toBe('proven_read_only');
  });

  test('denies mutating find command with -delete or -exec', () => {
    expect(classifyCommand({ argv: ['find', '.', '-name', '*.ts', '-delete'] }).outcome).toBe('mutation');
    expect(classifyCommand({ argv: ['find', '.', '-exec', 'rm', '{}', ';'] }).outcome).toBe('mutation');
  });

  test('denies shell write redirection operators > and >>', () => {
    expect(classifyCommand({ raw: 'echo hello > file.txt' }).outcome).toBe('mutation');
    expect(classifyCommand({ raw: 'echo text >> log.txt' }).outcome).toBe('mutation');
    expect(classifyCommand({ raw: 'Get-Process | Out-File log.txt' }).outcome).toBe('mutation');
  });

  test('denies compound, chained, or nested shell commands fail-closed', () => {
    expect(classifyCommand({ raw: 'ls && rm -rf /' }).outcome).toBe('unknown');
    expect(classifyCommand({ raw: 'powershell -c "git clean -fd"' }).outcome).toBe('unknown');
  });

  test('classifies basic safe read-only commands cat, ls, pwd', () => {
    expect(classifyCommand({ argv: ['cat', 'package.json'] }).outcome).toBe('proven_read_only');
    expect(classifyCommand({ argv: ['ls', '-la'] }).outcome).toBe('proven_read_only');
    expect(classifyCommand({ argv: ['pwd'] }).outcome).toBe('proven_read_only');
  });
});
