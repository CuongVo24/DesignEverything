import { z } from 'zod';
import { deepenModuleIdSchema, type DeepenModuleId } from './deepenScript.js';

/** Một instance câu đã commit: câu × subject. KHÔNG lưu nội dung answer, chỉ tiến độ. */
export const deepenAnswerRefSchema = z.object({
  question_id: z.string(),
  subject_id: z.string().nullable(),
});

export const deepenModuleStateSchema = z.object({
  opted_in: z.boolean(),
  activation: z.enum(['explicit', 'condition']).nullable(),
  answered: z.array(deepenAnswerRefSchema),
  last_user_turn_id: z.string().nullable(),
  emitted_at: z.string().nullable(),
  source_digest: z.string().nullable(),
  artifacts: z.array(z.string()),
});

export const deepenStateSchema = z.object({
  version: z.string(),
  modules: z.object({
    glossary: deepenModuleStateSchema,
    'feature-spec': deepenModuleStateSchema,
    adr: deepenModuleStateSchema,
    'test-strategy': deepenModuleStateSchema,
  }),
});

export type DeepenAnswerRef = z.infer<typeof deepenAnswerRefSchema>;
export type DeepenModuleState = z.infer<typeof deepenModuleStateSchema>;
export type DeepenState = z.infer<typeof deepenStateSchema>;

export const DEEPEN_STATE_VERSION = '1.0.0';

/** State mặc định: mọi module chưa opt-in. */
export function defaultDeepenState(): DeepenState {
  const emptyModule = (): DeepenModuleState => ({
    opted_in: false,
    activation: null,
    answered: [],
    last_user_turn_id: null,
    emitted_at: null,
    source_digest: null,
    artifacts: [],
  });
  return {
    version: DEEPEN_STATE_VERSION,
    modules: {
      glossary: emptyModule(),
      'feature-spec': emptyModule(),
      adr: emptyModule(),
      'test-strategy': emptyModule(),
    },
  };
}

export { deepenModuleIdSchema };
export type { DeepenModuleId };
