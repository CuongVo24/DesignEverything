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
import { runDerivedRecipe } from './runDerivedRecipe.js';

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

  // 4. Derived-recipe provenance, markdown docs (A1-02, Wave A1) — an
  // artifact whose catalog entry declares source.recipe_ids must show a
  // real provenance signal in the staged content: a "> Nguồn:" line (now
  // emitted per-block by emit.ts's withSourceNote/collectDecisions wiring —
  // see e.g. filledSlots['flow_diagram']/['risk_register']/
  // ['decision_table']), or the recipe's own fallback.on_missing_source
  // text where the content is honestly not answer-derived. This used to be
  // warning-only because no tier-1 template emitted per-item markers yet;
  // now that emit.ts does, a missing marker is a real gap, not a checker
  // limitation, so it blocks activation (error) rather than requiring ack.
  // JSON/state artifacts are excluded here — a text regex can never
  // legitimately match JSON content; see step 5 for their structural check.
  if (derivedRecipes.length > 0) {
    const recipesById = new Map(derivedRecipes.map((r) => [r.id, r]));
    for (const artifact of manifest.artifacts) {
      if (artifact.kind !== 'doc') continue;
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
            severity: 'error',
            message: `Artifact "${artifact.id}" được recipe "${recipeId}" khai báo nguồn, nhưng nội dung staged không có dấu hiệu provenance nào ("> Nguồn:" hoặc fallback unknown).`,
          });
        }
      }
    }
  }

  // 5. Derived-recipe provenance, JSON/state artifacts (A1-02) — the
  // execution-plan.json risks/tasks already carry real `source_refs`
  // (synthesizeExecutionPlan.ts: populated for interview-derived entries,
  // deliberately absent for procedural ones — see planRiskSchema/
  // taskCardSchema's source_refs comment). This runs runDerivedRecipe (the
  // same checker B3b's own unit tests exercise) as production authority for
  // real, not a text-scan proxy for it. Items without source_refs are
  // excluded from the checked set by design — they were never claimed to
  // be answer-derived, so "missing source" doesn't apply to them.
  const EXECUTION_PLAN_JSON_PATH = '.design-everything/execution-plan.json';
  if (derivedRecipes.length > 0 && planArtifact) {
    const recipesById = new Map(derivedRecipes.map((r) => [r.id, r]));
    const catalogEntry = catalog.artifacts.find((a) => a.path === EXECUTION_PLAN_JSON_PATH);
    const recipeIds = catalogEntry?.source.recipe_ids ?? [];
    let planJson: { risks?: unknown[]; tasks?: Record<string, unknown> } | null = null;
    try {
      planJson = JSON.parse(readFileSync(join(stagingDir, planArtifact.path), 'utf8'));
    } catch {
      planJson = null; // already reported as execution-plan-unreadable above
    }

    if (planJson) {
      for (const recipeId of recipeIds) {
        const recipe = recipesById.get(recipeId);
        if (!recipe) continue;
        const knownIds = recipe.inputs.question_ids ?? [];

        const items =
          recipe.id === 'execution-plan-risk-classification'
            ? (planJson.risks ?? [])
                .filter((r): r is { title: string; status: string; source_refs?: string[] } =>
                  Array.isArray((r as { source_refs?: string[] }).source_refs) && (r as { source_refs: string[] }).source_refs.length > 0
                )
                .map((r) => ({ risk: r.title, classification: r.status, source_refs: r.source_refs }))
            : recipe.id === 'build-plan'
              ? Object.values(planJson.tasks ?? {})
                  .filter((t): t is { id: string; intent: string; type: string; source_refs?: string[] } =>
                    Array.isArray((t as { source_refs?: string[] }).source_refs) && (t as { source_refs: string[] }).source_refs.length > 0
                  )
                  .map((t) => ({ task_id: t.id, title: t.intent, source_refs: t.source_refs, tier: t.type }))
              : [];
        if (items.length === 0) continue;

        const result = runDerivedRecipe(recipe, items, knownIds);
        if (!result.all_pass) {
          issues.push({
            id: 'derived-recipe-json-provenance-invalid',
            severity: 'error',
            message: `execution-plan.json's ${recipe.id === 'build-plan' ? 'tasks' : 'risks'} failed derived-recipe coverage for recipe "${recipeId}": ${JSON.stringify(result.item_results.filter((r) => r.coverage === 'flag'))}`,
          });
        }
      }
    }
  }

  const pass = !issues.some((i) => i.severity === 'error');
  return { pass, issues };
}
