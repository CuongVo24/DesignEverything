import { z } from 'zod';
import { questionSchema, scriptSchema } from './interviewScript.js';
import { progressSchema } from './state.js';
import { gateSchema, gatePolicySchema } from './gatePolicy.js';
import { shapeSchema, shapesRegistrySchema, type Shape, type ShapesRegistry } from '../loadShapes.js';
import {
  validationIssueSeveritySchema,
  validationIssueSchema,
  planValidationResultSchema,
  planValidationInputSchema,
} from './planValidation.js';
import {
  executionPhaseSchema,
  evidenceRecordSchema,
  executionStateSchema,
  blockKindSchema,
  blockRecordSchema,
  remediationActionSchema,
  blockRemediationSchema,
  tier1HandoffSchema,
} from './executionState.js';
import {
  internalMutationOperationSchema,
  internalMutationCapabilitySchema,
} from './internalMutationCapability.js';
import {
  healthStatusSchema,
  healthIssueSchema,
  healthReportSchema,
} from './runtimeHealth.js';
import {
  warningRuleSchema,
  answerContractSchema,
} from './answerContract.js';
import {
  taskTypeSchema,
  taskCardSchema,
  planRiskSchema,
  executionPlanSchemaV3,
  expectedResultSchema,
  verificationCommandSchema,
  capabilitySourceSchema,
  capabilityEvidenceSchema,
} from './executionPlan.js';
import {
  preActionRequestSchema,
  preActionDecisionSchema,
  adapterCapabilitySchema,
} from './preActionGate.js';
import {
  workspaceKindSchema,
  projectProfileTargetSchema,
  projectProfileSchema,
  profileQuestionSchema,
} from './projectProfile.js';
import {
  planAmendmentSchema,
  amendmentReasonSchema,
} from './planAmendment.js';
import {
  contractInterfaceSchema,
  contractRiskSchema,
  contractStatusSchema,
  contractSchema,
  projectConventionsSchema,
} from './contract.js';
import {
  deepenModuleIdSchema,
  deepenQuestionSchema,
  deepenScriptSchema,
} from './deepenScript.js';
import {
  deepenAnswerRefSchema,
  deepenModuleStateSchema,
  deepenStateSchema,
  defaultDeepenState,
} from './deepenState.js';
import {
  slotProvenanceRecordSchema,
  interviewStorePayloadSchema,
  interviewStoreEnvelopeSchema,
  INTERVIEW_STORE_VERSION,
} from './interviewStore.js';
import {
  artifactSourceSchema,
  artifactKindSchema,
  artifactRecordSchema,
  artifactCatalogSchema,
} from './artifactCatalog.js';
import {
  emitManifestArtifactSchema,
  emitManifestSchema,
  emitJournalStepSchema,
  emitJournalSchema,
  emitJournalHandoffSchema,
} from './emitManifest.js';

export {
  questionSchema,
  scriptSchema,
  progressSchema,
  gateSchema,
  gatePolicySchema,
  shapeSchema,
  shapesRegistrySchema,
  validationIssueSeveritySchema,
  validationIssueSchema,
  planValidationResultSchema,
  planValidationInputSchema,
  executionPhaseSchema,
  evidenceRecordSchema,
  executionStateSchema,
  taskTypeSchema,
  taskCardSchema,
  planRiskSchema,
  executionPlanSchemaV3,
  expectedResultSchema,
  verificationCommandSchema,
  capabilitySourceSchema,
  capabilityEvidenceSchema,
  preActionRequestSchema,
  preActionDecisionSchema,
  adapterCapabilitySchema,
  workspaceKindSchema,
  projectProfileTargetSchema,
  projectProfileSchema,
  profileQuestionSchema,
  planAmendmentSchema,
  amendmentReasonSchema,
  contractInterfaceSchema,
  contractRiskSchema,
  contractStatusSchema,
  contractSchema,
  projectConventionsSchema,
  deepenModuleIdSchema,
  deepenQuestionSchema,
  deepenScriptSchema,
  deepenAnswerRefSchema,
  deepenModuleStateSchema,
  deepenStateSchema,
  defaultDeepenState,
  slotProvenanceRecordSchema,
  interviewStorePayloadSchema,
  interviewStoreEnvelopeSchema,
  INTERVIEW_STORE_VERSION,
  blockKindSchema,
  blockRecordSchema,
  remediationActionSchema,
  blockRemediationSchema,
  tier1HandoffSchema,
  internalMutationOperationSchema,
  internalMutationCapabilitySchema,
  healthStatusSchema,
  healthIssueSchema,
  healthReportSchema,
  warningRuleSchema,
  answerContractSchema,
  artifactSourceSchema,
  artifactKindSchema,
  artifactRecordSchema,
  artifactCatalogSchema,
  emitManifestArtifactSchema,
  emitManifestSchema,
  emitJournalStepSchema,
  emitJournalSchema,
  emitJournalHandoffSchema,
};

