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

export const blockRecordSchema = z.object({
  kind: blockKindSchema,
  reason_code: z.string(),
  origin_phase: executionPhaseSchema,
  task_id: z.string().nullable(),
  recoverable_by: z.string(),
  detail: z.string(),
  created_at: z.string().datetime(),
});
export type BlockRecord = z.infer<typeof blockRecordSchema>;

export const executionStateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  phase: executionPhaseSchema,
  active_task: z.string().nullable(),
  active_milestone: z.string().nullable(),
  completed_tasks: z.array(z.string()),
  evidence: z.array(evidenceRecordSchema),
  block_reason: z.union([z.string(), blockRecordSchema]).nullable(),
  validated_plan_digest: z.string(),
  validated_docs_digest: z.string(),
  validation_result_digest: z.string(),
  plan_revision: z.number().int().default(1),
  amendment_history: z.array(planAmendmentSchema).default([]),
  // B17a — review/break-task loop. Optional với default để state cũ vẫn hợp lệ.
  open_break_tasks: z.array(z.string()).default([]),
  reviewed_milestones: z.array(z.string()).default([]),
  updated_at: z.string().datetime(),
});
export type ExecutionState = z.infer<typeof executionStateSchema>;
