import { join } from 'path';
import { existsSync } from 'fs';
import {
  loadProgress,
  saveProgress,
  recoverEmit,
  migrateInterviewStore,
  inspectRuntimeHealth,
} from '../../core/index.js';

export function onSessionStart(ctx: { workspaceRoot: string }): void {
  // 1. Recover any interrupted emit transactions (tier1 and tier2)
  try {
    recoverEmit(ctx.workspaceRoot, 'tier1');
    recoverEmit(ctx.workspaceRoot, 'tier2');
  } catch {
    // Graceful recovery attempt
  }

  // 2. Migrate interview store to canonical format if needed
  try {
    migrateInterviewStore(ctx.workspaceRoot);
  } catch {
    // Graceful migration attempt
  }

  // 3. Inspect runtime health
  inspectRuntimeHealth(ctx.workspaceRoot);

  // 4. Load or initialize progress state
  const progressPath = join(ctx.workspaceRoot, 'progress.json');

  if (!existsSync(progressPath)) {
    const defaultProgress = loadProgress(progressPath);
    saveProgress(progressPath, defaultProgress);
  } else {
    const progress = loadProgress(progressPath);
    if (progress.version !== '0.1.0' && progress.version !== '7.0.0') {
      throw new Error(`Unsupported progress schema version: ${progress.version}. Expected 0.1.0.`);
    }
  }
}
