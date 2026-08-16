# Contract — B22c Adapter Claude: thẻ tương tác + nhịp lượt mới

> Tầng: Adapter (Claude). Nguồn: [InteractiveQuestionCardsPlan.md](../../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §2, §5 (bảng batch B22c), [D53](../../../../DecisionLog.md)/[D54](../../../../DecisionLog.md)/[D55](../../../../DecisionLog.md).
> Phụ thuộc: R-spike (quyết định có cần giữ câu trả lời qua lượt), B22b (field `options`/`option_hints`
> phải tồn tại trong schema trước khi render).

## 1. Micro-task target

Đưa `options`/`option_hints` từ `Script` vào ngữ cảnh inject của
[render-inject.ts](../../../../../src/adapters/claude/skill/render-inject.ts), và viết lại nhịp lượt
trong [SKILL.md](../../../../../adapter/claude-code/skill/SKILL.md): thẻ hỏi → thẻ dịch ngược →
commit → thẻ câu kế, gom trọn `hỏi → trả lời → dịch ngược → xác nhận` vào một lượt gõ của người dùng.

## 2. Scope

**In scope**

- `renderInject()` thêm một khối `[Lựa chọn (options)]` khi `question.options` tồn tại: liệt kê từng
  entry `value`/`label`/`description`, đánh dấu entry `recommended`, và luôn ghi rõ dòng "Người dùng
  có thể gõ tự do thay vì chọn — đường tự nhập luôn mở" (thực thi D55 ở tầng inject).
- Khi `question.option_hints` tồn tại: thêm khối `[Gợi ý lựa chọn — agent tự tổng hợp]` ghi
  `hint_style` + danh sách answers nguồn (`synthesize_from`) đã commit, kèm chỉ dẫn agent PHẢI tổng
  hợp lựa chọn từ answers thật, KHÔNG bịa — tái dùng đúng ngôn ngữ "không truy được nguồn → gắn cờ"
  đã có ở lane V6 (D51 cũ / D... hiện hành của v6-expansion, xem README lane đó) để nhất quán.
- Với câu có Critic-pass: thêm một biến thể thẻ ack (`Đồng ý` / `Điều chỉnh`) SAU thẻ dịch ngược,
  trước khi commit — giữ nguyên toàn bộ logic Critic-pass hiện có trong `renderInject`, chỉ đổi cách
  người dùng xác nhận (thẻ thay vì gõ "đồng ý").
- `SKILL.md` (`adapter/claude-code/skill/SKILL.md`) viết lại phần mô tả nhịp lượt: thẻ câu hỏi (2–4
  lựa chọn + ô tự nhập) → người dùng chọn/gõ → agent dịch ngược bằng thẻ thứ hai
  (`Đúng rồi`/`Sửa lại`/`Giải thích thêm`) → nếu có Critic-pass, thẻ ack → `commit` bằng token đang
  cầm → bắn ngay thẻ câu kế tiếp.
- Cơ chế "giữ câu trả lời qua lượt" (nếu R-spike kết luận `UserPromptSubmit` KHÔNG bắn khi trả lời
  thẻ) HOẶC commit ngay trong lượt (nếu R-spike kết luận CÓ bắn) — chọn đúng một nhánh theo kết quả
  R-spike, ghi rõ nhánh nào được implement vào Status khi DONE.
- KHÔNG đổi mô hình uỷ quyền (D54): capability token và `checkRate` giữ nguyên nghĩa — thẻ tương tác
  chỉ đổi cách thu câu trả lời của một câu đang chờ trong lượt, một lượt vẫn tối đa một `commit`.

**Out of scope**

- Không đổi field `options`/`option_hints` — đã khoá ở B22b.
- Không đổi `commitStep`, `turnCapability.ts`, `advanceState.ts` — theo D54.
- Không viết Codex/AGENTS.md text degradation — đó là B22d.
- Không gộp nhiều câu vào một lượt (đó là lane "gom nhiều câu vào một lượt" ở plan §7, out of scope
  tường minh).

## 3. Checklist

- [x] `renderInject()` phát khối `[Lựa chọn (options)]` đúng khi có `options`, khối
      `[Gợi ý lựa chọn]` đúng khi có `option_hints`, và giữ nguyên hành vi cũ (chuỗi rỗng khi
      `current_step === null`, throw khi câu không tồn tại) khi câu không có field mới — 7 test cũ
      + 7 test mới trong `render-inject.test.ts` (14/14 pass).
- [x] Mọi câu có `options` trong context inject luôn kèm dòng nhắc đường tự nhập — test
      `'always keeps the free-text reminder...'` bắt được nếu dòng này bị xoá.
- [x] Critic-pass + thẻ ack: câu có `critics[id]` vẫn yêu cầu Challenge/Ack prompt đúng như hiện tại
      (test cũ `'should inject critics section...'` không sửa); thêm mục "Thẻ ack" riêng trong
      `SKILL.md` cho cả Critic-pass lẫn `ANSWER_NEEDS_USER_ACK`.
- [x] `SKILL.md` mô tả đúng nhịp lượt mới (mục "Thẻ tương tác cho câu có `options`/`option_hints`
      (8.1)"), không mâu thuẫn 4 Quy tắc vàng — đối chiếu tay ghi ở §7.
- [x] Nhánh giữ-câu-trả-lời-qua-lượt: **chưa xác nhận bởi R-spike** (P2 vẫn chờ chủ repo chạy phiên
      thật — xem [r-spike-userpromptsubmit-probe.md](../r-spike-userpromptsubmit-probe.md) §7). Code
      hiện tại đi theo giả định "commit ngay trong lượt, không giữ câu trả lời" — mỗi lượt vẫn tối
      đa một `commit`, token cũ hết hiệu lực đúng bất biến D54. Nếu R-spike bác giả định này, batch
      này phải mở lại.
- [x] `AMD-01`-style invariant: đã có sẵn từ trước lane này ở
      [test/docs/skill-truth.test.ts](../../../../../test/docs/skill-truth.test.ts) (P10, quét cả 3
      `SKILL.md` đối chiếu `CLI_COMMAND_SURFACE` hai chiều) — chạy lại sau khi sửa SKILL.md, 37/37
      pass, không cần viết thêm.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/adapters/claude/skill/render-inject.ts` — thêm 2 khối context có điều kiện, ~50 dòng.
- [MODIFY] `src/adapters/claude/skill/render-inject.test.ts` — ca test cho cả hai khối mới + câu
  không có field mới (regression), ~80 dòng.
- [MODIFY] `adapter/claude-code/skill/SKILL.md` — phần mô tả nhịp lượt, ~40 dòng thay/thêm.
- [MODIFY] `adapter/claude-code/skill/build/SKILL.md` nếu file này là bản build/sync từ `SKILL.md`
  gốc — xác nhận quan hệ giữa hai file khi bắt đầu implement, đừng sửa lệch nhau.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Nhịp "giữ câu trả lời qua lượt" phụ thuộc model nhớ đúng | Cao | R-spike quyết định trước; nếu cần giữ, `translate_back` + `warning_rules` hiện có vẫn là lưới chặn cuối, không đổi. |
| `option_hints` khiến agent tự chế lựa chọn lệch answers trước | TB | B22e kiểm gợi ý phải trích được từ answers đã commit; context inject ghi rõ chỉ dẫn "không bịa". |
| SKILL.md mới mâu thuẫn 4 Quy tắc vàng đang neo trong code | TB | Checklist đối chiếu trực tiếp với `render-inject.ts` — không viết SKILL.md tách rời code thật. |
| Thẻ tương tác chỉ Claude Code có → hai harness lệch | TB | D53 giữ dữ liệu ở Lõi; B22d làm degradation text riêng; ConformanceMatrix (B22d) công bố đúng mức. |

## 6. Verification plan

- `npx vitest run src/adapters/claude/skill/render-inject.test.ts`
- `npm test` xanh toàn bộ — đặc biệt golden transcript hiện có không đổi khi câu không có
  `options`/`option_hints` (regression tương thích ngược).
- Đối chiếu tay `SKILL.md` mới với `render-inject.ts` thật, ghi vào Status khi DONE.

## 7. Status

DONE-với-điều-kiện (2026-08-16, lộ trình P5, nhánh `codex/lane-8-1-interactive-cards`) — mọi phần
tự đóng được trong một phiên đã xong; phần còn treo là R-spike (P2, cần chủ repo chạy phiên thật,
không tự động hoá được ở đây — cùng lớp với Gate A3/B1 của master plan).

**Đã làm:**
- `src/core/interactionChoices.ts` thêm `deriveAnswerText(option)` = `` `${label}: ${description}` ``
  (export qua `src/core/index.ts`) — Core sở hữu văn xuôi commit theo D58, không phải adapter tự chế,
  giữ đúng D53 "lõi béo, adapter gầy" (Claude và AGENTS.md dùng chung một hàm ở B22d).
- `render-inject.ts`: mỗi option trong khối `[Lựa chọn (options)]` in kèm đúng dòng
  `--answer "<label>: <description>"` sẽ dùng khi commit — thay literal `[value]` cũ. Dòng nhắc rõ
  `value` nội bộ KHÔNG BAO GIỜ đi vào `--answer`, chỉ dùng cho `--branch`/`--calibrate` ở S7/CAL0.
  `[Hướng dẫn cho Skill]` phân biệt rõ nhánh `static` (map label→dòng --answer in sẵn, note riêng
  cho S7/CAL0 cần thêm cờ) và nhánh `hints` (agent tự soạn theo `hint_style`).
- `SKILL.md`: thay đoạn tiếng Anh dày đặc bằng mục "Thẻ tương tác cho câu có `options`/`option_hints`
  (8.1)" tiếng Việt đúng giọng file — 5 bước (thẻ hỏi → chọn/gõ → thẻ dịch ngược 3 lựa chọn → thẻ ack
  nếu có Critic-pass/warning → commit bằng token đang cầm, bắn thẻ câu kế), cộng đoạn fail-closed
  tường minh (timeout/dismiss/label lạ/token hết hạn = không commit, không bịa token, không giữ câu
  trả lời qua lượt). Mục "Câu đặc biệt" (CAL0/S7) cập nhật: `--answer` + `--branch`/`--calibrate`
  đi cùng nhau, không thay thế nhau.
- **Xác nhận quan hệ file (mục 4 dòng cuối):** `adapter/claude-code/skill/build/SKILL.md` là skill
  `/build` (điều phối thực thi task từ `execution-plan.json`) — hoàn toàn khác skill phỏng vấn này,
  KHÔNG phải bản sync/twin. Không đụng tới.
- `test/docs/skill-truth.test.ts` (đã có sẵn từ P10, không phải viết mới) chạy lại sau khi sửa
  `SKILL.md` — 37/37 pass, xác nhận không dạy lệnh CLI giả.

**Còn treo (không thuộc lỗi của batch này):** kết luận R-spike (P2) — nếu bác giả định "commit ngay
trong lượt", phần "Thẻ tương tác" ở trên phải viết lại thêm cơ chế giữ câu trả lời qua lượt.

`npx vitest run src/adapters/claude/skill/render-inject.test.ts` = 14/14 pass (7 cũ + 7 mới).
`npm run lint`/`typecheck:all` xanh.
