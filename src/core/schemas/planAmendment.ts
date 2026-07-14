import { z } from 'zod';
import { taskCardSchema } from './executionPlan.js';
import { planRiskSchema } from './executionPlan.js';
import { projectProfileSchema } from './projectProfile.js';

export const amendmentReasonSchema = z.enum([
  'stack-change',
  'missing-capability',
  'dependency-risk',
  'scope-change',
  'verification-failure',
]);
export type AmendmentReason = z.infer<typeof amendmentReasonSchema>;

export const amendmentStatusSchema = z.enum(['proposed', 'approved', 'rejected']);
export type AmendmentStatus = z.infer<typeof amendmentStatusSchema>;

export const planAmendmentSchema = z.object({
  id: z.string().min(1),
  reason_code: amendmentReasonSchema,
  requested_by: z.string().min(1),
  proposed_changes: z.object({
    tasks: z.record(z.string(), taskCardSchema.partial()).optional(),
    risks: z.array(planRiskSchema).optional(),
    profile: projectProfileSchema.partial().optional(),
  }),
  impact: z.string().min(1),
  requires_user_confirmation: z.boolean(),
  status: amendmentStatusSchema.default('proposed'),
  created_at: z.string().datetime(),
  // Evidence that the user explicitly approved a confirmation-required amendment.
  confirmed_by: z.string().optional(),
  confirmed_at: z.string().datetime().optional(),
  // Immutable revision snapshot written when the amendment was approved.
  revision_snapshot: z.string().optional(),
});
export type PlanAmendment = z.infer<typeof planAmendmentSchema>;
