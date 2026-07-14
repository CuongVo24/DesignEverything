import { z } from 'zod';

export const taskTypeSchema = z.enum(['spike', 'scaffold', 'implementation', 'verification']);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const expectedResultSchema = z.object({
  kind: z.enum(['exit-code-zero', 'output-includes', 'file-exists']),
  value: z.string().optional(),
});
export type ExpectedResult = z.infer<typeof expectedResultSchema>;

export const verificationCommandSchema = z.object({
  id: z.string().min(1),
  argv: z.array(z.string()).default([]),
  cwd: z.string().nullable().optional(),
  expected: expectedResultSchema,
  requires_user_confirmation: z.boolean().optional(),
});
export type VerificationCommand = z.infer<typeof verificationCommandSchema>;

export const capabilitySourceSchema = z.enum(['existing-manifest', 'installed-runtime', 'user-confirmed']);
export type CapabilitySource = z.infer<typeof capabilitySourceSchema>;

export const capabilityEvidenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source: capabilitySourceSchema,
  checked_at: z.string().datetime(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type CapabilityEvidence = z.infer<typeof capabilityEvidenceSchema>;

export const taskCardSchema = z.object({
  id: z.string().min(1),
  type: taskTypeSchema,
  milestone: z.string().min(1),
  intent: z.string().min(1),
  depends_on: z.array(z.string()).default([]),
  allowed_paths: z.array(z.string()).default([]),
  preconditions: z.array(z.string()).default([]),
  commands: z.array(verificationCommandSchema).default([]),
  expected_result: z.string().min(1),
  evidence_required: z.array(z.string()).default([]),
  failure_policy: z.string().min(1),
  requires_capability: z.string().nullable().optional(),
});
export type TaskCard = z.infer<typeof taskCardSchema>;

export const planRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['confirmed', 'assumption', 'spike-required']),
  exit_criterion: z.string().min(1),
});
export type PlanRisk = z.infer<typeof planRiskSchema>;

export const traceLinkSchema = z.object({
  must_id: z.string().min(1),
  flow_id: z.string().min(1),
  task_ids: z.array(z.string()).default([]),
});
export type TraceLink = z.infer<typeof traceLinkSchema>;

export const executionPlanSchemaV3 = z.object({
  metadata: z.object({
    version: z.string(),
    updated_at: z.string().datetime(),
  }),
  trace_links: z.array(traceLinkSchema).default([]),
  risks: z.array(planRiskSchema).default([]),
  milestones: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    tasks: z.array(z.string()).default([]), // List of task IDs in this milestone
  })).default([]),
  tasks: z.record(z.string(), taskCardSchema).default({}), // Map of task ID to TaskCard
  capabilities_evidence: z.array(capabilityEvidenceSchema).default([]),
  discovery_status: z.enum(['blocked', 'pass']).default('pass'),
});
export type ExecutionPlanV3 = z.infer<typeof executionPlanSchemaV3>;
