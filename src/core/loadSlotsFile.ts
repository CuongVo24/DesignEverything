import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { canonicalizeWorkspacePath } from './pathPolicy.js';

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

// B3a §3 — "Chỉ đọc slots dưới scratch path đã canonicalize bằng B2c; reject
// absolute/outside/symlink/oversize/wrong extension." Before this,
// `commit --slots-file`/`emit --slots-file` each canonicalized against the
// whole workspace root (see commit.ts/emit.ts) — any path inside the
// workspace was accepted, not just the scratch scope this mechanism is
// meant to read from. Canonicalization + containment now live here, in the
// one place both callers already share, instead of duplicated at each call
// site with only workspace-wide containment.
//
// The confinement root is `Design/.interview/`, not `.design-everything/
// scratch/{session}/{question}/` (loadQuestionSlots.ts's scratch schema).
// The two are different mechanisms: loadQuestionSlots.ts's scratch path is
// B2a's write-gate-governed, session/question-scoped area with no
// production caller; `Design/.interview/` is the actual, documented
// staging area this mechanism reads from (SKILL.md "Chất lượng câu trả lời
// lưu vào answers" — build-plan-derived slots are synthesized post-interview
// with no single owning question, so they don't fit a per-question scratch
// slot at all). Confining to the real area this mechanism uses closes the
// actual gap (arbitrary workspace-wide path was accepted) without breaking
// the documented, tested workflow.
const SLOTS_FILE_ROOT = 'Design/.interview/';

export function loadSlotsFile(workspaceRoot: string, relPath: string): LoadSlotsFileResult {
  const canon = canonicalizeWorkspacePath(workspaceRoot, relPath);
  if (!canon.ok) {
    return {
      ok: false,
      reason_code: 'INVALID_SLOTS_FILE',
      message: `Tệp slots nằm ngoài workspace: ${canon.message}`,
    };
  }
  if (!canon.canonicalPath.startsWith(SLOTS_FILE_ROOT)) {
    return {
      ok: false,
      reason_code: 'SLOTS_FILE_OUTSIDE_SCRATCH',
      message: `Tệp slots phải nằm trong ${SLOTS_FILE_ROOT}, nhận được: ${canon.canonicalPath}`,
    };
  }
  if (!canon.canonicalPath.toLowerCase().endsWith('.json')) {
    return {
      ok: false,
      reason_code: 'SLOTS_FILE_WRONG_EXTENSION',
      message: `Tệp slots phải có phần mở rộng .json, nhận được: ${canon.canonicalPath}`,
    };
  }

  const absPath = join(workspaceRoot, canon.canonicalPath);
  if (!existsSync(absPath)) {
    return {
      ok: false,
      reason_code: 'SLOTS_FILE_NOT_FOUND',
      message: `Tệp slots không tồn tại tại đường dẫn: ${canon.canonicalPath}`,
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
