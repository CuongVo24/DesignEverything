import { test, expect, describe, beforeAll } from 'vitest';
import { existsSync, mkdtempSync, rmSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const BUNDLE_PATH = join(REPO_ROOT, 'dist/bundle/runtime.mjs');

/**
 * P9 (bonus-plan Phase 4, Slice 1) — dist/bundle/runtime.mjs is the single
 * self-contained file every target-local install ships and every hook
 * wrapper/cli.mjs imports. Proves it (a) actually inlines zod+yaml (no
 * node_modules dependency at the target), and (b) works end-to-end when
 * copied somewhere with no sibling dist/src or node_modules at all —
 * exactly the shape of a real installed target.
 */
describe('P9 — dist/bundle/runtime.mjs is a real self-contained runtime', () => {
  beforeAll(() => {
    if (!existsSync(BUNDLE_PATH)) {
      execSync('node scripts/build-runtime-bundle.mjs', { cwd: REPO_ROOT, stdio: 'inherit' });
    }
  });

  test('the bundle file exists and inlines zod/yaml (no bare package imports left)', () => {
    expect(existsSync(BUNDLE_PATH)).toBe(true);
    const text = readFileSync(BUNDLE_PATH, 'utf8');
    expect(text).not.toMatch(/from\s+["']zod["']/);
    expect(text).not.toMatch(/from\s+["']yaml["']/);
    expect(text).not.toMatch(/require\(["']zod["']\)/);
    expect(text).not.toMatch(/require\(["']yaml["']\)/);
  });

  test('copied alone (no sibling dist/src, no node_modules) it still runs a real CLI operation end-to-end', async () => {
    // Importing an 800KB+ bundle plus its full core module graph can take
    // longer than the default 5s test timeout under parallel test-suite
    // load, unrelated to correctness.
    const isolatedDir = mkdtempSync(join(tmpdir(), 'runtime-bundle-isolated-'));
    const isolatedBundle = join(isolatedDir, 'runtime.mjs');
    try {
      copyFileSync(BUNDLE_PATH, isolatedBundle);
      expect(existsSync(join(isolatedDir, 'node_modules'))).toBe(false);

      const core = await import(pathToFileURL(isolatedBundle).href);
      expect(typeof core.runCliOperation).toBe('function');
      expect(typeof core.onPreToolUse).toBe('function');
      expect(typeof core.onSessionStart).toBe('function');
      expect(typeof core.onUserPromptSubmit).toBe('function');
      expect(typeof core.evaluatePreAction).toBe('function');
      expect(typeof core.matchesPathPattern).toBe('function');
      expect(typeof core.RUNTIME_VERSION).toBe('string');

      const workspaceDir = join(isolatedDir, 'workspace');
      const res = await core.runCliOperation(workspaceDir, ['status']);
      expect(res.ok).toBe(true);
      expect(res.reason_code).toBe('UNINVOLVED');
      expect(res.runtime_version).toBe(core.RUNTIME_VERSION);
    } finally {
      rmSync(isolatedDir, { recursive: true, force: true });
    }
  }, 20000);
});
