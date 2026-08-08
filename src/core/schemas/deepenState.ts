import { z } from 'zod';
import { deepenModuleIdSchema, type DeepenModuleId } from './deepenScript.js';

/**
 * Một instance câu đã commit: câu × subject. KHÔNG lưu nội dung answer, chỉ
 * tiến độ. `generation`/`supersedes` (B3e §3) — mỗi rerun push một entry MỚI
 * thay vì overwrite entry cũ, nên `answered` là lịch sử đầy đủ: entry có
 * `generation` cao nhất cho cùng (question_id, subject_id) là bản hiện hành,
 * `supersedes` trỏ ngược generation nó thay thế (null cho generation 1).
 * `.default()` giữ tương thích ngược với deepen-state.json cũ trên đĩa chưa
 * có 2 field này — parse ra generation:1/supersedes:null, đúng ngữ nghĩa
 * "lần commit đầu tiên".
 */
export const deepenAnswerRefSchema = z.object({
  question_id: z.string(),
  subject_id: z.string().nullable(),
  generation: z.number().int().min(1).default(1),
  supersedes: z.number().int().min(1).nullable().default(null),
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

import { turnCapabilityRecordSchema } from '../turnCapability.js';

export const deepenStateSchema = z.object({
  version: z.string(),
  session_id: z.string().default('default-session'),
  state_revision: z.number().int().min(0).default(0),
  pending_turn_capability: turnCapabilityRecordSchema.nullable().default(null),
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
    session_id: 'default-session',
    state_revision: 0,
    pending_turn_capability: null,
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
