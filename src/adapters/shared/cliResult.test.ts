import { describe, test, expect } from 'vitest';
import { redactInternalError, exitCodeFor, type CliResultEnvelope } from './cliResult.js';

function envelope(overrides: Partial<CliResultEnvelope> & { reason_code: string }): CliResultEnvelope {
  return {
    ok: false,
    operation: 'commit',
    severity: 'error',
    message: 'test',
    runtime_version: '0.0.0-test',
    ...overrides,
  };
}

describe('redactInternalError (P8 item 15 — no raw stack/sensitive path in CLI diagnostics)', () => {
  test('strips a Windows absolute path that would reveal the local username', () => {
    const raw = "ENOENT: no such file or directory, open 'C:\\Users\\admin\\secret-project\\progress.json'";
    const out = redactInternalError(raw);
    expect(out).not.toContain('C:\\Users\\admin');
    expect(out).not.toContain('admin');
  });

  test('strips a POSIX absolute home-directory path', () => {
    const raw = "ENOENT: no such file or directory, open '/home/alice/secret-project/progress.json'";
    const out = redactInternalError(raw);
    expect(out).not.toContain('/home/alice');
    expect(out).not.toContain('alice');
  });

  test('drops everything after the first line, so a stack trace never surfaces', () => {
    const raw = 'Cannot read properties of undefined\n    at Object.<anonymous> (E:\\DesignEverything\\src\\core\\foo.ts:42:9)\n    at Module._compile (node:internal/modules/cjs/loader:1105:14)';
    const out = redactInternalError(raw);
    expect(out).not.toContain('at Object.<anonymous>');
    expect(out).not.toContain('foo.ts');
  });

  test('leaves an ordinary single-line message without paths unchanged', () => {
    const raw = 'STORE_MISSING: Canonical interview store does not exist.';
    expect(redactInternalError(raw)).toBe(raw);
  });
});

describe('exitCodeFor', () => {
  test('ok:true is always exit 0, regardless of reason_code', () => {
    expect(exitCodeFor(envelope({ ok: true, reason_code: 'ANYTHING' }))).toBe(0);
  });

  test('A1-04 (Wave A1) — ANSWER_NEEDS_USER_ACK is exit 2 (validation/policy), not the exit 5 internal-error fallback', () => {
    expect(exitCodeFor(envelope({ reason_code: 'ANSWER_NEEDS_USER_ACK' }))).toBe(2);
  });

  test('EMIT_VALIDATION_FAILED is exit 2 — A1-02 made derived-recipe-provenance-missing a real blocking issue this must surface as', () => {
    expect(exitCodeFor(envelope({ reason_code: 'EMIT_VALIDATION_FAILED', operation: 'emit' }))).toBe(2);
  });

  test('a code containing PACKAGE is not misclassified by an overly broad ACK substring match', () => {
    // Guards the specific 'NEEDS_USER_ACK' substring choice in cliResult.ts:
    // a bare 'ACK' check would wrongly catch this and any future
    // PACKAGE_*/TRACK_*-style code too.
    expect(exitCodeFor(envelope({ reason_code: 'PACKAGE_CORRUPT' }))).toBe(3);
  });

  test('usage-class codes are exit 1', () => {
    expect(exitCodeFor(envelope({ reason_code: 'UNKNOWN_SUBCOMMAND' }))).toBe(1);
    expect(exitCodeFor(envelope({ reason_code: 'INVALID_INPUT' }))).toBe(1);
  });

  test('health/corruption-class codes are exit 3', () => {
    expect(exitCodeFor(envelope({ reason_code: 'CORRUPT_PROGRESS_STATE' }))).toBe(3);
    expect(exitCodeFor(envelope({ reason_code: 'STORE_MISSING' }))).toBe(3);
  });

  test('conflict-class codes are exit 4', () => {
    expect(exitCodeFor(envelope({ reason_code: 'EMIT_REVISION_CONFLICT' }))).toBe(4);
  });

  test('an unrecognized reason_code falls back to exit 5, not a silently wrong success-adjacent code', () => {
    expect(exitCodeFor(envelope({ reason_code: 'SOME_UNMAPPED_INTERNAL_FAILURE' }))).toBe(5);
  });
});
