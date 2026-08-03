import fs from 'fs';
import { join, dirname } from 'path';
import type { StagedGeneration } from './emitTransactionStage.js';
import {
  emitManifestSchema,
  type EmitManifest,
  type EmitJournal,
  type EmitJournalHandoff,
} from './schemas/emitManifest.js';
import type { DeepenModuleId } from './schemas/deepenScript.js';
import type { Tier1Handoff } from './schemas/executionState.js';

export type ActivateEmitResult =
  | { status: 'activated'; manifest: EmitManifest }
  | { status: 'blocked'; reason: 'revision-mismatch' | 'user-file-collision'; details: string[] };

/**
 * Tier-1's design-to-build handoff is finalized while the emit journal is
 * still in flight. The callback must be side-effect free until `complete`,
 * then create/preserve the state bound by `prepare` before this transaction
 * can be marked done.
 */
export interface Tier1ActivationHandoff {
  execution_state_path: '.design-everything/execution-state.json';
  interview_state_revision: number;
  prepare: (manifest: EmitManifest) => Tier1Handoff;
  complete: (handoff: Tier1Handoff) => 'created' | 'preserved';
}

// P7.2 — `tier2-${module}` gives each tier-2 module its own manifest/
// journal/backup namespace (re-emitting one module must never treat
// another module's managed files as stale). A hyphen, not a colon, is the
// separator deliberately — `:` is invalid inside a Windows filename
// component, and manifestPath/journalPath/backupDirFor below splice the
// channel directly into one.
export type EmitChannel = 'tier1' | 'tier2' | `tier2-${DeepenModuleId}`;

/**
 * Tier-1 and tier-2 (deepen) each get their own manifest/journal/backup
 * namespace so re-emitting one never treats the other's managed files as
 * stale. `tier1` keeps the original unscoped paths for backward compat.
 */
export function manifestPath(root: string, channel: EmitChannel = 'tier1'): string {
  return channel === 'tier1'
    ? join(root, '.design-everything/emit-manifest.json')
    : join(root, `.design-everything/emit-manifest-${channel}.json`);
}

export function journalPath(root: string, channel: EmitChannel = 'tier1'): string {
  return channel === 'tier1'
    ? join(root, '.design-everything/emit-journal.json')
    : join(root, `.design-everything/emit-journal-${channel}.json`);
}

function backupDirFor(channel: EmitChannel, generationId: string): string {
  return channel === 'tier1'
    ? `.design-everything/backups/${generationId}`
    : `.design-everything/backups/${channel}/${generationId}`;
}

function readActiveManifest(root: string, channel: EmitChannel): EmitManifest | null {
  const p = manifestPath(root, channel);
  if (!fs.existsSync(p)) return null;
  const parsed = emitManifestSchema.safeParse(JSON.parse(fs.readFileSync(p, 'utf8')));
  if (!parsed.success) {
    throw new Error(`Active emit manifest at ${p} is corrupt: ${JSON.stringify(parsed.error.format())}`);
  }
  return parsed.data;
}

function writeJournal(root: string, channel: EmitChannel, journal: EmitJournal): void {
  const p = journalPath(root, channel);
  fs.mkdirSync(dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(journal, null, 2), 'utf8');
}

function backupFile(root: string, backupDir: string, relPath: string): void {
  const live = join(root, relPath);
  if (!fs.existsSync(live)) return;
  const dest = join(root, backupDir, relPath);
  fs.mkdirSync(dirname(dest), { recursive: true });
  fs.copyFileSync(live, dest);
}

/**
 * Promotes a validated staged generation into the live tree with a
 * backup-then-promote journal: nothing is overwritten or deleted before its
 * current content is copied into `.design-everything/backups/<generation_id>/`,
 * so a crash mid-promotion can always be undone by recoverEmit. Unknown
 * user-owned files at a target path abort the whole activation before any
 * mutation happens — never silently adopted or overwritten.
 */
