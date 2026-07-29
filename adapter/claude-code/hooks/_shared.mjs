// Shared helpers for Claude Code hook entries.
// Hooks nhận JSON qua stdin theo giao thức hook của Claude Code và trả JSON qua stdout.
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Engine root = repo DesignEverything (nơi chứa dist/ + node_modules) — chỉ
// còn dùng khi chạy trực tiếp từ source checkout (dev mode), xem dưới.
export const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// P9 — a target-local install places this hooks/ file at
// .design-everything/runtime/<version>/hooks/<name>.mjs, with the
// self-contained esbuild bundle one level up as a sibling:
// .design-everything/runtime/<version>/runtime.mjs. That single file
// exports every named symbol any hook subpath below would have asked for
// (core's full surface + onPreToolUse/onSessionStart/onUserPromptSubmit —
// see src/runtimeBundleEntry.ts), so an installed target resolves here
// FIRST regardless of the requested subpath, and only falls back to
// dev-mode ENGINE_ROOT/dist candidates when no sibling bundle exists (i.e.
// running straight from this source checkout's adapter/claude-code/hooks/).
const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const SIBLING_BUNDLE = join(HOOKS_DIR, '..', 'runtime.mjs');

export function resolveModule(subpath) {
  if (existsSync(SIBLING_BUNDLE)) return SIBLING_BUNDLE;
  const candidates = [
    join(ENGINE_ROOT, 'dist', 'src', subpath),
    join(ENGINE_ROOT, 'dist', subpath),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return join(ENGINE_ROOT, 'dist', subpath);
}

/** Target-local cli.mjs (sibling of runtime.mjs) when installed; dev-mode source path otherwise. */
export function resolveCliLauncherPath() {
  if (existsSync(SIBLING_BUNDLE)) return join(HOOKS_DIR, '..', 'cli.mjs');
  return join(ENGINE_ROOT, 'adapter/claude-code/cli.mjs');
}

export function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // Nếu không có stdin (chạy tay để debug) thì đừng treo mãi.
    setTimeout(() => resolve({}), 3000).unref();
  });
}

export function workspaceRootFrom(input) {
  return input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

export function emitJson(obj) {
  process.stdout.write(JSON.stringify(obj));
}
