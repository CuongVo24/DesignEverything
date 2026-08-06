import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const REPO_ROOT = join(__dirname, '../../..');
const SHARED_MJS = pathToFileURL(join(REPO_ROOT, 'adapter/claude-code/installer/shared.mjs')).href;

// A throwaway runner that calls the real exported checkDistFreshness — kept
// as plain .mjs (not statically imported into this .ts file) so tsc's
// noImplicitAny/strict checks don't need type declarations for an adapter
// .mjs module, matching how every other installer test in this directory
// exercises install.mjs itself: spawn, don't import.
function runCheck(engineRoot: string, bundlePath: string) {
  const runnerPath = join(engineRoot, 'run-check.mjs');
  writeFileSync(
    runnerPath,
    `import { checkDistFreshness } from ${JSON.stringify(SHARED_MJS)};\n` +
      `checkDistFreshness(${JSON.stringify(engineRoot)}, ${JSON.stringify(bundlePath)});\n` +
      `console.log('OK');\n`
  );
  return spawnSync('node', [runnerPath], { encoding: 'utf8' });
}

// B4d #4 — checkDistFreshness is the exact function install.mjs calls before
// staging anything. Exercised here against a fully isolated fake
// engineRoot/bundle tree (never the real repo's src/ or dist/) so this test
// cannot race with any other test file that spawns the real installer
// concurrently — src/ and dist/bundle/runtime.mjs are shared, process-wide
// filesystem state, and touching their mtimes globally would make unrelated
// concurrent installer tests flaky.
describe('checkDistFreshness — dev checkout with a stale bundle fails clearly, release artifact skips the check', () => {
  let fakeEngineRoot: string;
  let bundlePath: string;

  beforeEach(() => {
    fakeEngineRoot = join(tmpdir(), `de-dist-staleness-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(join(fakeEngineRoot, 'src'), { recursive: true });
    mkdirSync(join(fakeEngineRoot, 'dist/bundle'), { recursive: true });
    bundlePath = join(fakeEngineRoot, 'dist/bundle/runtime.mjs');
    writeFileSync(bundlePath, '// fake bundle\n');
    writeFileSync(join(fakeEngineRoot, 'src/foo.ts'), '// fake source\n');
  });

  afterEach(() => {
    rmSync(fakeEngineRoot, { recursive: true, force: true });
  });

  it('fails with a clear build-command message when a src/*.ts file is newer than the bundle', () => {
    const now = Date.now();
    utimesSync(bundlePath, now / 1000, now / 1000);
    utimesSync(join(fakeEngineRoot, 'src/foo.ts'), now / 1000 + 10, now / 1000 + 10);

    const result = runCheck(fakeEngineRoot, bundlePath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('npm run build:bundle');
  });

  it('does not fail when the bundle is newer than every src/*.ts file', () => {
    const now = Date.now();
    utimesSync(join(fakeEngineRoot, 'src/foo.ts'), now / 1000, now / 1000);
    utimesSync(bundlePath, now / 1000 + 10, now / 1000 + 10);

    const result = runCheck(fakeEngineRoot, bundlePath);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('OK');
  });

  it('ignores *.test.ts files when checking staleness', () => {
    writeFileSync(join(fakeEngineRoot, 'src/foo.test.ts'), '// fake test source\n');
    const now = Date.now();
    utimesSync(bundlePath, now / 1000, now / 1000);
    utimesSync(join(fakeEngineRoot, 'src/foo.ts'), now / 1000 - 10, now / 1000 - 10);
    utimesSync(join(fakeEngineRoot, 'src/foo.test.ts'), now / 1000 + 10, now / 1000 + 10);

    const result = runCheck(fakeEngineRoot, bundlePath);
    expect(result.status).toBe(0);
  });

  it('skips the check entirely when src/ does not exist (release artifact)', () => {
    rmSync(join(fakeEngineRoot, 'src'), { recursive: true, force: true });
    const now = Date.now();
    utimesSync(bundlePath, now / 1000 - 1000, now / 1000 - 1000);

    const result = runCheck(fakeEngineRoot, bundlePath);
    expect(result.status).toBe(0);
  });
});
