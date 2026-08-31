import { z } from 'zod';
import { answerContractSchema } from './answerContract.js';

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
  answer_contract: answerContractSchema.optional(),
  // P4.2/P6 (R07/U05) — the authoritative set of `--slots-file` keys this
  // question may write. Optional/additive (a question with no declared
  // `slot_keys` keeps today's behavior: any key in the payload is accepted,
  // same as before this field existed) so this does not require a schema
  // version bump. A key can legitimately appear under more than one
  // question (e.g. `architecture_overview` under W1/W2, M2 and C1 — the
  // same slot filled in from whichever branch the interview actually
  // took), so this is a per-question allowlist, not a global one.
  slot_keys: z.array(z.string()).optional(),
  options: z.array(z.object({
    value: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1),
  })).min(2).max(4).optional(),
  recommendation: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('fixed'), value: z.string().trim().min(1) }),
    z.object({ mode: z.literal('contextual') }),
  ]).optional(),
  option_hints: z.object({
    synthesize_from: z.array(z.string().trim().min(1)).min(1),
    hint_count: z.union([z.literal(2), z.literal(3)]),
    hint_style: z.string().trim().min(1),
  }).optional(),
  // B24c (D61) — additive/optional, default false when absent (schema
  // 2.1.0 -> 2.2.0, backward-compatible: a question without this field
  // behaves exactly as before). Only meaningful on a question that has
  // `options` or `option_hints` — enforced below, not just documented,
  // since a free-text-only question has nothing to select multiple of.
  multi_select: z.boolean().optional(),
}).superRefine((q, ctx) => {
  if (q.options && q.option_hints) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['option_hints'], message: 'options and option_hints are mutually exclusive' });
  }
  if (q.options) {
    const values = q.options.map((option) => option.value);
    const labels = q.options.map((option) => option.label);
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'option values must be unique within a question' });
    }
    if (new Set(labels).size !== labels.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'option labels must be unique within a question' });
    }
    if (!q.recommendation) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recommendation'], message: 'questions with options require a recommendation' });
    } else if (q.recommendation.mode === 'fixed' && !values.includes(q.recommendation.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recommendation', 'value'], message: 'fixed recommendation must refer to an option value' });
    }
  } else if (q.recommendation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recommendation'], message: 'recommendation requires options' });
  }
  if (q.option_hints && new Set(q.option_hints.synthesize_from).size !== q.option_hints.synthesize_from.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['option_hints', 'synthesize_from'], message: 'option hint sources must be unique' });
  }
  // B24c (D61) — multi_select rules.
  if (q.multi_select) {
    if (!q.options && !q.option_hints) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multi_select'],
        message: 'multi_select requires options or option_hints — a free-text-only question has nothing to select multiple of',
      });
    }
    // A `fixed` recommendation means the engine binds a single machine
    // token to a discrete field (S7's --branch, CAL0's --calibrate) — those
    // two questions need exactly one selection, never a set, so
    // multi_select is incompatible with `recommendation.mode: 'fixed'`.
    // This is what keeps CAL0/S7 from ever declaring multi_select, at the
    // schema layer rather than only by convention.
    if (q.recommendation && q.recommendation.mode === 'fixed') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multi_select'],
        message: "multi_select is incompatible with a fixed recommendation — the engine needs exactly one machine token from this question, not a set",
      });
    }
  }
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
