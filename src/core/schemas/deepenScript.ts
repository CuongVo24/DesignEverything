import { z } from 'zod';

/** 4 module tầng 2 (contract-lane đã HOÃN ở B19a). */
export const deepenModuleIdSchema = z.enum([
  'glossary',
  'feature-spec',
  'adr',
  'test-strategy',
]);

/**
 * Một câu deepen theo format khoá ở B19b. KHÔNG đổi shape mà không amend B19b trước.
 */
export const deepenQuestionSchema = z
  .object({
    id: z.string().regex(/^DS[0-9A-Za-z-]+$/),
    module: deepenModuleIdSchema,
    per_subject: z.enum(['none', 'must', 'adr']),
    ask: z.string().min(1),
    kind: z.enum(['anchored', 'meta']),
    target_doc: z.string().nullable(),
    default_from: z.array(z.string()),
    depends_on_tier1: z.array(z.string()),
    translate_back: z.boolean(),
  })
  .superRefine((q, ctx) => {
    // meta → không neo doc.
    if (q.kind === 'meta' && q.target_doc !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_doc'], message: `Câu meta ${q.id} phải có target_doc = null` });
    }
    if (q.kind === 'anchored' && (q.target_doc === null || q.target_doc.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_doc'], message: `Câu anchored ${q.id} phải có target_doc` });
    }
    // per_subject ≠ none → ask có {subject}, target_doc có {subject-slug}.
    if (q.per_subject !== 'none') {
      if (!q.ask.includes('{subject}')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ask'], message: `Câu ${q.id} per_subject=${q.per_subject} phải chứa {subject} trong ask` });
      }
      if (!q.target_doc || !q.target_doc.includes('{subject-slug}')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_doc'], message: `Câu ${q.id} per_subject=${q.per_subject} phải chứa {subject-slug} trong target_doc` });
      }
    } else {
      // per_subject none → không được có placeholder subject.
      if (q.ask.includes('{subject}') || (q.target_doc ?? '').includes('{subject')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['per_subject'], message: `Câu ${q.id} per_subject=none không được chứa placeholder {subject}` });
      }
    }
    // target_doc không được trỏ ra ngoài design/.
    if (q.target_doc && !q.target_doc.startsWith('design/')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_doc'], message: `Câu ${q.id} có target_doc ngoài design/: ${q.target_doc}` });
    }
  });

export const deepenScriptSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  questions: z.array(deepenQuestionSchema).nonempty(),
});

export type DeepenModuleId = z.infer<typeof deepenModuleIdSchema>;
export type DeepenQuestion = z.infer<typeof deepenQuestionSchema>;
export type DeepenScript = z.infer<typeof deepenScriptSchema>;
