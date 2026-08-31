# Interview Cadence — gộp lượt, bỏ thẻ dịch ngược, undo thay cho xác nhận trước

> **Cập nhật 2026-08-31 (D68):** lane này **không** ra dưới số 8.2.0. Nó chưa bao giờ được cắt
> (`package.json` đứng nguyên 8.1.0, repo 0 tag), nên changelog của nó gộp vào 9.0.0 — xem
> [Versioning.md](../Core/Versioning.md) và Gate E3 ở [MasterSequencingPlan.md](MasterSequencingPlan.md).
> Phần dưới giữ nguyên văn bản gốc lúc mở lane.

> **Lane MỞ — 2026-08-16.** Target version **8.2.0** — MINOR trên nền `8.1.1` (Đợt 1 hotfix H1-H6,
> xem [ConformanceMatrix.md](../Adapters/ConformanceMatrix.md)), vì mọi field mới trên
> `turnCapabilityRecordSchema`/`questionSchema` đều `.optional()`, không `.default()` (tương thích
> ngược: token/store cũ đọc được nguyên vẹn, xem [DecisionLog.md](../DecisionLog.md) D60/D61).
>
> Vai trò: TaskBrief nguồn cho `Design/ContractForAI/Core/v8-expansion/` theo ngoại lệ expansion
> lane ([CONTRACT_STRUCTURE_RULE](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) §0). "v8" ở đây là
> **số thứ tự lane** (lane mở rộng thứ 8, sau v2..v7-expansion) — **không phải** version 8.x.x nói
> chung. Điều kiện mở: Đợt 1 (8.1.1 hotfix H1-H6) đã merge — xác nhận tại
> [v8-hotfix/](../ContractForAI/Core/v8-hotfix/), 6/6 contract DONE.
>
> Đây chính là lane mà [InteractiveQuestionCardsPlan.md §7](InteractiveQuestionCardsPlan.md) tự
> khai là "lane khác cần security review riêng" khi bảo lưu việc gộp nhiều câu vào một lượt.

## 1. Vấn đề

Phiên test thật đầu tiên của lane 8.1 (interactive cards) chết ngay ở bước `init` (đóng ở Đợt 1,
H1-H6). Sau khi mở được đường đi, vấn đề thứ hai lộ ra: nhịp phỏng vấn vẫn là **một câu một lượt**,
và mỗi câu còn tốn thêm một thẻ xác nhận dịch ngược trước khi commit — 16 câu của hành trình web
canonical (`CAL0, S0-S8, R1, W1-W5`) tốn đúng 16 lượt, cộng thuế xác nhận đều tay trên cả 14 câu
không có Critic-pass phía sau (chỉ S3/W5/M5/C5 có critic — 4/16 hoặc 4/26 toàn kịch bản).

`InteractiveQuestionCardsPlan.md §7` tự bảo lưu việc gộp nhiều câu vào một lượt là "lane khác, cần
security review riêng" vì nó đụng thẳng mô hình uỷ quyền (`turnCapability.ts`, `checkRate`). Đây là
lane đó.

## 2. Mục tiêu

Ba thay đổi, theo ba quyết định đã khoá ở [DecisionLog.md](../DecisionLog.md):

- **D59** — bỏ thẻ xác nhận dịch ngược làm điều kiện tiên quyết để commit. Bản dịch ngược vẫn in ra
  cùng kết quả commit; bù bằng lệnh `undo` mới.
