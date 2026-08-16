# Interactive Cards — báo cáo số lượt gõ trước/sau (B22e)

> Nguồn đo: [test/journey/interactive-cards-turn-count.test.ts](../../../test/journey/interactive-cards-turn-count.test.ts).
> Chạy `npx vitest run test/journey/interactive-cards-turn-count.test.ts` để tái tạo. Không phải
> cảm nhận — số liệu dưới đây đo qua state machine thật (`commitStep`/`issueTurnCapability`/
> `loadScript`), đi hết hành trình web canonical thật, không phải danh sách ID viết tay.

## Đối tượng đo

Hành trình web canonical: `CAL0, S0–S7, R1, S8, W1–W5` — 16 câu, đúng như plan §1 mô tả. Test đi hết
hành trình này qua `commitStep` thật (cùng harness `commitWithCapability` mà
`test/journey/newbie-shapes.test.ts` NJ-01..05 đã dùng), xác nhận thứ tự 16 câu khớp chính xác danh
sách trên — không phải giả định, mà là đầu ra thật của state machine khi chọn `branchChoice: 'web'`
ở S7.

## Định nghĩa

- **Một lượt (turn)** = một lần gọi `commitStep` thành công (D54: một lượt người thật = đúng một
  `commit`).
- **Câu cần gõ tay (free-text)** = `resolveQuestionInteraction(question).kind === 'free_text'` —
  Core không có `options`/`option_hints` cho câu đó nên thẻ `AskUserQuestion` không có gì để render.
- **Câu có trợ giúp thẻ (assisted)** = `kind !== 'free_text'` — có `options` hoặc `option_hints`.

## Kết quả đo

| Chỉ số | Giá trị | Nguồn |
|---|---:|---|
| Tổng số câu trong hành trình canonical | 16 | test, khớp `CAL0, S0-S7, R1, S8, W1-W5` |
| Tổng số lượt `commit` | 16 | D54 — một lượt = một commit, không đổi bởi lane này |
| Câu free-text (bắt buộc tự soạn văn xuôi) | 5 — `S0, S6, R1, S8, W5` | test, đối chiếu `resolveQuestionInteraction` |
| Câu có trợ giúp thẻ | 11 — `CAL0, S1-S5, S7, W1-W4` | test |
| **Baseline (trước 8.1)** — tin nhắn gõ tay | **32** | plan §1: mỗi câu 2 lượt gõ (trả lời + xác nhận dịch ngược), `16 × 2 = 32` |
| **Sau 8.1** — tin nhắn gõ tay (hành trình canonical, không dùng Other/không timeout) | **5** | mỗi câu free-text vẫn cần gõ câu trả lời; xác nhận dịch ngược nay LUÔN là thẻ 3 lựa chọn (Đúng rồi/Sửa lại/Giải thích thêm) cho MỌI câu — kể cả câu free-text — nên không còn cần gõ để xác nhận |
| **Giảm** | **84%** (32 → 5) | `Math.round((1 - 5/32) * 100)` |

## Lệch với số liệu cũ đã công bố tạm thời

`InteractiveQuestionCardsPlan.md` header và `v8.1-release-note.md` (viết ở P0, đã đánh dấu
**"Provisional — modeled, not yet measured"** đúng vì lý do này) trước đó ghi tạm "at most 16 keyboard
submissions" — con số đó là suy đoán chưa đo, và **sai**: nó có vẻ nhầm giữa "tổng số lượt tương tác
còn lại" (16 lượt `commit`, đúng) với "số tin nhắn cần GÕ TAY" (5, không phải 16). Lý do sai: câu hỏi
xác nhận dịch ngược trước 8.1 luôn cần gõ ("đồng ý"/sửa), nhưng sau 8.1 xác nhận LUÔN là thẻ — kể cả
với 5 câu free-text — nên không tính vào số gõ tay nữa. Số liệu bài này (5, giảm 84%) là số liệu THẬT
đầu tiên, thay thế số "16" tạm thời đó. P8 sẽ cập nhật lại `v8.1-release-note.md` và
`InteractiveQuestionCardsPlan.md` header theo số liệu này.

## Giới hạn

- Đo trên hành trình **canonical duy nhất** (không dùng Other, không timeout, không rẽ nhánh
  mobile/cli/hybrid). Nếu người dùng chọn Other ở một câu có trợ giúp thẻ, câu đó quay lại thành gõ
  tay — số liệu 5 là **tối thiểu** khi mọi lựa chọn có sẵn đều phù hợp, không phải cam kết tuyệt đối.
- Không đo độ trễ hay trải nghiệm thẻ thật (đó là phạm vi R-spike, [r-spike-userpromptsubmit-probe.md](../../ContractForAI/Core/v7-expansion/r-spike-userpromptsubmit-probe.md)) — chỉ đo số lượt/tin nhắn.
- `golden-web.test.ts` không đo lượt (nó so cấu trúc doc output với answers cứng) — đây là test riêng,
  không phải mở rộng của golden-web, ghi rõ trong B22e §7.
