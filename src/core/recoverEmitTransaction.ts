import { existsSync, readFileSync, readdirSync, copyFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { emitJournalSchema, emitManifestSchema } from './schemas/emitManifest.js';
import { journalPath, manifestPath, type EmitChannel } from './emitTransactionActivate.js';

export type RecoverEmitResult = 'no-op' | 'rolled-back' | 'explicit-error';

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
        for (const artifact of staged.data.artifacts) {
          if (!restoredRelPaths.has(artifact.path)) {
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
