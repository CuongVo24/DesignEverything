import { z } from 'zod';

export const internalMutationOperationSchema = z.enum([
  'commit_step',
  'emit_doc',
  'transact_store',
  'init_state',
  'migrate',
]);
export type InternalMutationOperation = z.infer<typeof internalMutationOperationSchema>;

export const internalMutationCapabilitySchema = z.object({
  capability_id: z.string().min(1),
  operation: internalMutationOperationSchema,
  target_paths: z.array(z.string()),
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});
export type InternalMutationCapability = z.infer<typeof internalMutationCapabilitySchema>;
