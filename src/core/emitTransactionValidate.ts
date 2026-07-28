import { readFileSync } from 'fs';
import { join } from 'path';
import type { StagedGeneration } from './emitTransactionStage.js';
import type { RuntimeCatalog } from './compileRuntimeCatalog.js';
import { listArtifacts } from './compileRuntimeCatalog.js';
import { executionPlanSchemaV3 } from './schemas/executionPlan.js';
import { checkDocsConsistency } from './checkDocsConsistency.js';
import type { EmittedDoc } from './emit.js';
import type { ProjectProfile } from './schemas/index.js';
import type { DerivedRecipe } from './schemas/derivedRecipes.js';

export interface StageValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface StageValidationResult {
  pass: boolean;
  issues: StageValidationIssue[];
}

/**
 * Preflight over a staged generation, run BEFORE activateEmit ever touches
 * the live tree: schema validity of the machine-readable plan, catalog
 * completeness for the shape being emitted, and cross-doc consistency.
 * Any `error` severity issue must block activation; `warning` requires an
 * explicit user acknowledgement upstream (B3a/B3b), never an auto-pass.
 */
export function validateStagedEmit(
  generation: StagedGeneration,
  catalog: RuntimeCatalog,
  profile?: Pick<ProjectProfile, 'language'> | null,
  derivedRecipes: DerivedRecipe[] = []
): StageValidationResult {
  const issues: StageValidationIssue[] = [];
  const { manifest, stagingDir } = generation;

  // 1. Catalog completeness — every required tier-1 artifact for this shape
  // must be present in the staged manifest, by exact catalog id. Convention
  // files (docs/conventions/*) are emitted through a separate transaction
  // (emitProjectConventions.ts) and are intentionally excluded here.
  const requiredIds = new Set(
    listArtifacts(catalog, { shape: manifest.shape, tier: 1 })
      .filter((a) => a.required && a.kind !== 'convention')
      .map((a) => a.id)
  );
  const stagedIds = new Set(manifest.artifacts.map((a) => a.id));
  for (const requiredId of requiredIds) {
    if (!stagedIds.has(requiredId)) {
      issues.push({
        id: 'catalog-completeness-missing',
        severity: 'error',
        message: `Staged generation is missing required artifact: ${requiredId}`,
      });
    }
  }

  // 2. Machine-readable plan schema — execution-plan.json must parse and
  // conform to executionPlanSchemaV3 before it can ever reach the live tree.
  const planArtifact = manifest.artifacts.find(
    (a) => a.path === '.design-everything/execution-plan.json'
  );
  if (planArtifact) {
    try {
      const raw = readFileSync(join(stagingDir, planArtifact.path), 'utf8');
      const parsed = executionPlanSchemaV3.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        issues.push({
          id: 'execution-plan-schema-invalid',
          severity: 'error',
          message: `Staged execution-plan.json failed schema validation: ${JSON.stringify(parsed.error.format())}`,
        });
      }
    } catch (err: unknown) {
      issues.push({
        id: 'execution-plan-unreadable',
        severity: 'error',
        message: `Could not read/parse staged execution-plan.json: ${(err as Error).message}`,
      });
    }
  }

  // 3. Cross-doc consistency — reuses the B7/B4 rule engine (path/command
  // conventions) over the staged doc contents; conflicts are warnings that
  // require the skill layer to fix the stale slot and re-emit.
  const docsForConsistency: EmittedDoc[] = manifest.artifacts
    .filter((a) => a.kind === 'doc' && a.path.startsWith('docs/'))
    .map((a) => ({
      file: a.path.replace(/^docs\//, ''),
      content: readFileSync(join(stagingDir, a.path), 'utf8'),
    }));
  const consistencyWarnings = checkDocsConsistency(docsForConsistency, profile ?? null);
  for (const warning of consistencyWarnings) {
    issues.push({
      id: `docs-consistency-${warning.id}`,
      severity: 'warning',
      message: warning.message,
    });
  }

  // 4. Derived-recipe provenance (P6 10.2) — an artifact whose catalog entry
  // declares source.recipe_ids must show SOME provenance signal (a
  // "> Nguồn:" line, tier2RenderHelpers' established convention, or the
  // recipe's own fallback.on_missing_source text) somewhere in the staged
  // content. Deliberately coarse and warning-only: no tier-1 doc-template
  // emits per-item SourceRef markers yet (that convention only exists for
  // tier-2 render today, via assembleArtifact), so a hard per-item check via
  // runDerivedRecipe would need structured items no current renderer
  // produces — promoting this to error-severity needs template-authoring
  // work, tracked separately.
  if (derivedRecipes.length > 0) {
    const recipesById = new Map(derivedRecipes.map((r) => [r.id, r]));
    for (const artifact of manifest.artifacts) {
      const catalogEntry = catalog.artifacts.find((a) => a.id === artifact.id);
      const recipeIds = catalogEntry?.source.recipe_ids ?? [];
      if (recipeIds.length === 0) continue;

      let content: string;
      try {
        content = readFileSync(join(stagingDir, artifact.path), 'utf8');
      } catch {
        continue; // unreadable staged file is already reported elsewhere
      }
      const hasSourceMarker = /^>\s*Nguồn:/m.test(content);

      for (const recipeId of recipeIds) {
        const recipe = recipesById.get(recipeId);
        if (!recipe) continue;
        const hasUnknownMarker = content.includes(recipe.fallback.on_missing_source.trim());
        if (!hasSourceMarker && !hasUnknownMarker) {
          issues.push({
            id: 'derived-recipe-provenance-missing',
            severity: 'warning',
            message: `Artifact "${artifact.id}" được recipe "${recipeId}" khai báo nguồn, nhưng nội dung staged không có dấu hiệu provenance nào ("> Nguồn:" hoặc fallback unknown).`,
          });
        }
      }
    }
  }

  const pass = !issues.some((i) => i.severity === 'error');
  return { pass, issues };
}
