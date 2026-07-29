// Shared helpers for Codex plugin hook entries.
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));

// P9 — a target-local install (see adapter/codex-plugin/install.mjs) places
// this hooks/ file at .design-everything/runtime/<version>/hooks/<name>.mjs,
// with the self-contained esbuild bundle one level up as a sibling:
// .design-everything/runtime/<version>/runtime.mjs. That bundle exports
// every named symbol a Codex hook would ask for (evaluatePreAction,
// matchesPathPattern, filterUnexpectedFiles — see src/runtimeBundleEntry.ts),
// so an installed target resolves here FIRST regardless of subpath, and
// only falls back to dev-mode candidates when no sibling bundle exists
// (i.e. running straight from this source checkout).
const SIBLING_BUNDLE = join(HOOKS_DIR, '..', 'runtime.mjs');

export function resolveCorePath() {
  if (existsSync(SIBLING_BUNDLE)) return SIBLING_BUNDLE;

  const roots = [
    process.env.CLAUDE_PLUGIN_ROOT,
    process.env.PLUGIN_ROOT,
    resolve(HOOKS_DIR, '..'),
  ].filter(Boolean);

  const candidates = [];
  for (const root of roots) {
    // runtimeBundleEntry re-exports the full core barrel PLUS the
    // codex-only filterUnexpectedFiles — prefer it so both hooks resolve
    // the same symbols whether they run installed or straight from source.
    candidates.push(join(root, 'dist', 'src', 'runtimeBundleEntry.js'));
    candidates.push(join(root, 'dist', 'runtimeBundleEntry.js'));
    candidates.push(join(root, 'dist', 'src', 'core', 'index.js'));
    candidates.push(join(root, 'dist', 'core', 'index.js'));
  }
  // Dev-mode fallback: running straight from this source checkout's
  // adapter/codex-plugin/hooks/ with no PLUGIN_ROOT bundle staged.
  const engineRoot = resolve(HOOKS_DIR, '..', '..', '..');
  candidates.push(join(engineRoot, 'dist', 'src', 'runtimeBundleEntry.js'));
  candidates.push(join(engineRoot, 'dist', 'runtimeBundleEntry.js'));
  candidates.push(join(engineRoot, 'dist', 'src', 'core', 'index.js'));
  candidates.push(join(engineRoot, 'dist', 'core', 'index.js'));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