- **D60** — gộp nhiều câu vào một lượt, nhưng **Core quyết định batch, không phải agent chọn**.
  Token mang danh sách `question_ids`; `checkRate` nới trần đúng bằng số câu trong batch.
  Supersedes D54 (không đảo tính chất chống bypass của D54, chỉ đổi đơn vị: từ "một token = một
  câu" sang "một token = một batch do Core tính").
- **D61** — `multi_select` cho câu mà slot vốn là danh sách (S1, S2, S4, S5). W4/C4 loại khỏi
  danh sách khi triển khai: options của hai câu đó loại trừ lẫn nhau (một phương thức đăng nhập /
  một hệ điều hành mục tiêu), không phải danh sách cộng dồn — xem [DecisionLog.md](../DecisionLog.md)
  D61.

**Kết quả nhắm tới:** hành trình web canonical từ 16 lượt xuống còn 10 lượt (số chiếu từ
`computeBatch`, xem §5 — con số thật phải để B24f đo lại bằng test đi qua state machine thật, không
phải đếm tay).

## 3. Quyết định đã khoá

D59, D60, D61 đã duyệt và ghi vào [DecisionLog.md](../DecisionLog.md) (2026-08-16), trước khi
contract nào trong lane này được viết — đúng thứ tự "design khoá trước, contract sau" của
[CONTRACT_STRUCTURE_RULE](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) §0.

Điểm trung thực cần nói thẳng về D60 (không giấu trong contract): hôm nay một capability token chết
ngay sau đúng một commit; sau D60 nó sống qua tối đa 4 commit trong cùng một lượt, cho tới khi TTL
1800s hết. Nếu người dùng ngừng gõ giữa chừng, agent vẫn có thể commit nốt các câu còn lại trong
batch. Bù lại: bán kính nổ bị chặn cứng ở ≤4 câu, và `computeBatch` loại sẵn mọi câu có
`option_hints` hoặc Critic-pass, không vượt ranh giới nhánh (S7) — agent không có quyền tự mở rộng
batch mà Core đã tính.

## 4. Hai cơ chế bù trừ — vì sao bỏ xác nhận trước không phải là bỏ an toàn

| Cơ chế cũ (8.1) | Cơ chế mới (8.2) | Vẫn giữ nguyên |
|---|---|---|
| Thẻ xác nhận dịch ngược (3 lựa chọn, chặn trước commit) trên **mọi** câu | In bản dịch ngược cùng kết quả commit + `undo` (hoàn tác được sau) | `answer_contract`/`warning_rules` vẫn ép tại thời điểm commit — không đổi |
| Một token = một câu | Một token = một batch do Core tính (`computeBatch`), agent không tự chọn kích thước | Capability token vẫn bắt buộc, vẫn hash-verified, vẫn one-time trên toàn batch |
| Không có đường sửa sau khi commit | `undo` hoàn tác đúng câu vừa commit gần nhất (một bước, fail-closed sau `emit`) | Critic-pass (S3/W5/M5/C5) vẫn đòi thẻ ack riêng, không gộp vào batch |

## 5. Batch và phụ thuộc

| Batch | Tầng | Kết quả |
|---|---|---|
| **B24a** | Lõi | `undo` — `selectNextStep` tách dùng chung, `undoStep.ts` (pure engine), `undoLastAnswer` application service, wiring CLI (`cliOps/undo.ts`, `classifyCliSubcommand.ts`, `commandSurface.ts`). |
| **B24b** | Lõi | Batch capability — `turnCapabilityRecordSchema` thêm `question_ids`/`consumed_question_ids` (optional, không default — xem cảnh báo checksum ở B24b contract), `verifyTurnCapability` 3 guard sửa, `checkRate` trần theo batch, `computeBatch(progress, script)`. |
| **B24c-1** | Lõi | `multi_select` schema (`interviewScript.ts`), `deriveMultiAnswerText`, `QuestionInteraction.multiSelect`. |
| **B24c-2** | Nội dung | Bật `multi_select: true` cho S1, S2, S4, S5 trong `script.yaml` + 4 file song sinh + `interview-script.md`. |
| **B24d** | Adapter (Claude) | Viết lại `SKILL.md` nhịp lượt (bỏ bước thẻ dịch ngược, sửa 4 quy tắc vàng theo D59, gỡ mâu thuẫn nhịp cũ), đồng bộ `render-inject.ts`. |
| **B24e** | Adapter (degradation) | Đồng bộ `generateAgentsMd.ts`/`AGENTS.sample.md`, dòng `ConformanceMatrix.md` cho 8.2 (harness mềm không có `checkRate` ép cứng — batch chỉ là chỉ dẫn best-effort, công bố rõ). |
| **B24f** | QA | Invariants (batch/multi_select/undo/checksum-regression), viết lại `interactive-cards-turn-count.test.ts` đếm ranh giới lượt thật. |

Thứ tự bắt buộc:

    B24a ──────────────┐
    B24b ───────────────┼── B24d ── B24e ── B24f
    B24c-1 ─ B24c-2 ────┘

R-spike (đã dựng ở lane 7 — [r-spike-userpromptsubmit-probe.md](../ContractForAI/Core/v7-expansion/r-spike-userpromptsubmit-probe.md))
chạy **song song**, không chặn code: nó chỉ quyết định *đơn vị đo* của con số headline (lượt vs tin
gõ) trong [v8.1-release-note.md](v8.1-release-note.md), không quyết định thiết kế batch/undo/
multi_select.

## 6. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Field mới trên `turnCapabilityRecordSchema` dùng `.default()` thay vì `.optional()` → checksum vỡ trên mọi store đang sống | Cao nếu xảy ra | `computePayloadChecksum` tính trên envelope đã zod-parse — `.default()` nhồi giá trị vào record cũ trước khi tính lại checksum, gây `CHECKSUM_MISMATCH` toàn bộ. B24b contract ghi rõ quy tắc `.optional()` không `.default()`, B24f có test regression nạp fixture store cũ. |
| Batch làm token chết sớm vì `expected_revision` lệch sau commit đầu tiên trong batch | Cao nếu không sửa | Công thức so khớp đổi thành `expected_revision + consumed_question_ids.length === currentRevision`, thu về đúng luật cũ khi `consumed = []`. |
| Bỏ thẻ xác nhận trước khiến lỗi đánh máy đi thẳng vào doc, `undo` không đủ bù | TB | `answer_contract`/`warning_rules` vẫn ép nguyên tại thời điểm commit (không đổi bởi lane này) — lưới chặn nội dung sai không phụ thuộc thẻ xác nhận trước. |
| Harness mềm (AGENTS.md) không có `checkRate` ép cứng, batch chỉ là gợi ý, agent có thể phớt lờ | TB | `ConformanceMatrix.md` công bố rõ mức chênh lệch enforcement (D37) — không hứa đồng đều giữa Claude Code (bậc A, ép cứng) và AGENTS.md (bậc B, best-effort). |
| Con số "16→10 lượt" trong tài liệu này là chiếu, không phải đo | TB | B24f viết lại `interactive-cards-turn-count.test.ts` đếm số lần `issuePromptCapability` phải gọi để đi hết journey qua state machine thật — con số đó, không phải con số trong bảng §5, mới được ghi vào release note. |

## 7. Out of scope

- Lỗ hổng newline bypass ([R08](../ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md)) và
  đường `amend` chết — đã được lane 8.1 khai là việc độc lập, giữ nguyên ở lane này.
- Đổi nội dung câu hỏi, thứ tự câu, hay `translate_back` — lane này chỉ đổi *nhịp thu* câu trả lời
  và *đơn vị* của một lượt.
- Sửa `slot_keys` lệch của M3/M4/M5 (M3 hỏi quyền thiết bị nhưng khai
  `distribution_strategy`/`release_goal`/`monetization_strategy`) — phát hiện trong lúc thiết kế
  lane này, tách thành việc riêng, không sửa lén.
- Chặn MCP write tool theo allow-list — vẫn chọn công bố giới hạn thay vì chặn (D37), theo đúng
  hướng H3 đã chốt ở Đợt 1.

## 8. Definition of Done

- Một người dùng đi hết nhánh web/cli mà mỗi lượt gõ có thể trả lời/commit đúng nhiều câu như batch
  Core đã tính, không phải đúng một câu.
- `undo` hoàn tác đúng câu vừa commit gần nhất, xoá sạch `answers`/`slots` liên quan, không mở được
  sau `emit`.
- `multi_select` hoạt động trên S1, S2, S4, S5; không bật được trên CAL0/S7 (chặn ở tầng
  schema, không chỉ ở tầng test).
- Một store/token phát trước lane này (không có `question_ids`/`multi_select`) vẫn đọc được nguyên
  vẹn — không `CHECKSUM_MISMATCH`, không vỡ verify.
- Số lượt gõ của golden transcript web giảm có đo được qua state machine thật, ghi vào
  `v8.1-release-note.md`/`v8.2-release-note.md` — không claim bằng cảm nhận.
- R-spike đóng (log thật từ một phiên Claude Code), con số headline trong release note sửa theo kết
  quả thật nếu khác giả định.
