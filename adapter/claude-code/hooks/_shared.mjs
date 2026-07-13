// Shared helpers for Claude Code hook entries.
// Hooks nhận JSON qua stdin theo giao thức hook của Claude Code và trả JSON qua stdout.
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Engine root = repo DesignEverything (nơi chứa dist/ + node_modules).
export const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

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
