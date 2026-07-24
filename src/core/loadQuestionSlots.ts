import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { canonicalizeWorkspacePath } from './pathPolicy.js';
import { slotProvenanceRecordSchema, SlotProvenanceRecord } from './schemas/index.js';

export type LoadSlotsResult =
  | { ok: true; slots: SlotProvenanceRecord }
  | { ok: false; reason_code: string; message: string };

const MAX_SLOT_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export function loadQuestionSlots(
  workspaceRoot: string,
  session: string,
  questionId: string,
  fileName: string
): LoadSlotsResult {
  const relPath = `.design-everything/scratch/${session}/${questionId}/${fileName}`;
  const canon = canonicalizeWorkspacePath(workspaceRoot, relPath);

  if (!canon.ok) {
    return {
      ok: false,
      reason_code: canon.reason_code,
      message: canon.message,
    };
  }

  const absPath = join(workspaceRoot, canon.canonicalPath);
  if (!existsSync(absPath)) {
    return {
      ok: false,
      reason_code: 'SLOT_FILE_NOT_FOUND',
      message: `Tệp slots không tồn tại tại đường dẫn: ${canon.canonicalPath}`,
    };
  }

  try {
    const stat = statSync(absPath);
    if (stat.size > MAX_SLOT_FILE_SIZE_BYTES) {
      return {
        ok: false,
        reason_code: 'SLOT_FILE_OVERSIZED',
        message: `Kích thước tệp slots (${stat.size} bytes) vượt quá giới hạn cho phép 1MB.`,
      };
    }

    const content = readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(content);
    const result = slotProvenanceRecordSchema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        reason_code: 'INVALID_SLOT_SCHEMA',
        message: `Tệp slots không đúng định dạng schema hợp lệ: ${JSON.stringify(result.error.format())}`,
      };
    }

    return {
      ok: true,
      slots: result.data,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      reason_code: 'SLOT_PARSE_ERROR',
      message: `Không thể nạp tệp slots: ${(err as Error).message}`,
    };
  }
}
