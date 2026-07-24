import { z } from 'zod';

export const emitManifestArtifactSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  ownership: z.enum(['managed', 'user']),
  kind: z.enum(['doc', 'state', 'manifest', 'convention']),
});
export type EmitManifestArtifact = z.infer<typeof emitManifestArtifactSchema>;

export const emitManifestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  generation_id: z.string().min(1),
  shape: z.string().min(1),
  catalog_version: z.string().min(1),
  catalog_digest: z.string().regex(/^[0-9a-f]{64}$/),
  input_digest: z.string().regex(/^[0-9a-f]{64}$/),
  artifacts: z.array(emitManifestArtifactSchema),
  created_at: z.string().datetime(),
  activated_at: z.string().datetime().nullable(),
});
export type EmitManifest = z.infer<typeof emitManifestSchema>;

export const emitJournalStepSchema = z.enum([
  'staged',
  'backing-up',
  'promoting',
  'writing-manifest',
  'done',
]);
export type EmitJournalStep = z.infer<typeof emitJournalStepSchema>;

export const emitJournalSchema = z.object({
  generation_id: z.string().min(1),
  step: emitJournalStepSchema,
  backup_dir: z.string().min(1),
  previous_generation_id: z.string().nullable(),
  started_at: z.string().datetime(),
});
export type EmitJournal = z.infer<typeof emitJournalSchema>;
