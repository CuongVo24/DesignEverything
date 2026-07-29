import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { canonicalizeWorkspacePath } from './pathPolicy.js';
import { manifestPath } from './emitTransactionActivate.js';
import { emitManifestSchema, executionStateSchema, type EmitManifest, type EvidenceRecord } from './schemas/index.js';

export interface GateArtifactInfo {
  canonicalPath: string;
  exists: boolean;
  nonEmpty: boolean;
  sha256: string;
  size: number;
}

export interface GateManifestBinding {
  present: boolean;
  activated: boolean;
  generationId: string | null;
  // Canonical manifest-relative paths (e.g. "docs/00-vision.md") whose bytes
  // on disk no longer match what the active tier-1 manifest activated, or
  // that the manifest claims but which are missing entirely. Empty whenever
  // there is no active manifest — that is "nothing to compare against", not
  // "everything mismatches".
  digestMismatches: string[];
}

export interface GateSnapshotBindings {
  manifest?: EmitManifest | null;
  evidence?: EvidenceRecord[];
  validationDigest?: string;
}

export interface GateSnapshot {
  workspaceRoot: string;
  artifacts: Record<string, GateArtifactInfo>;
  validationPass: boolean;
  completedTasks: string[];
  manifest: GateManifestBinding;
  // task_id -> true for every task with at least one passing (exit_code
  // === 0) EvidenceRecord. Distinct from completedTasks (a caller-supplied
  // string list elsewhere in the pipeline) so `requires_evidence` can be
  // bound to real recorded proof, not just a name appearing in a list.
  evidenceByTask: Record<string, true>;
  validationDigest: string;
  snapshotDigest: string;
  createdAt: string;
}

function loadActiveManifest(workspaceRoot: string): EmitManifest | null {
  const p = manifestPath(workspaceRoot, 'tier1');
  if (!existsSync(p)) return null;
  try {
    const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function loadExecutionStateBits(workspaceRoot: string): { evidence: EvidenceRecord[]; validationDigest: string } {
  const p = join(workspaceRoot, '.design-everything/execution-state.json');
  if (!existsSync(p)) return { evidence: [], validationDigest: '' };
  try {
    const parsed = executionStateSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
    if (!parsed.success) return { evidence: [], validationDigest: '' };
    return { evidence: parsed.data.evidence, validationDigest: parsed.data.validation_result_digest };
  } catch {
    return { evidence: [], validationDigest: '' };
  }
}

function computeManifestBinding(workspaceRoot: string, manifest: EmitManifest | null): GateManifestBinding {
  if (!manifest) {
    return { present: false, activated: false, generationId: null, digestMismatches: [] };
  }
  const mismatches: string[] = [];
  for (const artifact of manifest.artifacts) {
    const abs = resolve(workspaceRoot, artifact.path);
    if (!existsSync(abs)) {
      mismatches.push(artifact.path);
      continue;
    }
    try {
      const content = readFileSync(abs, 'utf8');
      const digest = createHash('sha256').update(content).digest('hex');
      if (digest !== artifact.digest) {
        mismatches.push(artifact.path);
      }
    } catch {
      mismatches.push(artifact.path);
    }
  }
  return {
    present: true,
    activated: manifest.activated_at !== null,
    generationId: manifest.generation_id,
    digestMismatches: mismatches,
  };
}

function computeEvidenceByTask(evidence: EvidenceRecord[]): Record<string, true> {
  const byTask: Record<string, true> = {};
  for (const rec of evidence) {
    if (rec.exit_code === 0) byTask[rec.task_id] = true;
  }
  return byTask;
}

/**
 * DEBT3.1 — the fifth `bindings` param lets callers inject a pre-loaded
 * manifest/evidence/validation-digest (tests, or a caller that already has
 * them in hand); when omitted, they're loaded straight from the workspace's
 * active tier-1 manifest and execution-state.json. A workspace with neither
 * file yet (nothing emitted, nothing executed) degrades to "no manifest" /
 * "no evidence" — the exact same as before this binding existed.
 */
export function buildGateSnapshot(
  workspaceRoot: string,
  docPaths: string[],
  validationPass: boolean = false,
  completedTasks: string[] = [],
  bindings?: GateSnapshotBindings
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
        // A directory (or any non-regular-file entry) at this path is never
        // treated as an existing artifact.
      } catch {
        // Unreadable (e.g. a transient lock during heavy parallel I/O) ->
        // fail closed as missing. `exists` may already have been set true by
        // the statSync above if readFileSync is what threw, so it must be
        // reset here too — otherwise a caller would see exists=true with an
        // empty digest, not the "missing" state the comment promises.
        exists = false;
        nonEmpty = false;
        sha256 = '';
        size = 0;
      }
    }
    // A path that does not exist on disk is always exists=false/nonEmpty=false
    // — it must never be assumed present just because the caller listed it.

    artifacts[key] = {
      canonicalPath: key,
      exists,
      nonEmpty,
      sha256,
      size,
    };

    combinedHashInput += `${key}:${exists}:${nonEmpty}:${sha256};`;
  }

  const manifest = bindings?.manifest !== undefined ? bindings.manifest : loadActiveManifest(workspaceRoot);
  const manifestBinding = computeManifestBinding(workspaceRoot, manifest);

  const needsStateLoad = bindings?.evidence === undefined || bindings?.validationDigest === undefined;
  const stateBits = needsStateLoad ? loadExecutionStateBits(workspaceRoot) : { evidence: [], validationDigest: '' };
  const evidence = bindings?.evidence ?? stateBits.evidence;
  const validationDigest = bindings?.validationDigest ?? stateBits.validationDigest;
  const evidenceByTask = computeEvidenceByTask(evidence);

  combinedHashInput += `val:${validationPass};tasks:${completedTasks.join(',')}`;
  combinedHashInput += `;manifest:${manifestBinding.generationId ?? ''}:${manifestBinding.activated}:${manifestBinding.digestMismatches.join(',')}`;
  combinedHashInput += `;evidence:${Object.keys(evidenceByTask).sort().join(',')}`;
  combinedHashInput += `;validationDigest:${validationDigest}`;
  const snapshotDigest = createHash('sha256').update(combinedHashInput).digest('hex');

  return {
    workspaceRoot,
    artifacts,
    validationPass,
    completedTasks,
    manifest: manifestBinding,
    evidenceByTask,
    validationDigest,
    snapshotDigest,
    createdAt: new Date().toISOString(),
  };
}
