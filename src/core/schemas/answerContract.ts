import { z } from 'zod';

export const warningRuleSchema = z.object({
  code: z.string(),
  pattern: z.string().optional(),
  message: z.string(),
});
export type WarningRule = z.infer<typeof warningRuleSchema>;

export const answerContractSchema = z.object({
  required: z.boolean().default(true),
  min_trimmed_chars: z.number().int().min(0).default(3),
  min_items: z.number().int().min(0).optional(),
  required_fields: z.array(z.string()).optional(),
  enum_values: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  warning_rules: z.array(warningRuleSchema).default([]),
});
export type AnswerContract = z.infer<typeof answerContractSchema>;
