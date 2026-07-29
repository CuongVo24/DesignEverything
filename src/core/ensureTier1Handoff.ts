import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { emitManifestSchema } from './schemas/emitManifest.js';
import { manifestPath } from './emitTransactionActivate.js';
import { completeTier1Activation } from './advanceExecutionState.js';

/**
 * Closes a real crash window: production `emit` (handleEmit in
 * cliOperations.ts) calls activateTier1Emit (promotes docs, activates the
 * tier-1 manifest) and then completeTier1Activation (creates
 * execution-state.json at plan-validating) as two separate, sequential
 * calls — not one transaction. A process killed between them leaves a
 * workspace with docs live and a tier-1 manifest activated, but no
 * execution-state.json at all, and nothing else in the system ever creates
 * one. Every subsequent read (status/next/hooks) would then either treat
 * the workspace as still mid-interview or deny with
 * EXECUTION_STATE_REQUIRED forever, even though tier-1 emit itself fully
 * succeeded.
 *
 * This is the self-heal: call it at the top of every CLI entry point. It is
 * a no-op unless the tier-1 manifest is genuinely activated AND
 * execution-state.json is genuinely missing, and it delegates to
 * completeTier1Activation, which is itself idempotent (never resets state
 * that already progressed past plan-validating) — so calling this on every
 * invocation, including ones where the handoff already completed normally,
 * is always safe.
 */
export function ensureTier1Handoff(workspaceRoot: string): void {
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  if (existsSync(execStatePath)) return;

  const tier1ManifestPath = manifestPath(workspaceRoot, 'tier1');
  if (!existsSync(tier1ManifestPath)) return;

  let parsed;
  try {
    parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(tier1ManifestPath, 'utf8')));
  } catch {
    return;
  }
  if (!parsed.success || !parsed.data.activated_at) return;

  completeTier1Activation(workspaceRoot);
}
