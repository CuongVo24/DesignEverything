import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

// P2.2a §5.4 — "Lint/architecture test cấm import legacy loaders ngoài
// allowlist." loadProgress/saveProgress read/write progress.json, which is
// no longer authoritative anywhere in production. This test machine-checks
// that no adapter or Core-policy module outside the explicit allowlist below
// re-introduces a dependency on it — the exact kind of drift that made the
// P2.2a cutover necessary in the first place.
const REPO_ROOT = join(__dirname, '../..');
const SCAN_ROOTS = [join(REPO_ROOT, 'src/core'), join(REPO_ROOT, 'src/adapters')];

// Relative to REPO_ROOT, POSIX-style.
const ALLOWLIST = new Set<string>([
  'src/core/loadProgress.ts', // the definition itself
  'src/core/index.ts', // re-export only — no call site
  // Legitimate legacy-detection use: reports a corrupt legacy progress.json
  // as a soft health issue if one happens to still be lying around. Never
  // treated as authority, never used to derive state for any decision.
  'src/core/runtimeHealth.ts',
]);

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('P2.2a — legacy progress authority import boundary', () => {
  it('no production adapter or Core-policy module imports loadProgress/saveProgress outside the allowlist', () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      for (const file of getAllTsFiles(root)) {
        const relPath = relative(REPO_ROOT, file).replace(/\\/g, '/');
        if (ALLOWLIST.has(relPath)) continue;

        const content = readFileSync(file, 'utf8');
        // Named-import usage only — matches `import { loadProgress ...`,
        // `import { ..., saveProgress, ... }`, not unrelated identifiers.
        if (/\bloadProgress\b|\bsaveProgress\b/.test(content)) {
          offenders.push(relPath);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
