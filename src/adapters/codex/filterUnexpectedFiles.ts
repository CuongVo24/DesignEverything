import { matchesPathPattern } from '../../core/pathPolicy.js';

/**
 * Codex's post-tool-use audit pass (defense-in-depth for actions PreToolUse
 * cannot fully intercept, e.g. arbitrary Bash) diffs `git status --porcelain`
 * against the active task's `allowed_paths`. Pulled out of
 * adapter/codex-plugin/hooks/post-tool-use.mjs (P9) so the hook wrapper stays
 * a thin I/O shim and this pure matching logic ships once, from the bundle.
 */
export function filterUnexpectedFiles(modifiedFiles: string[], allowedPaths: string[]): string[] {
  return modifiedFiles.filter((file) => {
    if (
      file.startsWith('.design-everything/') ||
      file === 'progress.json' ||
      file.startsWith('docs/') ||
      file.startsWith('Design/')
    ) {
      return false;
    }
    const normFile = file.replace(/\\/g, '/');
    return !allowedPaths.some((allowedGlob) => matchesPathPattern(normFile, allowedGlob));
  });
}
