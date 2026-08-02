import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { emitTree, type InterviewAnswers, type EmittedDoc } from './emit.js';
import { type RuntimeCatalog } from './compileRuntimeCatalog.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { prepareEmit, type StagedGeneration } from './emitTransactionStage.js';
import { validateStagedEmit, type StageValidationIssue } from './emitTransactionValidate.js';
import { activateEmit, manifestPath } from './emitTransactionActivate.js';
import { emitManifestSchema } from './schemas/emitManifest.js';
import { loadDerivedRecipes } from './loadDerivedRecipes.js';

export type ActivateTier1EmitResult =
  | {
      ok: true;
      reason_code: 'EMIT_ACTIVATED';
      emitted_files: string[];
      manifest_generation_id: string;
      warnings: StageValidationIssue[];
    }
  | {
      ok: false;
      reason_code: string;
      message: string;
      issues?: StageValidationIssue[];
    };

/**
 * The sole production authority for tier-1 emit. Renders through emitTree,
 * then runs the render -> stage -> validate -> activate transaction kernel
 * (emitTransactionStage/Validate/Activate) so the live tree only ever moves
 * from one complete generation to the next — never a naive per-file
 * writeFileSync loop against docs/ with no staging, validation, or manifest.
 * Callers must never treat a thrown/caught render error as a success by
 * falling back to a stale manifest; every non-`EMIT_ACTIVATED` result here
 * is a real failure to surface as-is.
 */
export function activateTier1Emit(
  workspaceRoot: string,
  answers: InterviewAnswers,
  branch: string
): ActivateTier1EmitResult {
  const templatesDir = join(workspaceRoot, 'Design/Content/doc-templates');

  let docs: EmittedDoc[];
  try {
    docs = emitTree(answers, branch, templatesDir, { workspaceDir: workspaceRoot });
  } catch (err: unknown) {
    return { ok: false, reason_code: 'EMIT_RENDER_FAILED', message: (err as Error).message };
  }

  let catalog: RuntimeCatalog;
  try {
    catalog = loadRuntimeCatalogFor(workspaceRoot);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'EMIT_CATALOG_LOAD_FAILED', message: (err as Error).message };
  }

  let derivedRecipes;
  try {
    derivedRecipes = loadDerivedRecipes(
      join(workspaceRoot, 'Design/Content/interview-script/derived-recipes.yaml')
    ).recipes;
  } catch (err: unknown) {
    return {
      ok: false,
      reason_code: 'EMIT_DERIVED_RECIPES_LOAD_FAILED',
      message: (err as Error).message,
    };
  }

  const inputDigest = createHash('sha256')
    .update(JSON.stringify({ answers, branch }))
    .digest('hex');

  let generation: StagedGeneration;
  try {
    generation = prepareEmit(workspaceRoot, { docs, shape: branch, inputDigest }, catalog);
  } catch (err: unknown) {
    return { ok: false, reason_code: 'EMIT_STAGE_FAILED', message: (err as Error).message };
  }

  const validation = validateStagedEmit(generation, catalog, undefined, derivedRecipes);
  if (!validation.pass) {
    return {
      ok: false,
      reason_code: 'EMIT_VALIDATION_FAILED',
      message: 'Staged tier-1 generation failed validation and was never activated.',
      issues: validation.issues,
    };
  }

  const manifestFile = manifestPath(workspaceRoot, 'tier1');
  let expectedRevision: string | null = null;
  if (existsSync(manifestFile)) {
    let parsed;
    try {
      parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(manifestFile, 'utf8')));
    } catch (err: unknown) {
      return { ok: false, reason_code: 'EMIT_MANIFEST_UNREADABLE', message: (err as Error).message };
    }
    if (!parsed.success) {
      return {
        ok: false,
        reason_code: 'EMIT_MANIFEST_CORRUPT',
        message: `Active emit manifest at ${manifestFile} is corrupt.`,
      };
    }
    expectedRevision = parsed.data.generation_id;
  }

  const activation = activateEmit(workspaceRoot, generation, expectedRevision, 'tier1');
  if (activation.status === 'blocked') {
    return {
      ok: false,
      reason_code: activation.reason === 'revision-mismatch' ? 'EMIT_REVISION_CONFLICT' : 'EMIT_FILE_COLLISION',
      message: activation.details.join('; '),
    };
  }

  return {
    ok: true,
    reason_code: 'EMIT_ACTIVATED',
    emitted_files: activation.manifest.artifacts.map((a) => a.path),
    manifest_generation_id: activation.manifest.generation_id,
    warnings: validation.issues.filter((i) => i.severity === 'warning'),
  };
}
