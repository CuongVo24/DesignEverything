import { z } from 'zod';

export const workspaceKindSchema = z.enum(['empty', 'existing-supported', 'existing-unsupported']);
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;

export const projectProfileTargetSchema = z.enum(['node-cli', 'vite-web', 'python-cli', 'unsupported']);
export type ProjectProfileTarget = z.infer<typeof projectProfileTargetSchema>;

export const projectProfileSchema = z.object({
  workspace_kind: workspaceKindSchema,
  target: projectProfileTargetSchema.nullable(),
  runtime: z.string().nullable(),
  package_manager: z.enum(['npm', 'pnpm', 'yarn', 'pip']).nullable(),
  framework: z.enum(['vite', 'none']).nullable(),
  language: z.enum(['typescript', 'javascript', 'python']).nullable(),
  source_root: z.string().nullable(),
  manifest_paths: z.array(z.string()),
  capabilities: z.array(z.string()),
  confirmation: z.object({
    confirmed: z.boolean(),
    confirmed_by: z.string().optional(),
    confirmed_at: z.string().optional(),
  }),
  evidence: z.array(
    z.object({
      name: z.string(),
      path: z.string().optional(),
      observed_at: z.string(),
      confidence: z.number(),
    })
  ),
});
export type ProjectProfile = z.infer<typeof projectProfileSchema>;

export const profileQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  default: z.string(),
  target_field: z.string(),
});
export type ProfileQuestion = z.infer<typeof profileQuestionSchema>;
