import { test, expect, describe } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = join(__dirname, '../..');

describe('V4 Claims and Release Gate Lint', () => {
  test('should pass check-v4-claims.mjs script linting of all documents', () => {
    const claimsScript = join(ENGINE_ROOT, 'scripts/check-v4-claims.mjs');
    const output = execSync(`node "${claimsScript}"`, { cwd: ENGINE_ROOT }).toString('utf8');
    expect(output).toContain('All release claims verified successfully.');
  });
});
