import { z } from 'zod';

export const gateSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  requires_docs: z
    .array(z.string())
    .nonempty()
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'requires_docs must contain unique items',
    }),
  blocks: z
    .array(z.enum(['Write', 'Edit', 'Bash']))
    .nonempty()
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'blocks must contain unique items',
    }),
  message: z.string().min(1),
});

export const gatePolicySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  gates: z.array(gateSchema).nonempty(),
});