export function activateEmit(
  root: string,
  generation: StagedGeneration,
  expectedRevision: string | null,
  channel: EmitChannel = 'tier1',
  options: { tier1Handoff?: Tier1ActivationHandoff } = {}
): ActivateEmitResult {
  if (options.tier1Handoff && channel !== 'tier1') {
    throw new Error('TIER1_HANDOFF_REQUIRES_TIER1_CHANNEL');
  }
  const tier1Handoff = options.tier1Handoff;
  const current = readActiveManifest(root, channel);
  const currentGenerationId = current?.generation_id ?? null;
  if (expectedRevision !== currentGenerationId) {
    return {
      status: 'blocked',
      reason: 'revision-mismatch',
      details: [`expected active generation ${expectedRevision ?? '(none)'}, found ${currentGenerationId ?? '(none)'}`],
    };
  }

  const oldManagedByPath = new Map(
    (current?.artifacts ?? []).filter((a) => a.ownership === 'managed').map((a) => [a.path, a])
  );
  const newPaths = new Set(generation.manifest.artifacts.map((a) => a.path));

  const collisions: string[] = [];
  for (const artifact of generation.manifest.artifacts) {
    const live = join(root, artifact.path);
    if (fs.existsSync(live) && !oldManagedByPath.has(artifact.path)) {
      collisions.push(artifact.path);
    }
  }
  if (collisions.length > 0) {
    return { status: 'blocked', reason: 'user-file-collision', details: collisions };
  }

  const staleManagedPaths = [...oldManagedByPath.keys()].filter((p) => !newPaths.has(p));
  const backupDir = backupDirFor(channel, generation.generation_id);
  const manifestRelPath = manifestPath(root, channel).slice(root.length + 1).replace(/\\/g, '/');

  writeJournal(root, channel, {
    generation_id: generation.generation_id,
    step: 'backing-up',
    backup_dir: backupDir,
    previous_generation_id: currentGenerationId,
    started_at: new Date().toISOString(),
  });

  if (fs.existsSync(manifestPath(root, channel))) {
    const dest = join(root, backupDir, manifestRelPath);
    fs.mkdirSync(dirname(dest), { recursive: true });
    fs.copyFileSync(manifestPath(root, channel), dest);
  }
  if (tier1Handoff) {
    backupFile(root, backupDir, tier1Handoff.execution_state_path);
  }
  for (const artifact of generation.manifest.artifacts) {
    backupFile(root, backupDir, artifact.path);
  }
  for (const path of staleManagedPaths) {
    backupFile(root, backupDir, path);
  }

  writeJournal(root, channel, {
    generation_id: generation.generation_id,
    step: 'promoting',
    backup_dir: backupDir,
    previous_generation_id: currentGenerationId,
    started_at: new Date().toISOString(),
  });

  for (const artifact of generation.manifest.artifacts) {
    const src = join(generation.stagingDir, artifact.path);
    const dest = join(root, artifact.path);
    fs.mkdirSync(dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  for (const path of staleManagedPaths) {
    const live = join(root, path);
    if (fs.existsSync(live)) fs.unlinkSync(live);
  }

  writeJournal(root, channel, {
    generation_id: generation.generation_id,
    step: 'writing-manifest',
    backup_dir: backupDir,
    previous_generation_id: currentGenerationId,
    started_at: new Date().toISOString(),
  });

  const activatedManifest: EmitManifest = {
    ...generation.manifest,
    activated_at: new Date().toISOString(),
  };
  fs.mkdirSync(dirname(manifestPath(root, channel)), { recursive: true });
  fs.writeFileSync(manifestPath(root, channel), JSON.stringify(activatedManifest, null, 2), 'utf8');

  let handoffJournal: EmitJournalHandoff | undefined;
  if (tier1Handoff) {
    const handoff = tier1Handoff.prepare(activatedManifest);
    handoffJournal = {
      execution_state_path: tier1Handoff.execution_state_path,
      interview_state_revision: tier1Handoff.interview_state_revision,
      manifest_generation_id: handoff.manifest_generation_id,
      manifest_digest: handoff.manifest_digest,
      plan_digest: handoff.plan_digest,
      docs_digest: handoff.docs_digest,
      state_status: 'pending',
    };
    writeJournal(root, channel, {
      generation_id: generation.generation_id,
      step: 'handoff-pending',
      backup_dir: backupDir,
      previous_generation_id: currentGenerationId,
      started_at: new Date().toISOString(),
      handoff: handoffJournal,
    });

    const disposition = tier1Handoff.complete(handoff);
    handoffJournal = {
      ...handoffJournal,
      state_status: disposition,
    };
    // Keep the journal at handoff-pending until the completed state binding
    // itself is durable. A crash here is recoverable because both the exact
    // handoff identity and the prior execution-state backup are recorded.
    writeJournal(root, channel, {
      generation_id: generation.generation_id,
      step: 'handoff-pending',
      backup_dir: backupDir,
      previous_generation_id: currentGenerationId,
      started_at: new Date().toISOString(),
      handoff: handoffJournal,
    });
  }

  writeJournal(root, channel, {
    generation_id: generation.generation_id,
    step: 'done',
    backup_dir: backupDir,
    previous_generation_id: currentGenerationId,
    started_at: new Date().toISOString(),
    handoff: handoffJournal,
  });

  return { status: 'activated', manifest: activatedManifest };
}
