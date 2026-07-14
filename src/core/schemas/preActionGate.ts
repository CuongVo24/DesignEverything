import { z } from 'zod';

export const preActionRequestSchema = z.object({
  runtime: z.enum(['claude', 'codex', 'mcp', 'generic']),
  tool_name: z.string(),
  action_kind: z.enum(['read', 'write', 'shell', 'mcp', 'external']),
  target_paths: z.array(z.string()),
  command_argv: z.array(z.string()),
  workspace: z.string(),
  session_id: z.string(),
  plan_digest: z.string().optional(),
  state_digest: z.string().optional(),
  state: z.any().optional(),
  plan: z.any().optional(),
  policy: z.any().optional(),
});
export type PreActionRequest = z.infer<typeof preActionRequestSchema>;

export const preActionDecisionSchema = z.object({
  decision: z.enum(['allow', 'deny', 'requires-user-confirmation']),
  reason_code: z.string(),
  user_message: z.string(),
  enforcement: z.enum(['hard', 'soft', 'unsupported']),
  matched_task_id: z.string().optional(),
});
export type PreActionDecision = z.infer<typeof preActionDecisionSchema>;

export const adapterCapabilitySchema = z.object({
  runtime: z.enum(['claude', 'codex', 'mcp', 'generic']),
  intercepts: z.array(z.string()),
  enforcement_boundary: z.string(),
  config_surface: z.string(),
  known_gaps: z.array(z.string()),
});
export type AdapterCapability = z.infer<typeof adapterCapabilitySchema>;