export type Question = z.infer<typeof questionSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type GatePolicy = z.infer<typeof gatePolicySchema>;
export type { Shape, ShapesRegistry };

export type ValidationIssueSeverity = z.infer<typeof validationIssueSeveritySchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type PlanValidationResult = z.infer<typeof planValidationResultSchema>;
export type PlanValidationInput = z.infer<typeof planValidationInputSchema>;

export type ExecutionPhase = z.infer<typeof executionPhaseSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ExecutionState = z.infer<typeof executionStateSchema>;
export type BlockKind = z.infer<typeof blockKindSchema>;
export type BlockRecord = z.infer<typeof blockRecordSchema>;
export type RemediationAction = z.infer<typeof remediationActionSchema>;
export type BlockRemediation = z.infer<typeof blockRemediationSchema>;
export type Tier1Handoff = z.infer<typeof tier1HandoffSchema>;
export type InternalMutationOperation = z.infer<typeof internalMutationOperationSchema>;
export type InternalMutationCapability = z.infer<typeof internalMutationCapabilitySchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthIssue = z.infer<typeof healthIssueSchema>;
export type HealthReport = z.infer<typeof healthReportSchema>;
export type WarningRule = z.infer<typeof warningRuleSchema>;
export type AnswerContract = z.infer<typeof answerContractSchema>;

export type TaskType = z.infer<typeof taskTypeSchema>;
export type TaskCard = z.infer<typeof taskCardSchema>;
export type PlanRisk = z.infer<typeof planRiskSchema>;
export type ExecutionPlanV3 = z.infer<typeof executionPlanSchemaV3>;
export type ExpectedResult = z.infer<typeof expectedResultSchema>;
export type VerificationCommand = z.infer<typeof verificationCommandSchema>;
export type CapabilitySource = z.infer<typeof capabilitySourceSchema>;
export type CapabilityEvidence = z.infer<typeof capabilityEvidenceSchema>;

export type PreActionRequest = z.infer<typeof preActionRequestSchema>;
export type PreActionDecision = z.infer<typeof preActionDecisionSchema>;
export type AdapterCapability = z.infer<typeof adapterCapabilitySchema>;

export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;
export type ProjectProfileTarget = z.infer<typeof projectProfileTargetSchema>;
export type ProjectProfile = z.infer<typeof projectProfileSchema>;
export type ProfileQuestion = z.infer<typeof profileQuestionSchema>;
export type PlanAmendment = z.infer<typeof planAmendmentSchema>;
export type AmendmentReason = z.infer<typeof amendmentReasonSchema>;

export type Contract = z.infer<typeof contractSchema>;
export type ContractInterface = z.infer<typeof contractInterfaceSchema>;
export type ContractRisk = z.infer<typeof contractRiskSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type ProjectConventions = z.infer<typeof projectConventionsSchema>;

export type DeepenModuleId = z.infer<typeof deepenModuleIdSchema>;
export type DeepenQuestion = z.infer<typeof deepenQuestionSchema>;
export type DeepenScript = z.infer<typeof deepenScriptSchema>;
export type DeepenAnswerRef = z.infer<typeof deepenAnswerRefSchema>;
export type DeepenModuleState = z.infer<typeof deepenModuleStateSchema>;
export type DeepenState = z.infer<typeof deepenStateSchema>;

export type SlotProvenanceRecord = z.infer<typeof slotProvenanceRecordSchema>;
export type InterviewStorePayload = z.infer<typeof interviewStorePayloadSchema>;
export type InterviewStoreEnvelope = z.infer<typeof interviewStoreEnvelopeSchema>;

export type ArtifactSource = z.infer<typeof artifactSourceSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type ArtifactCatalog = z.infer<typeof artifactCatalogSchema>;

export type EmitManifestArtifact = z.infer<typeof emitManifestArtifactSchema>;
export type EmitManifest = z.infer<typeof emitManifestSchema>;
export type EmitJournalStep = z.infer<typeof emitJournalStepSchema>;
export type EmitJournal = z.infer<typeof emitJournalSchema>;
export type EmitJournalHandoff = z.infer<typeof emitJournalHandoffSchema>;



