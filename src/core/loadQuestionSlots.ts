import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { canonicalizeWorkspacePath } from './pathPolicy.js';
import { slotProvenanceRecordSchema, SlotProvenanceRecord, Script } from './schemas/index.js';

export type LoadSlotsResult =
  | { ok: true; slots: SlotProvenanceRecord }
  | { ok: false; reason_code: string; message: string };

const MAX_SLOT_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

// Slot files declare which producer/version wrote them; only versions this
// engine actually knows how to interpret are accepted. Absent is treated as
// legacy/pre-versioning and allowed, matching how other optional envelope
// fields in this codebase stay additive/backward-compatible.
export const KNOWN_SLOT_PRODUCER_VERSIONS = ['1.0.0'];

// A single path segment: no separators, no `..`, no empty string. Every
// component of the scratch path (session/questionId/fileName) is
// caller-supplied and gets spliced into a path template before
// canonicalization — canonicalizeWorkspacePath only proves the *final*
// resolved path stays inside the workspace root, so a questionId of
// `../S1` would still resolve to a workspace-contained path (just not the
// caller's own question's scratch directory) and sail through that check
// unnoticed. Segment-level validation closes that before the template is
// even built.
function isSafePathSegment(segment: string): boolean {
  return segment.length > 0 && segment !== '.' && segment !== '..' && !/[\\/]/.test(segment);
}

export function loadQuestionSlots(
  workspaceRoot: string,
  script: Script,
  session: string,
  questionId: string,
  fileName: string
): LoadSlotsResult {
  for (const [label, segment] of [
    ['session', session],
    ['questionId', questionId],
    ['fileName', fileName],
  ] as const) {
    if (!isSafePathSegment(segment)) {
      return {
        ok: false,
        reason_code: 'SLOT_PATH_SEGMENT_INVALID',
        message: `Tham số ${label} không hợp lệ: phải là một tên đơn, không chứa dấu phân cách đường dẫn hay "..".`,
      };
    }
  }

  if (!script.questions.some((q) => q.id === questionId)) {
    return {
      ok: false,
      reason_code: 'QUESTION_NOT_IN_ALLOWLIST',
      message: `questionId "${questionId}" không thuộc bất kỳ câu hỏi nào trong script.yaml hiện tại.`,
    };
  }

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

    if (
      result.data.producer_version !== undefined &&
      !KNOWN_SLOT_PRODUCER_VERSIONS.includes(result.data.producer_version)
    ) {
      return {
        ok: false,
        reason_code: 'SLOT_PRODUCER_VERSION_UNSUPPORTED',
        message: `producer_version "${result.data.producer_version}" không được engine hiện tại hỗ trợ (hỗ trợ: ${KNOWN_SLOT_PRODUCER_VERSIONS.join(', ')}).`,
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
