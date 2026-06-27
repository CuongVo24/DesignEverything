import { z } from 'zod';

export const progressSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  phase: z.enum(['interview', 'docs-emitted', 'ready-to-build']),
  branch: z.enum(['web', 'mobile']).nullable(),
  current_step: z.string().nullable(),
  answered: z.array(z.string()),
  emitted_docs: z.array(z.string()),
  gates_passed: z.array(z.string()),
  last_user_turn_id: z.string().nullable(),
  answered_len_at_last_turn: z.number().int().min(0),
  updated_at: z.string().datetime(),
});
