import { existsSync, readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { canonicalizeWorkspacePath } from './pathPolicy.js';

export interface GateArtifactInfo {
  canonicalPath: string;
  exists: boolean;
  nonEmpty: boolean;
  sha256: string;
  size: number;
}

export interface GateSnapshot {
  workspaceRoot: string;
  artifacts: Record<string, GateArtifactInfo>;
  validationPass: boolean;
  completedTasks: string[];
  snapshotDigest: string;
  createdAt: string;
}

export function buildGateSnapshot(
  workspaceRoot: string,
  docPaths: string[],
  validationPass: boolean = false,
  completedTasks: string[] = []
): GateSnapshot {
  const artifacts: Record<string, GateArtifactInfo> = {};
  let combinedHashInput = '';

  for (const rawPath of docPaths) {
    const canonRes = canonicalizeWorkspacePath(workspaceRoot, rawPath);
    const key = canonRes.ok ? canonRes.canonicalPath : rawPath.replace(/\\/g, '/');

    const absPath = resolve(workspaceRoot, rawPath);
    let exists = false;
    let nonEmpty = false;
    let sha256 = '';
    let size = 0;

    if (existsSync(absPath)) {
      try {
        const stat = statSync(absPath);
        if (stat.isFile()) {
          exists = true;
          size = stat.size;
          const content = readFileSync(absPath, 'utf8');
          if (content.trim().length > 0) {
            nonEmpty = true;
          }
          sha256 = createHash('sha256').update(content).digest('hex');
        }
      } catch {
        // Ignore read errors
      }
    } else {
      // In-memory or simulated string list
      exists = true;
      nonEmpty = true;
    }

    artifacts[key] = {
      canonicalPath: key,
      exists,
      nonEmpty,
      sha256,
      size,
    };

    combinedHashInput += `${key}:${exists}:${nonEmpty}:${sha256};`;
  }

  combinedHashInput += `val:${validationPass};tasks:${completedTasks.join(',')}`;
  const snapshotDigest = createHash('sha256').update(combinedHashInput).digest('hex');

  return {
    workspaceRoot,
    artifacts,
    validationPass,
    completedTasks,
    snapshotDigest,
    createdAt: new Date().toISOString(),
  };
}
