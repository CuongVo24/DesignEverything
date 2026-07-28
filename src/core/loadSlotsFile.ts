import { existsSync, readFileSync, statSync } from 'fs';
import { z } from 'zod';

// The real, documented `--slots-file` contract (adapter/claude-code/skill/
// SKILL.md "Chất lượng câu trả lời lưu vào answers"): a flat JSON object of
// slot-key -> string value, e.g. { "vision_elevator_pitch": "..." }. This is
// a different shape from loadQuestionSlots.ts's single {value, provenance,
// updated_at} record (that mechanism has no production caller and predates
// this one) — do not conflate the two.
export type LoadSlotsFileResult =
  | { ok: true; slots: Record<string, string> }
  | { ok: false; reason_code: string; message: string };

const MAX_SLOTS_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
const slotsFilePayloadSchema = z.record(z.string().min(1), z.string());

export function loadSlotsFile(absPath: string): LoadSlotsFileResult {
  if (!existsSync(absPath)) {
    return {
      ok: false,
      reason_code: 'SLOTS_FILE_NOT_FOUND',
      message: `Tệp slots không tồn tại tại đường dẫn: ${absPath}`,
    };
  }

  try {
    const stat = statSync(absPath);
    if (stat.size > MAX_SLOTS_FILE_SIZE_BYTES) {
      return {
        ok: false,
        reason_code: 'SLOTS_FILE_OVERSIZED',
        message: `Kích thước tệp slots (${stat.size} bytes) vượt quá giới hạn cho phép 1MB.`,
      };
    }

    const content = readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(content);
    const result = slotsFilePayloadSchema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        reason_code: 'INVALID_SLOTS_FILE_SCHEMA',
        message: `Tệp slots phải là object phẳng dạng {"slot_key": "giá trị"}: ${JSON.stringify(result.error.format())}`,
      };
    }

    return { ok: true, slots: result.data };
  } catch (err: unknown) {
    return {
      ok: false,
      reason_code: 'SLOTS_FILE_PARSE_ERROR',
      message: `Không thể nạp tệp slots: ${(err as Error).message}`,
    };
  }
}
