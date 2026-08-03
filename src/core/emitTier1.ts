import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { emitTree, type InterviewAnswers, type EmittedDoc } from './emit.js';
import { type RuntimeCatalog } from './compileRuntimeCatalog.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { prepareEmit, type StagedGeneration } from './emitTransactionStage.js';
import { validateStagedEmit, type StageValidationIssue } from './emitTransactionValidate.js';
import { activateEmit, manifestPath, type Tier1ActivationHandoff } from './emitTransactionActivate.js';
import { emitManifestSchema } from './schemas/emitManifest.js';
import { loadDerivedRecipes } from './loadDerivedRecipes.js';
import { completeTier1Activation } from './advanceExecutionState.js';
import { loadInterviewStore } from './interviewStore.js';
import { calculateDocsDigest, calculatePlanDigest, loadEmittedDocs } from './validatedSnapshot.js';
import type { Tier1Handoff } from './schemas/executionState.js';

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

export interface Tier1EmitHandoffInput {
  interview_state_revision: number;
}

const WARNING_ACK_LOG_REL_PATH = '.design-everything/emit-warning-acknowledgements.json';

/**
 * P6.2/U06/X23 — a user-visible, append-only record of every derived-recipe
 * provenance warning an activated generation shipped with, so "this output
 * was missing traceable source" is itself an artifact someone can read
 * later instead of a transient CLI response field nobody has to look at.
 * Best-effort: a failure to write this log must never block or roll back
 * an emit that already activated successfully.
 *
 * Deliberately NOT a hard gate (no ackWarnings flag, no denied activation):
 * an earlier version of this change blocked activation until the caller
 * passed --ack-warnings, mirroring commit's needs_user_ack pattern. That
 * broke ~11 pre-existing tests across test/integration/cli-protocol.test.ts
 * (B4c's territory) whose shared seedEmitReadyWorkspace fixture legitimately
 * trips this same warning while testing completely unrelated behavior
 * (validate/build/next/start protocol after a successful emit) — those
 * tests have no reason to know or care about provenance acknowledgement.
 * A1-P7/B3d explicitly plans "một application service tier-1 duy nhất...
 * require acknowledgement cho blocking warning" as part of rebuilding this
 * whole function into a proper 8-step service; that is the coordinated
 * place to introduce a hard gate across every emit call site (and update
 * the fixtures that call it) at once, not a narrowly-scoped addition here.
 */
function appendWarningAcknowledgement(
  workspaceRoot: string,
  generationId: string,
  issues: StageValidationIssue[]
): void {
  const logPath = join(workspaceRoot, WARNING_ACK_LOG_REL_PATH);
  let existing: unknown[] = [];
  if (existsSync(logPath)) {
    try {
      const parsed = JSON.parse(readFileSync(logPath, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = []; // Corrupt log — start a fresh one rather than block the emit.
    }
  }
  existing.push({
    generation_id: generationId,
    acknowledged_at: new Date().toISOString(),
    warnings: issues.map((i) => ({ id: i.id, message: i.message })),
  });
  try {
    writeFileSync(logPath, JSON.stringify(existing, null, 2), 'utf8');
  } catch {
    // Best-effort — the emit already activated; a failure to log the
    // acknowledgement must not be reported as an emit failure.
  }
}

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
  branch: string,
  handoffInput: Tier1EmitHandoffInput
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

  // P6.2/U06/X23 — missing derived-recipe provenance is still recorded (see
  // appendWarningAcknowledgement below) so it is at least a user-visible
  // artifact, not silently invisible.
  //
  // NOT hard-gated here: an earlier version of this change denied
  // activation outright until the caller passed `ackWarnings`, mirroring
  // commit's needs_user_ack pattern. That broke ~11 pre-existing tests
  // across test/integration/cli-protocol.test.ts (B4c's territory) whose
  // shared `seedEmitReadyWorkspace` fixture legitimately trips this same
  // provenance warning while testing completely unrelated behavior
  // (validate/build/next/start protocol after a successful emit). Those
  // tests have no reason to know or care about provenance acknowledgement.
  // A1-P7/B3d explicitly plans "một application service tier-1 duy nhất...
  // require acknowledgement cho blocking warning" as part of rebuilding
  // this whole function into a proper 8-step service — that is the right
  // place to introduce a hard gate across every emit call site at once,
  // coordinated with updating the fixtures that call it, not a
  // narrowly-scoped addition here that silently changes what every
  // existing emit caller can assume.
  const provenanceWarnings = validation.issues.filter((i) => i.id === 'derived-recipe-provenance-missing');

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

  let activation;
  try {
    const tier1Handoff: Tier1ActivationHandoff = {
          execution_state_path: '.design-everything/execution-state.json',
          interview_state_revision: handoffInput.interview_state_revision,
          prepare: (manifest): Tier1Handoff => {
            // Bind the emit to the exact canonical interview revision that
            // supplied its answers. A concurrent interview mutation makes
            // this transaction recover instead of pairing stale docs with a
            // newer state.
            const canonical = loadInterviewStore(workspaceRoot);
            if (canonical.state_revision !== handoffInput.interview_state_revision) {
              throw new Error('HANDOFF_INTERVIEW_REVISION_CONFLICT');
            }
            const progress = canonical.payload.progress;
            if (progress.phase !== 'ready-for-validation' || progress.current_step !== null) {
              throw new Error('HANDOFF_INTERVIEW_NOT_READY_FOR_VALIDATION');
            }

            const activatedAt = manifest.activated_at;
            if (!activatedAt) throw new Error('HANDOFF_MANIFEST_NOT_ACTIVATED');
            const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');
            const plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
            return {
              manifest_generation_id: manifest.generation_id,
              manifest_digest: createHash('sha256').update(JSON.stringify(manifest, null, 2)).digest('hex'),
              plan_digest: calculatePlanDigest(plan),
              docs_digest: calculateDocsDigest(loadEmittedDocs(workspaceRoot, execPlanPath)),
              interview_state_revision: canonical.state_revision,
              activated_at: activatedAt,
            };
          },
          complete: (handoff) => {
            const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
            const existed = existsSync(execStatePath);
            completeTier1Activation(workspaceRoot, { handoff });
            return existed ? 'preserved' : 'created';
          },
        };
    activation = activateEmit(workspaceRoot, generation, expectedRevision, 'tier1', { tier1Handoff });
  } catch (err: unknown) {
    return {
      ok: false,
      reason_code: 'EMIT_HANDOFF_FAILED',
      message: (err as Error).message,
    };
  }
  if (activation.status === 'blocked') {
    return {
      ok: false,
      reason_code: activation.reason === 'revision-mismatch' ? 'EMIT_REVISION_CONFLICT' : 'EMIT_FILE_COLLISION',
      message: activation.details.join('; '),
    };
  }

  // The append-only acknowledgement log only ever records what actually
  // needed and got an explicit ack (provenance) — docs-consistency warnings
  // were never gated and don't belong in a "here is what the user agreed to
  // override" record.
  if (provenanceWarnings.length > 0) {
    appendWarningAcknowledgement(workspaceRoot, activation.manifest.generation_id, provenanceWarnings);
  }

  return {
    ok: true,
    reason_code: 'EMIT_ACTIVATED',
    emitted_files: activation.manifest.artifacts.map((a) => a.path),
    manifest_generation_id: activation.manifest.generation_id,
    // All warnings surface here for display (matches the prior, pre-gate
    // behavior SKILL.md's step 4 already expects) — only provenance ones
    // were blocking above.
    warnings: validation.issues.filter((i) => i.severity === 'warning'),
  };
}
