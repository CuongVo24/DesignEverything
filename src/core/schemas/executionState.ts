import { z } from 'zod';

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
  command: z.string(),
  exit_code: z.number().int(),
  expected_result: z.string(),
  observed_result: z.string(),
  timestamp: z.string().datetime(),
  artifact_paths: z.array(z.string()),
  actor: z.string().min(1),
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
  updated_at: z.string().datetime(),
});
export type ExecutionState = z.infer<typeof executionStateSchema>;
