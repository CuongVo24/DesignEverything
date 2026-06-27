import { z } from 'zod';

export const questionSchema = z.object({
  id: z.string().regex(/^[A-Z][A-Za-z0-9-]*$/),
  ask: z.string().min(1),
  default: z.string().nullable(),
  target_doc: z.string().min(1),
  branch: z.enum(['core', 'web', 'mobile']),
  gate: z.string().nullable(),
  translate_back: z.string().min(1),
  depends_on: z.array(z.string()),
});

export const scriptSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  questions: z.array(questionSchema).nonempty(),
});
