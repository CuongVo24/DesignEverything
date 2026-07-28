import { z } from 'zod';

export const preActionRequestSchema = z.object({
  runtime: z.enum(['claude', 'codex', 'mcp', 'generic']),
  tool_name: z.string(),
  // P8.5 — 'delete'/'rename' added for typed-gap closure only (matches
  // authorizeMutation's action union, artifactOwnership.ts). No caller
  // constructs a request with these yet — no native Claude Code tool
  // surfaces delete/rename distinct from Write/Edit/Bash today, and
  // extracting rm/mv shell argv into per-target authorizeMutation calls is
  // explicitly out of scope here (see artifactOwnership.test.ts's P8.5
  // suite doc comment for why).
  action_kind: z.enum(['read', 'write', 'shell', 'mcp', 'external', 'delete', 'rename']),
  target_paths: z.array(z.string()),
  command_argv: z.array(z.string()),
  workspace: z.string(),
  session_id: z.string(),
  plan_digest: z.string().optional(),
  state_digest: z.string().optional(),
  state: z.any().optional(),
  /** Pre-loaded canonical interview progress snapshot (P2.2a) — when the
   * caller supplies this, evaluatePreAction skips its own canonical store
   * load. Never populate from progress.json; canonical only. */
  progress: z.any().optional(),
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
  /**
   * Cảnh báo MỀM (B20a): danh sách module deepen đã opt-in nhưng chưa emit.
   * Thuần thông tin — không bao giờ đổi `decision`/`enforcement`; vắng khi không có gì dở.
   */
  deepen_pending: z.array(z.string()).optional(),
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
