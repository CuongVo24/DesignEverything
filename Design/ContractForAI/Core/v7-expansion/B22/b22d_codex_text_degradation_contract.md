# Contract — B22d Codex/AGENTS.md: degradation `options` thành liệt kê text

> Tầng: Adapter (degradation, bậc B theo [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md)).
> Nguồn: [InteractiveQuestionCardsPlan.md](../../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §5 (bảng batch B22d), [D53](../../../../DecisionLog.md). Phụ thuộc: B22b.

## 1. Micro-task target

Cho harness bậc B (Codex, Cursor, mọi thứ đọc `AGENTS.md`) nhận đúng nội dung `options`/
`option_hints` dưới dạng **liệt kê text**, vì các harness này không có bề mặt thẻ tương tác — công
bố đúng mức chênh lệch enforcement giữa Claude Code (bậc A) và AGENTS.md (bậc B) trong
`ConformanceMatrix.md`, không hứa hai harness trải nghiệm giống nhau.

## 2. Scope

**In scope**

- [generateAgentsMd.ts](../../../../../src/adapters/agents/generateAgentsMd.ts) đọc `options` từ
  `Script` (đã có sẵn tham số `script: Script`, xem chữ ký hàm hiện có), khi câu đang active có
  `options`: sinh một khối text liệt kê `value — label: description` theo thứ tự mảng, đánh dấu entry
  `recommended` bằng nhãn `(khuyến nghị)`, và luôn có dòng cuối "Hoặc gõ tự do câu trả lời của bạn" —
  degradation text của cùng bất biến D55 mà B22c thực thi bằng thẻ.
- Khi câu có `option_hints`: sinh dòng nhắc agent (Codex) tự tổng hợp gợi ý từ answers đã commit theo
  `hint_style`, cùng nội dung ngữ nghĩa với khối `[Gợi ý lựa chọn]` của B22c nhưng ở dạng rule text
  tĩnh phù hợp `AGENTS.md` (không phải context injection động per-turn như Claude Code).
- Thêm dòng capability `interactive_choice` vào bảng Ma trận của `ConformanceMatrix.md`: cột giá trị
  cho **Claude Code** = "✅ thẻ tương tác thật", cho **AGENTS.md** = "text liệt kê (degradation)", các
  hàng Cursor/Antigravity/Windsurf giữ `⏳ để sau` như các dòng khác trong bảng hiện tại.
- Không tạo file `.mdc`/rule riêng cho Cursor/Antigravity/Windsurf — các harness đó đã ghi `⏳ để sau`
  trong `ConformanceMatrix.md` và nằm ngoài phạm vi lane này.

**Out of scope**

- Không thêm hook mới, không đổi PreToolUse cho Codex plugin.
- Không tự ý gộp `adapter/claude-code/cli.mjs` với `adapter/codex-plugin/cli.mjs` trong batch này —
  hai launcher vẫn tách theo đúng nguyên tắc hiện có của lane V6 (`b21a` §"Out of scope").
- Không đổi hành vi Codex pre/post-tool-use hook hiện có
  (`test/integration/installed-runtime/codex-pre-tool-use.test.ts`,
  `codex-post-tool-use.test.ts`) — chỉ đổi nội dung text sinh ra trong `AGENTS.md`.

## 3. Checklist

- [ ] `generateAgentsMd()` sinh đúng khối liệt kê cho câu có `options`, đúng thứ tự mảng, đánh dấu
      đúng một entry `recommended`, luôn có dòng "gõ tự do".
- [ ] Câu có `option_hints` sinh dòng rule text tổng hợp gợi ý, không bịa lựa chọn cụ thể (đúng tinh
      thần "không truy được nguồn → gắn cờ" dùng lại từ B22c).
- [ ] Câu không có field mới: output `generateAgentsMd()` không đổi một ký tự nào (regression test
      snapshot, dùng đúng snapshot hiện có của `generateAgentsMd.test.ts`/`.artifact.test.ts`).
- [ ] `ConformanceMatrix.md` có dòng `interactive_choice` mới, không sửa nội dung dòng khác trong
      bảng Ma trận.
- [ ] Không file hook Codex (`preToolUse`/`postToolUse` phía Codex) nào bị đổi — verify bằng
      `git diff` giới hạn đúng danh sách file ở mục 4.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/adapters/agents/generateAgentsMd.ts` — thêm nhánh sinh text cho `options`/
  `option_hints`, ~50 dòng.
- [MODIFY] `src/adapters/agents/generateAgentsMd.test.ts` — ca test nội dung mới, ~40 dòng.
- [MODIFY] `src/adapters/agents/generateAgentsMd.artifact.test.ts` — cập nhật snapshot nếu artifact
  test so khớp toàn văn `AGENTS.md`, xác nhận cách file này hoạt động khi bắt đầu implement.
- [MODIFY] `Design/Adapters/ConformanceMatrix.md` — một dòng capability mới trong bảng Ma trận,
  ≤10 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Text liệt kê bị đọc nhầm là bắt buộc chọn, không phải free-text | TB | Dòng "gõ tự do" luôn ở cuối khối, cùng vị trí mọi câu — tạo thói quen đọc nhất quán. |
| `generateAgentsMd.artifact.test.ts` snapshot vỡ vì khối text mới chèn vào giữa nội dung cũ | Thấp | Chèn khối mới ở vị trí cố định (ngay dưới phần hiển thị câu hỏi hiện tại), review diff snapshot tay trước khi DONE. |
| Hai harness lệch trải nghiệm gây kỳ vọng sai | TB | `ConformanceMatrix.md` công bố rõ mức degradation — theo D37, không hứa đồng đều. |

## 6. Verification plan

- `npx vitest run src/adapters/agents/generateAgentsMd.test.ts src/adapters/agents/generateAgentsMd.artifact.test.ts`
- `npm test` xanh toàn bộ — đặc biệt `codex-pre-tool-use.test.ts`/`codex-post-tool-use.test.ts`
  không đổi (bằng chứng không đụng hook).
- Đối chiếu tay dòng mới trong `ConformanceMatrix.md` với bảng thật, ghi vào Status khi DONE.

## 7. Status

IN_PROGRESS (2026-08-16) — `generateAgentsMd.ts` đã sinh mục 3a cho 19 câu có `options`/`option_hints`.
Codex nhận một skill text-only riêng (`adapter/codex-plugin/skills/design-everything/SKILL.md`,
không phải render từ Claude skill) — vượt phạm vi gốc của contract này nhưng cùng tinh thần
degradation, sẽ ghi nhận là mở rộng hợp lý khi đóng. Còn thiếu: dòng `interactive_choice` trong
`ConformanceMatrix.md` (deliverable tường minh, chưa có); `generateAgentsMd.test.ts` chưa có ca mới;
văn bản mục 3a hiện dùng token `value` thay vì văn xuôi theo D58, cần đồng bộ với `deriveAnswerText`
của B22c để hai adapter không lệch nhau (D53). Đóng ở lộ trình P6.
