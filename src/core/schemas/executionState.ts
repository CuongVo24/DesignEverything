import { z } from 'zod';
import { planAmendmentSchema } from './planAmendment.js';

export const executionPhaseSchema = z.enum([
  'plan-validating',
  'ready-to-execute',
  'executing',
  'verifying',
  'repairing',
  'reviewing',
  'blocked',
  'ready-to-ship',
]);
export type ExecutionPhase = z.infer<typeof executionPhaseSchema>;

export const evidenceRecordSchema = z.object({
  task_id: z.string().min(1),
  command_id: z.string().min(1),
  argv: z.array(z.string()).default([]),
  cwd: z.string().nullable().optional(),
  exit_code: z.number().int(),
  stdout_sha256: z.string(),
  stderr_sha256: z.string(),
  artifact_digests: z.record(z.string(), z.string()).default({}),
  captured_at: z.string().datetime(),
  source: z.literal('runner'),
});
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const blockKindSchema = z.enum([
  'validation',
  'artifact-integrity',
  'snapshot-stale',
  'policy-corrupt',
  'verification-failed',
  'verification-aborted',
  'review-incomplete',
]);
export type BlockKind = z.infer<typeof blockKindSchema>;

export const remediationActionSchema = z.enum([
  'read',
  'write-docs',
  'write-task-scope',
  'run-command',
]);
export type RemediationAction = z.infer<typeof remediationActionSchema>;

/**
 * The recovery capability is state data, not a policy switch inferred from a
 * free-text error.  Binding all dimensions here lets the hook reject a
 * command/path/task/revision mismatch instead of widening a blocked state.
 */
export const blockRemediationSchema = z.object({
  actions: z.array(remediationActionSchema).min(1),
  paths: z.array(z.string()),
  command: z.string().min(1),
  task_id: z.string().nullable(),
  plan_revision: z.number().int().min(0),
});
export type BlockRemediation = z.infer<typeof blockRemediationSchema>;

export const blockRecordSchema = z.object({
  kind: blockKindSchema,
  reason_code: z.string(),
  origin_phase: executionPhaseSchema,
  task_id: z.string().nullable(),
  recoverable_by: z.string(),
  detail: z.string(),
  created_at: z.string().datetime(),
  remediation: blockRemediationSchema,
}).superRefine((record, ctx) => {
  if (record.recoverable_by !== record.remediation.command) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remediation', 'command'],
      message: 'remediation.command must exactly match recoverable_by',
    });
  }
  if (record.task_id !== record.remediation.task_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remediation', 'task_id'],
      message: 'remediation.task_id must exactly match task_id',
    });
  }
});
export type BlockRecord = z.infer<typeof blockRecordSchema>;

export const tier1HandoffSchema = z.object({
  manifest_generation_id: z.string().min(1),
  manifest_digest: z.string().regex(/^[0-9a-f]{64}$/),
  plan_digest: z.string().regex(/^[0-9a-f]{64}$/),
  docs_digest: z.string().regex(/^[0-9a-f]{64}$/),
  interview_state_revision: z.number().int().min(0),
  activated_at: z.string().datetime(),
});
export type Tier1Handoff = z.infer<typeof tier1HandoffSchema>;

export const executionStateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  phase: executionPhaseSchema,
  active_task: z.string().nullable(),
  active_milestone: z.string().nullable(),
  completed_tasks: z.array(z.string()),
  evidence: z.array(evidenceRecordSchema),
  block_reason: blockRecordSchema.nullable(),
  validated_plan_digest: z.string(),
  validated_docs_digest: z.string(),
  validation_result_digest: z.string(),
  // Optional only so loadExecutionState can migrate prior files without
  // claiming their old activation had this P3 binding. Every new tier-1
  // handoff writes it.
  handoff: tier1HandoffSchema.optional(),
  plan_revision: z.number().int().default(1),
  amendment_history: z.array(planAmendmentSchema).default([]),
  // B17a — review/break-task loop. Optional với default để state cũ vẫn hợp lệ.
  open_break_tasks: z.array(z.string()).default([]),
  reviewed_milestones: z.array(z.string()).default([]),
  updated_at: z.string().datetime(),
});
export type ExecutionState = z.infer<typeof executionStateSchema>;
