export * from './schemas/index.js';
// P9 — RUNTIME_VERSION lives in src/version.ts (single source of truth,
// commit 564c204) but was never actually re-exported through this barrel
// despite runtimeBundleEntry.ts's doc comment claiming it is one of the
// symbols `export * from './core/index.js'` surfaces. Every adapter
// (cliOperations.ts, cliResult.ts, deepenCliOperations.ts, runtimeHealth.ts)
// imports it directly from '../version.js'/'../../version.js', so this gap
// was invisible until something needed RUNTIME_VERSION from the compiled
// bundle's own export surface (runtime-bundle.test.ts, tampered-runtime.test.ts)
// — a fresh `npm run build:bundle` silently ships a bundle with no
// RUNTIME_VERSION export at all.
export { RUNTIME_VERSION } from '../version.js';
export { loadScript } from './loadScript.js';
export { loadGatePolicy } from './loadGatePolicy.js';
export { loadProgress, saveProgress } from './loadProgress.js';
export { loadInterviewStore, transactInterviewStore, computePayloadChecksum, initializeInterviewStore } from './interviewStore.js';
export { migrateInterviewStore } from './migrateInterviewStore.js';
export type { MigrateInterviewStoreOutcome } from './migrateInterviewStore.js';
export {
  ensureCanonicalStore,
  issuePromptCapability,
  commitInterviewAnswer,
} from './interviewApplicationServices.js';
export type {
  EnsureStoreOutcome,
  IssuePromptCapabilityResult,
  CommitInterviewAnswerResult,
} from './interviewApplicationServices.js';
export { commitStep, checkRate, stampTurn } from './advanceState.js';
export { issueTurnCapability, verifyTurnCapability, hashToken } from './turnCapability.js';
export type { TurnCapabilityRecord, IssueCapabilityInput, IssueCapabilityResult, VerifyTurnResult } from './turnCapability.js';
export { evaluateGate, isBlocked, passedGates, checkExecutionGate } from './evaluateGate.js';
export { buildGateSnapshot, getActiveManagedPaths } from './gateSnapshot.js';
export type { GateSnapshot, GateArtifactInfo } from './gateSnapshot.js';
export { evaluatePreAction } from './evaluatePreAction.js';
export { validateAnswer } from './validateAnswer.js';
export type { AnswerValidationOutcome, AnswerValidationResult } from './validateAnswer.js';
export { loadQuestionSlots } from './loadQuestionSlots.js';
export type { LoadSlotsResult } from './loadQuestionSlots.js';
export { loadSlotsFile } from './loadSlotsFile.js';
export type { LoadSlotsFileResult } from './loadSlotsFile.js';
export { patternToRegex, matchesCatalogPattern } from './catalogPathMatch.js';
export { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
export { classifyCliSubcommand } from './classifyCliSubcommand.js';
export type { ClassifyCliSubcommandResult } from './classifyCliSubcommand.js';
export { loadDerivedRecipes } from './loadDerivedRecipes.js';
export { runDerivedRecipe } from './runDerivedRecipe.js';
export type {
  DerivedItemCoverageResult,
  DerivedItemCoverageReason,
  RunDerivedRecipeResult,
} from './runDerivedRecipe.js';
export { inspectRuntimeHealth, authorizeRecovery } from './runtimeHealth.js';
export { runCliOperation } from '../adapters/shared/cliOperations.js';
export {
  exitCodeFor,
  redactInternalError,
  cliResultEnvelopeSchema,
  type CliResultEnvelope,
} from '../adapters/shared/cliResult.js';
export { classifyArtifact, authorizeMutation } from './artifactOwnership.js';
export type { ArtifactClass, CatalogPathEntry, ScratchWriteContext } from './artifactOwnership.js';
export { classifyCommand } from './classifyCommand.js';
export type { CommandClassification, CommandClassificationOutcome, ClassifyCommandInput } from './classifyCommand.js';
export { tokenizeShellCommand, stripQuotedContent } from './tokenizeShellCommand.js';
export { ensureTier1Handoff } from './ensureTier1Handoff.js';
export { canonicalizeWorkspacePath, matchesPathPattern, isContainedRealPath } from './pathPolicy.js';
export type { CanonicalWorkspacePath, PathCanonicalizationResult } from './pathPolicy.js';
export { loadDeepenScript } from './loadDeepenScript.js';
export {
  loadDeepenState,
  saveDeepenState,
  listDeepenSubjects,
  expandQuestionInstances,
  optInModule,
  commitDeepenAnswer,
  canEmitModule,
  computeSourceDigest,
} from './deepenState.js';
export type { QuestionInstance } from './deepenState.js';
export { emitDoc, emitTree, generateExecutionPlanJson } from './emit.js';
export { generateAgentsMd } from '../adapters/agents/generateAgentsMd.js';
export { validateExecutionPlan } from './validatePlan.js';
export {
  loadExecutionState,
  saveExecutionState,
  initExecutionState,
  transitionToReadyToExecute,
  startTask,
  recordEvidence,
  requiresReview,
  transitionToReview,
  applyReviewOutcome,
  closeFeatureReview,
  assertNoUnreviewedFeature,
  completeTier1Emit,
  completeTier1Activation,
  evaluateBuildReadiness,
  createBlockRecord,
  blockExecution,
  recoverBlockedExecution,
  allowedRemediation,
} from './advanceExecutionState.js';
export { reviewFeatureOutput } from './reviewFeatureOutput.js';
export type { ReviewSignal } from './reviewFeatureOutput.js';
export { runFeatureReview, reviewCommandsFor, extractIssues } from './runFeatureReview.js';
export { runTaskVerification } from './runTaskVerification.js';
export { renderProgressLog } from './renderProgressLog.js';
export { planWeeklySchedule, renderWeeklySchedule, parseDeadlineWeeks } from './planWeeklySchedule.js';
export {
  renderEntityDiagram,
  renderFlowDiagram,
  entityDiagramFromSlots,
  flowDiagramFromSlots,
} from './renderMermaid.js';
export { renderDecisionTable, collectDecisions } from './renderDecisionLog.js';
export type { DecisionSpec } from './renderDecisionLog.js';
export {
  renderBreakTaskDoc,
  renderBreakTaskIndex,
  breakTaskFileName,
} from './renderBreakTasks.js';
export type { BreakTaskIndexEntry } from './renderBreakTasks.js';
export {
  assertValidatedSnapshot,
  loadEmittedDocs,
  calculatePlanDigest,
  calculateDocsDigest,
  calculateValidationResultDigest,
} from './validatedSnapshot.js';
export { inspectProjectProfile, inferProfileAnswersFromInterview } from './inspectProjectProfile.js';
export { checkDocsConsistency, checkTier2Consistency } from './checkDocsConsistency.js';
export type { ConsistencyWarning } from './checkDocsConsistency.js';
export { renderGlossary } from './renderGlossary.js';
export { renderFeatureSpec } from './renderFeatureSpec.js';
export { renderAdr } from './renderAdr.js';
export { renderTestStrategy } from './renderTestStrategy.js';
export { emitTier2 } from './emitTier2.js';
export type { EmitTier2Result } from './emitTier2.js';
export type { Tier2RenderInput, RenderedArtifact, ConsistencyIssue } from './schemas/tier2Render.js';
export {
  calculateProfileDigest,
  loadProjectProfile,
  saveProjectProfile,
} from './projectProfileState.js';
export { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';
export { promoteExecutionPlan } from './promoteExecutionPlan.js';
export { renderNextStep, renderNextStepMarkdown } from '../adapters/shared/renderNextStep.js';
export {
  proposePlanAmendment,
  approvePlanAmendment,
  rejectPlanAmendment,
} from './planAmendment.js';
export { compileContractToTaskCard } from './compileContractToTaskCard.js';
export {
  emitProjectConventions,
  loadProjectConventions,
  loadProjectConventionsFromCwd,
} from './emitProjectConventions.js';
export { validateContract } from './validateContract.js';
export { parseDataModel } from './parseDataModel.js';
export { parseFlows } from './parseFlows.js';
export { synthesizeFeatureContracts } from './synthesizeFeatureContracts.js';
export { loadArtifactCatalog } from './loadArtifactCatalog.js';
export { compileRuntimeCatalog, listArtifacts, listJourney } from './compileRuntimeCatalog.js';
export type { RuntimeCatalog } from './compileRuntimeCatalog.js';
export {
  prepareEmit,
  stagingDirFor,
  isStaged,
  validateStagedEmit,
  activateEmit,
  recoverEmit,
} from './emitTransaction.js';
export type {
  StagedGeneration,
  StageValidationResult,
  StageValidationIssue,
  ActivateEmitResult,
  RecoverEmitResult,
  EmitChannel,
} from './emitTransaction.js';
export {
  canStartDeepen,
  isPlanAffectingModule,
  invalidateSnapshotForTier2,
} from './deepenLifecycle.js';
export type { DeepenRuntimeSnapshot, CanStartDeepenDecision } from './deepenLifecycle.js';
export { activateTier1Emit } from './emitTier1.js';
export type { ActivateTier1EmitResult } from './emitTier1.js';
export { manifestPath, journalPath } from './emitTransactionActivate.js';
export { runSemanticValidation } from './semanticValidation.js';
export type {
  ValidationCheck,
  ValidationCheckId,
  SemanticValidationResult,
} from './semanticValidation.js';
export {
  listDeepenStatus,
  optInDeepenModule,
  issueDeepenCapability,
  commitDeepen,
} from './deepenApplicationServices.js';
export type {
  DeepenModuleStatus,
  DeepenNextSuccess,
  DeepenCommitArgs,
  DeepenServiceError,
} from './deepenApplicationServices.js';
export { installManifestSchema } from './schemas/installManifest.js';
export type { InstallManifest, InstallManifestAsset } from './schemas/installManifest.js';
