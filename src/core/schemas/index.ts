import { z } from 'zod';
import { questionSchema, scriptSchema } from './interviewScript.js';
import { progressSchema } from './state.js';
import { gateSchema, gatePolicySchema } from './gatePolicy.js';
import { shapeSchema, shapesRegistrySchema, type Shape, type ShapesRegistry } from '../loadShapes.js';
import {
  validationIssueSeveritySchema,
  validationIssueSchema,
  planValidationResultSchema,
  executionTaskSchema,
  executionMilestoneSchema,
  executionPlanSchema,
  validatorInputSchema,
} from './planValidation.js';
import {
  executionPhaseSchema,
  evidenceRecordSchema,
  executionStateSchema,
} from './executionState.js';

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
  executionTaskSchema,
  executionMilestoneSchema,
  executionPlanSchema,
  validatorInputSchema,
  executionPhaseSchema,
  evidenceRecordSchema,
  executionStateSchema,
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
export type ExecutionTask = z.infer<typeof executionTaskSchema>;
export type ExecutionMilestone = z.infer<typeof executionMilestoneSchema>;
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;
export type ValidatorInput = z.infer<typeof validatorInputSchema>;

export type ExecutionPhase = z.infer<typeof executionPhaseSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ExecutionState = z.infer<typeof executionStateSchema>;


