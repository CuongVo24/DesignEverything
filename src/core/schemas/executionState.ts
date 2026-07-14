import { z } from 'zod';
import { planAmendmentSchema } from './planAmendment.js';

export const executionPhaseSchema = z.enum([
  'plan-validating',
  'ready-to-execute',
  'executing',
  'verifying',
  'repairing',
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

export const executionStateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  phase: executionPhaseSchema,
  active_task: z.string().nullable(),
  active_milestone: z.string().nullable(),
  completed_tasks: z.array(z.string()),
  evidence: z.array(evidenceRecordSchema),
  block_reason: z.string().nullable(),
  validated_plan_digest: z.string(),
  validated_docs_digest: z.string(),
  validation_result_digest: z.string(),
  plan_revision: z.number().int().default(1),
  amendment_history: z.array(planAmendmentSchema).default([]),
  updated_at: z.string().datetime(),
});
export type ExecutionState = z.infer<typeof executionStateSchema>;
