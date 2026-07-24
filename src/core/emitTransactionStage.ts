import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash, randomBytes } from 'crypto';
import type { EmittedDoc } from './emit.js';
import type { RuntimeCatalog } from './compileRuntimeCatalog.js';
import type { ArtifactRecord } from './schemas/artifactCatalog.js';
import type { EmitManifest, EmitManifestArtifact } from './schemas/emitManifest.js';

export interface StagedGeneration {
  generation_id: string;
  root: string;
  stagingDir: string;
  manifest: EmitManifest;
}

function normalizePath(file: string): string {
  const posix = file.replace(/\\/g, '/');
  if (posix.startsWith('.design-everything/') || posix.startsWith('docs/')) {
    return posix;
  }
  return `docs/${posix}`;
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const withPlaceholders = escaped.replace(/\\\{[^}]+\\\}/g, '[^/]+');
  return new RegExp(`^${withPlaceholders}$`);
}

function findCatalogArtifact(catalog: RuntimeCatalog, path: string): ArtifactRecord | undefined {
  const exact = catalog.artifacts.find((a) => a.path === path);
  if (exact) return exact;
  return catalog.artifacts.find((a) => a.path_pattern && patternToRegex(a.path_pattern).test(path));
}

/**
 * Renders every artifact into `.design-everything/staging/<generation_id>/`
 * on the same volume as the live tree (so activateEmit can promote with a
 * cheap same-filesystem copy/rename instead of a cross-device move) and
 * computes the manifest that describes exactly what promotion will write.
 * Never touches the live docs/ or .design-everything/ paths — the caller
 * must go through activateEmit for that.
 */
export function prepareEmit(
  root: string,
  inputs: { docs: EmittedDoc[]; shape: string; inputDigest: string },
  catalog: RuntimeCatalog
): StagedGeneration {
  const generation_id = `gen-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const stagingDir = join(root, '.design-everything/staging', generation_id);

  const artifacts: EmitManifestArtifact[] = [];
  const seenPaths = new Set<string>();

  for (const doc of inputs.docs) {
    const path = normalizePath(doc.file);
    if (seenPaths.has(path)) {
      throw new Error(`prepareEmit: duplicate artifact path in render output: ${path}`);
    }
    seenPaths.add(path);

    const catalogEntry = findCatalogArtifact(catalog, path);
    if (!catalogEntry) {
      throw new Error(`prepareEmit: rendered artifact ${path} is not declared in the artifact catalog`);
    }

    const absStagePath = join(stagingDir, path);
    mkdirSync(dirname(absStagePath), { recursive: true });
    writeFileSync(absStagePath, doc.content, 'utf8');

    const digest = createHash('sha256').update(doc.content).digest('hex');
    artifacts.push({
      id: catalogEntry.id,
      path,
      digest,
      ownership: catalogEntry.ownership,
      kind: catalogEntry.kind,
    });
  }

  const manifest: EmitManifest = {
    version: '1.0.0',
    generation_id,
    shape: inputs.shape,
    catalog_version: catalog.version,
    catalog_digest: catalog.digest,
    input_digest: inputs.inputDigest,
    artifacts,
    created_at: new Date().toISOString(),
    activated_at: null,
  };

  mkdirSync(stagingDir, { recursive: true });
  writeFileSync(join(stagingDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  return { generation_id, root, stagingDir, manifest };
}

export function stagingDirFor(root: string, generationId: string): string {
  return join(root, '.design-everything/staging', generationId);
}

export function isStaged(root: string, generationId: string): boolean {
  return existsSync(join(stagingDirFor(root, generationId), 'manifest.json'));
}
