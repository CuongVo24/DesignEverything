import { createHash } from 'crypto';
import type { ArtifactCatalog, ArtifactRecord } from './schemas/artifactCatalog.js';
import type { Script } from './schemas/index.js';
import type { ShapesRegistry } from './loadShapes.js';

export interface RuntimeCatalog {
  version: string;
  digest: string;
  artifacts: ArtifactRecord[];
  journeys: Record<string, string[]>;
}

function isQuestionCompatible(qBranch: string, shape: string): boolean {
  if (qBranch === 'core') return true;
  if (shape === 'hybrid') return qBranch === 'web' || qBranch === 'mobile';
  return qBranch === shape;
}

/**
 * Compiles the declarative artifact catalog + interview script + shapes
 * registry into a validated runtime catalog: exact artifact records plus
 * ordered question journeys per shape. This is the single authority CLI/
 * adapters must query for counts and paths — no hardcoded literal lists.
 */
export function compileRuntimeCatalog(inputs: {
  catalog: ArtifactCatalog;
  script: Script;
  shapes: ShapesRegistry;
}): RuntimeCatalog {
  const { catalog, script, shapes } = inputs;
  const shapeIds = new Set(shapes.shapes.map((s) => s.id));
  const releaseDocsByShape = new Map(shapes.shapes.map((s) => [s.id, new Set(s.release_docs)]));

  for (const artifact of catalog.artifacts) {
    for (const shapeRef of artifact.shapes) {
      if (shapeRef !== 'core' && !shapeIds.has(shapeRef)) {
        throw new Error(
          `Artifact ${artifact.id} references unknown shape "${shapeRef}"; must be "core" or one of: ${Array.from(shapeIds).join(', ')}`
        );
      }
    }

    for (const questionId of artifact.source.question_ids) {
      const known = script.questions.some((q) => q.id === questionId);
      if (!known) {
        throw new Error(`Artifact ${artifact.id} references unknown question id: ${questionId}`);
      }
    }

    // Release docs (07-*) must exactly mirror shapes.yaml so the two sources
    // cannot silently drift.
    if (artifact.path && /^docs\/07-/.test(artifact.path)) {
      const fileName = artifact.path.replace(/^docs\//, '');
      for (const shapeId of artifact.shapes) {
        const declared = releaseDocsByShape.get(shapeId);
        if (!declared || !declared.has(fileName)) {
          throw new Error(
            `Artifact ${artifact.id} claims shape "${shapeId}" but shapes.yaml release_docs for that shape does not include ${fileName}`
          );
        }
      }
    }
  }

  const stableArtifacts = [...catalog.artifacts].sort((a, b) => a.id.localeCompare(b.id));
  const digest = createHash('sha256')
    .update(JSON.stringify({ version: catalog.version, artifacts: stableArtifacts }))
    .digest('hex');

  const journeys: Record<string, string[]> = {};
  for (const shape of shapes.shapes) {
    journeys[shape.id] = script.questions
      .filter((q) => q.kind !== 'meta' && isQuestionCompatible(q.branch, shape.id))
      .map((q) => q.id);
  }

  return {
    version: catalog.version,
    digest,
    artifacts: catalog.artifacts,
    journeys,
  };
}

export function listArtifacts(
  catalog: RuntimeCatalog,
  opts: { shape?: string; tier?: 1 | 2 } = {}
): ArtifactRecord[] {
  return catalog.artifacts.filter((artifact) => {
    if (opts.tier !== undefined && artifact.tier !== opts.tier) return false;
    if (opts.shape === undefined) return true;
    return artifact.shapes.includes('core') || artifact.shapes.includes(opts.shape);
  });
}

export function listJourney(catalog: RuntimeCatalog, shape: string): string[] {
  const journey = catalog.journeys[shape];
  if (!journey) {
    throw new Error(`No journey compiled for shape: ${shape}`);
  }
  return journey;
}
