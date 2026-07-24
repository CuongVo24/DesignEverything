import { resolve, relative, normalize, dirname } from 'path';
import { existsSync, realpathSync } from 'fs';

export type PathCanonicalizationResult =
  | { ok: true; canonicalPath: string }
  | { ok: false; reason_code: string; message: string };

export function normalizeDrive(p: string): string {
  const norm = normalize(p).replace(/\\/g, '/');
  if (norm.length >= 2 && norm[1] === ':') {
    return norm[0].toLowerCase() + norm.slice(1);
  }
  return norm;
}

export function isContainedRealPath(workspaceRoot: string, targetPath: string): boolean {
  try {
    const normRoot = normalizeDrive(workspaceRoot);
    const realRoot = existsSync(workspaceRoot) ? normalizeDrive(realpathSync(workspaceRoot)) : normRoot;

    let targetToCheck = resolve(workspaceRoot, targetPath);
    if (!existsSync(targetToCheck)) {
      // If target doesn't exist, check its nearest existing parent
      let parent = dirname(targetToCheck);
      while (parent && !existsSync(parent) && parent !== dirname(parent)) {
        parent = dirname(parent);
      }
      if (existsSync(parent)) {
        targetToCheck = parent;
      }
    }

    const realTarget = existsSync(targetToCheck) ? normalizeDrive(realpathSync(targetToCheck)) : normalizeDrive(targetToCheck);
    return realTarget.startsWith(realRoot);
  } catch {
    return false;
  }
}

export function canonicalizeWorkspacePath(workspaceRoot: string, inputPath: string): PathCanonicalizationResult {
  if (!inputPath || inputPath.trim() === '') {
    return { ok: false, reason_code: 'EMPTY_PATH', message: 'Path input is empty.' };
  }

  const normWorkspace = normalizeDrive(workspaceRoot);
  const resolvedTarget = resolve(workspaceRoot, inputPath);
  const normTarget = normalizeDrive(resolvedTarget);

  if (!normTarget.startsWith(normWorkspace)) {
    return {
      ok: false,
      reason_code: 'PATH_OUTSIDE_WORKSPACE',
      message: `Path "${inputPath}" points outside the workspace root.`,
    };
  }

  if (!isContainedRealPath(workspaceRoot, inputPath)) {
    return {
      ok: false,
      reason_code: 'SYMLINK_ESCAPE_DENIED',
      message: `Path "${inputPath}" resolves outside workspace via symlink/junction.`,
    };
  }

  let rel = relative(normWorkspace, normTarget).replace(/\\/g, '/');
  if (rel === '') rel = '.';

  return { ok: true, canonicalPath: rel };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesPathPattern(canonicalPath: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '**') return true;

  const normPath = canonicalPath.replace(/\\/g, '/');
  const normPattern = pattern.replace(/\\/g, '/');

  // Convert glob pattern to regex with segment awareness
  // ** -> match zero or more segments (.*)
  // * -> match within segment ([^/]+)
  let regexStr = '^';
  const parts = normPattern.split(/(\*\*|\*)/);

  for (const part of parts) {
    if (part === '**') {
      regexStr += '.*';
    } else if (part === '*') {
      regexStr += '[^/]*';
    } else {
      regexStr += escapeRegExp(part);
    }
  }
  regexStr += '$';

  const regex = new RegExp(regexStr);
  return regex.test(normPath);
}
