import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import { exitCodeFor } from '../../src/adapters/shared/cliResult.js';

describe('B4c — CLI exit, output and health protocol contract', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cli-protocol-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  test('status on uninvolved project returns UNINVOLVED envelope with exit code 0', async () => {
    const res = await runCliOperation(tempDir, ['status']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('UNINVOLVED');
    expect(exitCodeFor(res)).toBe(0);
  });

  test('init on fresh directory initializes state and returns INIT_SUCCESS', async () => {
    // Write minimal script and gate-policy so init can work
    const scriptDir = join(tempDir, 'Design/Content/interview-script');
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(scriptDir, 'script.yaml'), 'version: "0.1.0"\nsteps: []\n', 'utf8');

    const res = await runCliOperation(tempDir, ['init']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('INIT_SUCCESS');
    expect(exitCodeFor(res)).toBe(0);
  });

  test('unknown subcommand returns UNKNOWN_SUBCOMMAND envelope with exit code 1', async () => {
    const res = await runCliOperation(tempDir, ['unknownSubcommand']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('UNKNOWN_SUBCOMMAND');
    expect(exitCodeFor(res)).toBe(1);
  });

  test('exitCodeFor correctly maps failure categories to exit codes', () => {
    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'USAGE_ERROR',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(1);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'GATE_CLOSED',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(2);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(3);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'DUPLICATE_COMMIT',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(4);

    expect(
      exitCodeFor({
        ok: false,
        operation: 'test',
        reason_code: 'INTERNAL_ERROR',
        severity: 'error',
        message: 'msg',
        runtime_version: '6.0.0',
      })
    ).toBe(5);
  });
});
