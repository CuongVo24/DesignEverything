import { describe, test, expect } from 'vitest';
import { redactInternalError } from './cliResult.js';

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
