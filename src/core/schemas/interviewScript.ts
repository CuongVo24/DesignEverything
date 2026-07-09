import { z } from 'zod';

export const questionSchema = z.object({
  id: z.string().regex(/^[A-Z][A-Za-z0-9-]*$/),
  ask: z.string().min(1),
  default: z.string().nullable(),
  kind: z.enum(['anchored', 'meta']).default('anchored'),
  target_doc: z.string().nullable(),
  branch: z.string().min(1),
  gate: z.string().nullable(),
  translate_back: z.string().min(1),
  depends_on: z.array(z.string()),
}).refine(
  (q) => {
    if (q.kind === 'meta') {
      return q.target_doc === null;
    } else {
      return typeof q.target_doc === 'string' && q.target_doc.trim().length > 0;
    }
  },
  {
    message: "target_doc must be null when kind is 'meta', and must be a non-empty string when kind is 'anchored'",
    path: ['target_doc']
  }
);

export const scriptSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  questions: z.array(questionSchema).nonempty(),
  critics: z.record(
    z.object({
      challenge: z.string().min(1),
      ack_prompt: z.string().min(1),
    })
  ).optional(),
}).refine(
  (script) => {
    if (!script.critics) return true;
    const questionIds = new Set(script.questions.map((q) => q.id));
    return Object.keys(script.critics).every((key) => questionIds.has(key));
  },
  {
    message: "All critic keys must correspond to valid question ids in the script",
    path: ['critics']
  }
);
