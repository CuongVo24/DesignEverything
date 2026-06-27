# Contract — M2-FIX Phục hồi trung thực ConformanceMatrix (drift + smoke-test thiếu)

> **Tầng:** Adapter (doc). Nguồn: Month 2 review (finding #2 + #3, xem [README](README.md)) + [Week-06](../../../../RoadMap/Month2/Week-06.md) checklist ("Cập nhật ConformanceMatrix trạng thái ✅" + "test thật trên Codex/Cursor") + [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md).

## 1. Micro-task target
Cập nhật [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md) phản ánh đúng thực tế sau Month 2: hook Claude Code (`SessionStart`/`UserPromptSubmit`/`PreToolUse`) và generator `AGENTS.md` đã **code + test**, nhưng **harness smoke run thật trên Codex/Cursor chưa làm**. Vá hai sai lệch: (1) matrix nói "chưa code" trong khi code đã chạy; (2) không được tô ✅ phủ harness mềm khi mới có unit test generator, chưa có smoke run thật.

## 2. Scope
**In scope** — chỉ [Design/Adapters/ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md):
- Dòng **Claude Code** (bậc A): đổi trạng thái từ `📐 spec locked, chưa code` → `✅` cho INJECT/GATE/EMIT đã có code + test (dẫn chứng: [sessionStart](../../../../../src/adapters/claude/sessionStart.ts), [userPromptSubmit](../../../../../src/adapters/claude/userPromptSubmit.ts), [preToolUse](../../../../../src/adapters/claude/preToolUse.ts), [render-inject](../../../../../src/adapters/claude/skill/render-inject.ts), [emit](../../../../../src/core/emit.ts) + e2e web/mobile).
- Dòng **AGENTS.md** (bậc B): trạng thái **trung thực hai phần** — generator [generateAgentsMd](../../../../../src/adapters/agents/generateAgentsMd.ts) đã code + unit test (✅ phần sinh rules); **harness smoke run thật (Codex/Cursor) ⏳ defer Month 3** (chưa được tô ✅). Không nhập nhằng giữa "có generator" và "đã verify trên harness".
- Cập nhật mục **"Trạng thái sau Batch 8"** (dòng ~33–36): đổi tiêu đề/nội dung thành trạng thái sau Month 2, ghi rõ cái gì đã code+test, cái gì còn nợ (smoke run + materialize artifact — trỏ tới [m2_polish_agents_md_artifact_drift_guard](m2_polish_agents_md_artifact_drift_guard_contract.md)).
- Giữ nguyên chú thích ký hiệu (✅ / 📐 / ⏳) và các dòng harness "để sau" (Cursor native, Antigravity, Windsurf).

**Out of scope**
- KHÔNG chạy smoke test Codex/Cursor trong contract này (việc dogfood của Month 3 — executor vitest không tự động hóa được harness ngoài).
- KHÔNG đụng code, test, hay spec khác (`claude-code.md`, `agents-md.md` giữ nguyên).
- KHÔNG tô ✅ cho bất kỳ harness nào chưa có bằng chứng test/smoke thật (nguyên tắc trung thực hai chiều).

## 3. Checklist
- [x] Dòng Claude Code phản ánh ✅ đúng các cột đã có code + test, kèm trỏ file.
- [x] Dòng AGENTS.md tách rõ: generator ✅ (unit-tested) vs harness smoke run ⏳ (defer Month 3).
- [x] Không tô ✅ cho phần chưa verify thật.
- [x] Mục "Trạng thái sau Batch 8" được cập nhật sang trạng thái Month 2, nêu rõ nợ còn lại.
- [x] Không có harness "để sau" nào bị đổi nhầm trạng thái.

## 4. Interfaces / Files expected to change
- Không có code/interface.
- `[MODIFY]` `Design/Adapters/ConformanceMatrix.md` (bảng + mục trạng thái cuối, ~+10/−6 dòng).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---|---|
| Tô ✅ quá tay cho AGENTS.md (bán quá lời) | Cao | Tách generator (✅ unit) khỏi harness smoke (⏳); chỉ ✅ cái có bằng chứng. |
| Bỏ sót đồng bộ với release-note known-limitations | TB | Đối chiếu [v1-release-note §4](../../../../RoadMap/Month2/v1-release-note.md); matrix không được mâu thuẫn với limitation #1/#2. |
| Drift mới giữa matrix và code sau này | Thấp | Trỏ thẳng file code trong ô trạng thái để lần sau dễ kiểm. |

## 6. Verification plan
- Đọc lại [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md): mọi ✅ đều trỏ được tới file code + test tồn tại thật; mọi ⏳ đều là việc chưa làm thật.
- `npm test` — không đổi code nên vẫn 57 test xanh (sanity, không hồi quy).
- Đối chiếu chéo: không còn chuỗi "chưa code" cho Claude Code / AGENTS.md.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cập nhật **[ConformanceMatrix.md](file:///e:/DesignEverything/Design/Adapters/ConformanceMatrix.md)** phản ánh trung thực trạng thái dự án sau Month 2.
  - Claude Code (Bậc A) được cập nhật từ `📐 spec locked, chưa code` sang `✅ Đã code + test`, ghi rõ các file dẫn chứng trong mã nguồn (`sessionStart.ts`, `userPromptSubmit.ts`, `preToolUse.ts`, `render-inject.ts`, `emit.ts`).
  - AGENTS.md (Bậc B) được tách bạch trung thực: Bộ sinh generator `✅ (unit test)` đã hoàn thành và test tốt, còn việc chạy thử thực tế (smoke run) trên các harness ngoài (Codex/Cursor/Cline) là `⏳ (defer Month 3)`.
  - Giữ nguyên trạng thái `⏳ để sau` của các harness native khác (Cursor native, Antigravity, Windsurf).
- Cập nhật phần "Trạng thái sau Batch 8" thành "Trạng thái sau Month 2 (v1.0.0)" mô tả chi tiết những gì đã code, những gì còn nợ kỹ thuật (technical debt), hoàn toàn thống nhất với `v1-release-note.md` và `m2_polish_agents_md_artifact_drift_guard_contract.md`.
- Chạy `npm test` xanh hoàn toàn 57/57 tests. Không có bất kỳ drift nào về mặt tài liệu.
