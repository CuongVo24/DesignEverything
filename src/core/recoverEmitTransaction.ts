import { existsSync, readFileSync, readdirSync, copyFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { emitJournalSchema, emitManifestSchema } from './schemas/emitManifest.js';
import { executionStateSchema } from './schemas/executionState.js';
import { journalPath, manifestPath, type EmitChannel } from './emitTransactionActivate.js';

export type RecoverEmitResult = 'no-op' | 'rolled-back' | 'explicit-error';

function handoffMatchesJournal(
  state: unknown,
  handoff: NonNullable<ReturnType<typeof emitJournalSchema.parse>['handoff']>
): boolean {
  const parsed = executionStateSchema.safeParse(state);
  if (!parsed.success || !parsed.data.handoff) return false;
  const binding = parsed.data.handoff;
  return (
    binding.manifest_generation_id === handoff.manifest_generation_id &&
    binding.manifest_digest === handoff.manifest_digest &&
    binding.plan_digest === handoff.plan_digest &&
    binding.docs_digest === handoff.docs_digest &&
    binding.interview_state_revision === handoff.interview_state_revision
  );
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * Crash-recovery entry point: inspects the emit journal left by
 * activateEmit and, if a promotion was interrupted, always rolls back to
 * the last known-good state (restore every backed-up file, delete any file
 * newly created by the interrupted promotion). Idempotent — safe to call
 * repeatedly, and a no-op once nothing is in flight.
 */
export function recoverEmit(root: string, channel: EmitChannel = 'tier1'): RecoverEmitResult {
  const jPath = journalPath(root, channel);
  if (!existsSync(jPath)) return 'no-op';

  let journal;
  try {
    journal = emitJournalSchema.parse(JSON.parse(readFileSync(jPath, 'utf8')));
  } catch {
    return 'explicit-error';
  }

  if (journal.step === 'done') return 'no-op';

  try {
    // The only state file recovery may delete is one whose persisted handoff
    // provenance matches this incomplete journal exactly. This protects a
    // newer/re-emitted execution state from an old journal rollback.
    if (journal.handoff) {
      const handoffStatePath = join(root, journal.handoff.execution_state_path);
      if (existsSync(handoffStatePath)) {
        let rawState: unknown;
        try {
          rawState = JSON.parse(readFileSync(handoffStatePath, 'utf8'));
        } catch {
          return 'explicit-error';
        }
        const matches = handoffMatchesJournal(rawState, journal.handoff);
        if (matches) {
          unlinkSync(handoffStatePath);
        } else if (journal.handoff.state_status === 'created') {
          // The journal says it created a state but the bytes are not the
          // bound state it recorded. Refuse to delete or overwrite anything.
          return 'explicit-error';
        }
      }
    }

    const backupDir = join(root, journal.backup_dir);
    const backedUpFiles = listFilesRecursive(backupDir);
    const restoredRelPaths = new Set<string>();

    for (const absBackup of backedUpFiles) {
      const relPath = relative(backupDir, absBackup).replace(/\\/g, '/');
      const dest = join(root, relPath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(absBackup, dest);
      restoredRelPaths.add(relPath);
    }

    // No backup existed for the manifest itself only when this was the very
    // first emit (nothing active before it) — remove whatever the
    // interrupted promotion wrote instead of leaving a half-active pointer.
    const manifestRelPath = manifestPath(root, channel).slice(root.length + 1).replace(/\\/g, '/');
    if (
      journal.previous_generation_id === null &&
      !restoredRelPaths.has(manifestRelPath) &&
      existsSync(manifestPath(root, channel))
    ) {
      unlinkSync(manifestPath(root, channel));
    }

    // Delete any staged artifact path that was newly created (not an
    // overwrite) by the interrupted promotion — it has no backup entry.
    const stagedManifestPath = join(root, '.design-everything/staging', journal.generation_id, 'manifest.json');
    if (existsSync(stagedManifestPath)) {
      const staged = emitManifestSchema.safeParse(JSON.parse(readFileSync(stagedManifestPath, 'utf8')));
      if (staged.success) {
        let prevManagedPaths = new Set<string>();
        if (journal.previous_generation_id) {
          const prevBackupManifest = join(backupDir, manifestRelPath);
          if (existsSync(prevBackupManifest)) {
            const parsedPrev = emitManifestSchema.safeParse(JSON.parse(readFileSync(prevBackupManifest, 'utf8')));
            if (parsedPrev.success) {
              prevManagedPaths = new Set(parsedPrev.data.artifacts.map((a) => a.path));
            }
          } else {
            // Backup manifest wasn't copied yet, read active manifest if it matches previous_generation_id
            const activeMPath = manifestPath(root, channel);
            if (existsSync(activeMPath)) {
              const parsedActive = emitManifestSchema.safeParse(JSON.parse(readFileSync(activeMPath, 'utf8')));
              if (parsedActive.success && parsedActive.data.generation_id === journal.previous_generation_id) {
                prevManagedPaths = new Set(parsedActive.data.artifacts.map((a) => a.path));
              }
            }
          }
        }

        for (const artifact of staged.data.artifacts) {
          if (!restoredRelPaths.has(artifact.path) && !prevManagedPaths.has(artifact.path)) {
            const live = join(root, artifact.path);
            if (existsSync(live)) unlinkSync(live);
          }
        }
      }
    }

    rmSync(jPath, { force: true });
    return 'rolled-back';
  } catch {
    return 'explicit-error';
  }
}
