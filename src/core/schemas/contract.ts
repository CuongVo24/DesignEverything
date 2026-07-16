import { z } from 'zod';
import { verificationCommandSchema } from './executionPlan.js';

export const contractInterfaceSchema = z.object({
  path: z.string().min(1),
  change: z.enum(['NEW', 'MODIFY']),
  signature: z.string().nullable().optional(),
  est_lines: z.number().int().positive(),
});

export const contractRiskSchema = z.object({
  risk: z.string().min(1),
  level: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1),
});

export const contractStatusSchema = z.enum([
  'WAITING_FOR_APPROVAL',
  'READY_TO_IMPLEMENT',
  'IN_PROGRESS',
  'DONE',
  'BLOCKED',
]);

export const contractSchema = z.object({
  id: z.string().min(1),
  feature_milestone: z.string().min(1),
  layer: z.enum(['core', 'content', 'adapter', 'app']),
  micro_task: z.string().min(1),
  scope: z.object({
    in: z.array(z.string()).min(1),
    out: z.array(z.string()).default([]),
  }),
  checklist: z.array(z.string()).min(1),
  interfaces: z.array(contractInterfaceSchema).min(1),
  risks: z.array(contractRiskSchema).default([]),
  verification: z.array(verificationCommandSchema).min(1),
  status: contractStatusSchema,
  conventions_ref: z.string().min(1),
  derived_from: z.object({
    must_id: z.string().min(1),
    entity_ids: z.array(z.string()).default([]),
    flow_id: z.string().nullable().optional(),
  }),
});

export const projectConventionsSchema = z.object({
  allowed_paths: z.array(z.string()).default([]),
  allowed_dependencies: z.array(z.string()).default([]),
  tech_stack: z.object({
    target: z.enum(['node-cli', 'vite-web', 'python-cli', 'unsupported']),
    language: z.enum(['typescript', 'javascript', 'python']).nullable().optional(),
    runtime: z.string().nullable().optional(),
  }),
});

export type Contract = z.infer<typeof contractSchema>;
export type ContractInterface = z.infer<typeof contractInterfaceSchema>;
export type ContractRisk = z.infer<typeof contractRiskSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type ProjectConventions = z.infer<typeof projectConventionsSchema>;
