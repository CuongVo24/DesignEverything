import { join } from 'path';
import { loadArtifactCatalog } from './loadArtifactCatalog.js';
import { compileRuntimeCatalog, type RuntimeCatalog } from './compileRuntimeCatalog.js';
import { loadScript } from './loadScript.js';
import { loadShapes } from './loadShapes.js';

/**
 * The single loader every consumer of the compiled runtime catalog should
 * use — emit (tier-1/tier-2) and the write pre-action gate alike — so a
 * catalog digest computed here is always identical no matter which caller
 * asked for it (P6 10.3: "giữ một compiler/catalog authority").
 */
export function loadRuntimeCatalogFor(workspaceRoot: string): RuntimeCatalog {
  const catalog = loadArtifactCatalog(join(workspaceRoot, 'Design/Content/artifact-catalog.yaml'));
  const script = loadScript(join(workspaceRoot, 'Design/Content/interview-script/script.yaml'));
  const shapes = loadShapes(join(workspaceRoot, 'Design/Content/interview-script/shapes.yaml'));
  return compileRuntimeCatalog({ catalog, script, shapes });
}
