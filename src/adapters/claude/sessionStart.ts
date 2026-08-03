import { recoverEmit, migrateInterviewStore, inspectRuntimeHealth, type HealthReport } from '../../core/index.js';

export interface SessionStartResult {
  health: HealthReport;
  // R03 — recover/migrate are still best-effort (there may legitimately be
  // nothing to recover or migrate), but a real failure must be reported to
  // the caller instead of vanishing into an empty catch block. Absent means
  // the step ran with no error, not that it was skipped.
  recover_error?: string;
  migrate_error?: string;
}

export function onSessionStart(ctx: { workspaceRoot: string }): SessionStartResult {
  const result: SessionStartResult = {} as SessionStartResult;

  // 1. Recover any interrupted emit transactions (tier1 and tier2)
  try {
    recoverEmit(ctx.workspaceRoot, 'tier1');
    recoverEmit(ctx.workspaceRoot, 'tier2');
  } catch (err: unknown) {
    result.recover_error = (err as Error).message;
  }

  // 2. Migrate legacy interview state into the canonical store if legacy
  // state exists. Never fabricates fresh state (P2.2a) — a truly uninvolved
  // workspace stays uninvolved until an explicit `init`, which is the sole
  // legitimate initializer.
  try {
    migrateInterviewStore(ctx.workspaceRoot);
  } catch (err: unknown) {
    result.migrate_error = (err as Error).message;
  }

  // 3. Inspect runtime health and hand the real result back to the caller
  // (the hook script) instead of computing it and throwing it away —
  // R03's second half of the same finding.
  result.health = inspectRuntimeHealth(ctx.workspaceRoot);

  return result;
}
