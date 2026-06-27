import { join } from 'path';
import { existsSync } from 'fs';
import { loadProgress, saveProgress } from '../../core/index.js';

export function onSessionStart(ctx: { workspaceRoot: string }): void {
  const progressPath = join(ctx.workspaceRoot, 'progress.json');

  if (!existsSync(progressPath)) {
    // 1. File missing -> initialize with default S0 state
    const defaultProgress = loadProgress(progressPath);
    saveProgress(progressPath, defaultProgress);
  } else {
    // 2. File exists -> load and validate schema
    const progress = loadProgress(progressPath);
    // 3. Enforce version 0.1.0 for Batch 1
    if (progress.version !== '0.1.0') {
      throw new Error(`Unsupported progress schema version: ${progress.version}. Expected 0.1.0.`);
    }
  }
}
