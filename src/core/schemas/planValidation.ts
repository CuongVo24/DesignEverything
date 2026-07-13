import { z } from 'zod';

export const validationIssueSeveritySchema = z.enum(['error', 'warning']);
export type ValidationIssueSeverity = z.infer<typeof validationIssueSeveritySchema>;

export const validationIssueSchema = z.object({
  id: z.enum([
    'invalid-shape-docs',
    'readme-mismatch',
    'traceability-missing',
    'phantom-command',
    'scope-leak',
    'risk-unresolved',
  ]),
  severity: validationIssueSeveritySchema,
  message: z.string(),
  remediation: z.string(),
  sourceFile: z.string().optional(),
  anchor: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

export const planValidationResultSchema = z.object({
  pass: z.boolean(),
  issues: z.array(validationIssueSchema),
  checkedAt: z.string().datetime(),
  evidenceReferences: z.array(z.string()).default([]),
});
export type PlanValidationResult = z.infer<typeof planValidationResultSchema>;

export const executionTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  scopeMapped: z.array(z.string()),
  filesToModify: z.array(z.string()),
  verificationCommands: z.array(z.string()),
  verificationExpected: z.string(),
  preconditions: z.array(z.string()).optional(),
});
export type ExecutionTask = z.infer<typeof executionTaskSchema>;

export const executionMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  tasks: z.array(executionTaskSchema),
  preconditions: z.array(z.string()).optional(),
});
export type ExecutionMilestone = z.infer<typeof executionMilestoneSchema>;

export const executionPlanSchema = z.object({
  milestones: z.array(executionMilestoneSchema),
  risksAcknowledged: z.array(z.string()).default([]),
});
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

export const validatorInputSchema = z.object({
  answers: z.record(z.string(), z.string()),
  emittedDocs: z.array(
    z.object({
      file: z.string(),
      content: z.string(),
    })
  ),
  shape: z.string(),
  executionPlan: executionPlanSchema,
});
export type ValidatorInput = z.infer<typeof validatorInputSchema>;
