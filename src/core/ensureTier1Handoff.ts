import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { emitJournalSchema, emitManifestSchema } from './schemas/emitManifest.js';
import { journalPath, manifestPath } from './emitTransactionActivate.js';
import { loadExecutionState } from './advanceExecutionState.js';

export type Tier1HandoffHealth =
  | 'not-applicable'
  | 'ready'
  | 'state-required'
  | 'state-corrupt'
  | 'recovery-required';

/**
 * Inspect, but never manufacture, a tier-1 handoff.
 *
 * Before P3 this helper silently created execution-state.json whenever an
 * activated manifest existed. That raced an incomplete emit journal: a later
 * recovery could roll the manifest/docs back while leaving an orphan state.
 * Missing/corrupt state is now a fail-closed condition with an explicit
 * recovery route, not a manifest-only self-heal.
 */
export function ensureTier1Handoff(workspaceRoot: string): Tier1HandoffHealth {
  const manifestFile = manifestPath(workspaceRoot, 'tier1');
  if (!existsSync(manifestFile)) return 'not-applicable';

  try {
    const manifest = emitManifestSchema.parse(JSON.parse(readFileSync(manifestFile, 'utf8')));
    if (!manifest.activated_at) return 'not-applicable';
  } catch {
    return 'state-corrupt';
  }

  const jPath = journalPath(workspaceRoot, 'tier1');
  if (existsSync(jPath)) {
    try {
      const journal = emitJournalSchema.parse(JSON.parse(readFileSync(jPath, 'utf8')));
      if (journal.step !== 'done') return 'recovery-required';
    } catch {
      return 'recovery-required';
    }
  }

  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
  if (!existsSync(execStatePath)) return 'state-required';
  try {
    loadExecutionState(execStatePath);
    return 'ready';
  } catch {
    return 'state-corrupt';
  }
}
