import { recoverEmit, migrateInterviewStore, inspectRuntimeHealth } from '../../core/index.js';

export function onSessionStart(ctx: { workspaceRoot: string }): void {
  // 1. Recover any interrupted emit transactions (tier1 and tier2)
  try {
    recoverEmit(ctx.workspaceRoot, 'tier1');
    recoverEmit(ctx.workspaceRoot, 'tier2');
  } catch {
    // Graceful recovery attempt
  }

  // 2. Migrate legacy interview state into the canonical store if legacy
  // state exists. Never fabricates fresh state (P2.2a) — a truly uninvolved
  // workspace stays uninvolved until an explicit `init`, which is the sole
  // legitimate initializer.
  try {
    migrateInterviewStore(ctx.workspaceRoot);
  } catch {
    // Graceful migration attempt
  }

  // 3. Inspect runtime health (surfaced to callers via health-aware entry
  // points; SessionStart itself no longer creates or repairs state).
  inspectRuntimeHealth(ctx.workspaceRoot);
}
