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
    'phantom-capability',
    'missing-manifest-path',
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
export const planValidationInputSchema = z.object({
  answers: z.record(z.string(), z.string()),
  emitted_docs: z.array(
    z.object({
      file: z.string(),
      content: z.string(),
    })
  ),
  shape: z.string(),
  execution_plan: z.unknown(), // Allow passing raw objects before validation
});
export type PlanValidationInput = z.infer<typeof planValidationInputSchema>;
