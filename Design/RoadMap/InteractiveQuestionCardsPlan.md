# Interactive Question Cards — phỏng vấn bằng thẻ chọn thay vì gõ văn xuôi

> **Lane CHƯA mở.** Target version **8.1.0** — MINOR trên nền V6 `8.0.0` ([v6-expansion/README.md](../ContractForAI/Core/v6-expansion/README.md)), vì B22b tự khai tương thích ngược: thiếu `options` = câu free-text như cũ. Lane này chạy **sau** V6 — cái được chốt 2026-08-01 chỉ là **thứ tự lane**, KHÔNG phải là V6 đã xong: nền `8.0.0` vẫn CHƯA tồn tại (cả 6 contract `B19a–B21b` còn `WAITING_FOR_APPROVAL`, D49–D52 chưa duyệt — xem [v6-expansion/README.md](../ContractForAI/Core/v6-expansion/README.md)). Lane cũng không được chen hàng trước khi **toàn bộ điều kiện** gỡ block 7.0.0 của `v1-fix-bugs` ở [v7-release-note.md](v7-release-note.md) §0 đóng.
>
> Vai trò: TaskBrief nguồn cho `Design/ContractForAI/Core/v7-expansion/` theo ngoại lệ expansion lane ([CONTRACT_STRUCTURE_RULE](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) §0). "v7" ở đây là **số thứ tự lane** (lane mở rộng thứ 7, sau v2..v6-expansion) — **không phải** version 7.0.0, vốn thuộc `v1-fix-bugs`. Contract chỉ được viết sau khi D53–D55 dưới đây được duyệt và ghi vào [DecisionLog.md](../DecisionLog.md).

## 1. Vấn đề

Một người làm web đi qua 16 câu (`CAL0 → S0-S8 → R1 → W1-W5`). Mỗi câu tốn **hai lượt gõ**: một lượt trả lời, một lượt xác nhận bản dịch ngược. Tổng ≈ **32 tin nhắn văn xuôi tự soạn**, chưa tính bước ack của câu có Critic-pass.

Cả 26 câu trong [script.yaml](../Content/interview-script/script.yaml) đều là free-text, **kể cả câu thuần chọn lựa**: `S7` chọn 1 trong 4 hình-hài, `CAL0` chọn deep/fast, `W1` SEO hay không, `M1` iOS/Android/cả hai, `C5` kênh phân phối. Field `default` là một chuỗi văn xuôi, không phải danh sách lựa chọn máy đọc được — nên adapter không có gì để render thành lựa chọn.

Điều này đánh thẳng vào đối tượng ở [D1](../DecisionLog.md) (người **không biết viết doc**): free-text là kiểu input khó nhất với đúng nhóm người mà sản phẩm nhắm tới.

## 2. Mục tiêu

Gom trọn vòng `hỏi → trả lời → dịch ngược → xác nhận` của **một** câu vào **một lượt gõ**, với nội dung thật đi vào bằng thao tác chọn:

- Agent bắn thẻ câu hỏi (2–4 lựa chọn có khuyến nghị, mỗi lựa chọn có mô tả ngắn, luôn kèm ô tự nhập).
- Người dùng chọn.
- Agent dịch ngược bằng thẻ thứ hai (`Đúng rồi` / `Sửa lại` / `Giải thích thêm`).
- Agent `commit` bằng token đang cầm, rồi bắn luôn thẻ của câu kế tiếp và giữ câu trả lời cho tới lượt sau.

**Kết quả nhắm tới:** ~32 tin nhắn văn xuôi ⇒ ~16 tin nhắn kích hoạt ngắn + thao tác chọn. Gõ tay chỉ khi người dùng chủ động chọn ô tự nhập.

## 3. Quyết định cần khoá (đề xuất — CHƯA duyệt)

> **Sửa 2026-08-01:** V6 thực ra đề xuất **D49–D52** (không phải D49–D51 như bản trước giả định —
> V6-DetailedDesignPlan.md viết khi D47 còn là trần, nên tự đặt tên D48–D51; D48 đã bị `v1-fix-bugs`
> chiếm trước, nên V6 được đánh lại thành D49–D52). Lane này vì vậy bắt đầu từ **D53**. Không ghi vào
> DecisionLog.md cho tới khi có duyệt tường minh — nay đã duyệt, xem D53–D55 trong
> [DecisionLog.md](../DecisionLog.md).

| ID | Quyết định đề xuất | Lý do |
|---|---|---|
| **D53** | Kịch bản phỏng vấn được khai `options` **máy đọc được** cho từng câu. `options` là **dữ liệu Lõi** nằm trong `script.yaml`; *cách render* (thẻ tương tác hay liệt kê text) là việc của Adapter. | Giữ [D3](../DecisionLog.md)/[D5](../DecisionLog.md) "lõi béo, adapter gầy" khi thêm một bề mặt tương tác mà chỉ Claude Code có. Nếu để adapter tự chế lựa chọn thì mỗi harness sẽ hỏi một kiểu — vi phạm [Contract.md](../Core/Contract.md). |
| **D54** | Một lượt người thật vẫn = đúng **một** `commit`. Thẻ tương tác chỉ đổi *cách thu* câu trả lời, **không** đổi mô hình uỷ quyền: capability token ([turnCapability.ts](../../src/core/turnCapability.ts)) và `checkRate` ([advanceState.ts:174](../../src/core/advanceState.ts:174)) giữ nguyên. | Đây là lớp chống "agent tự trả lời thay rồi commit hàng loạt". Gom nhiều câu vào một lượt là một lane riêng (§7), không được lén gộp vào đây. |
| **D55** | Mọi câu có `options` **bắt buộc** còn đường tự nhập. `options` **không thay thế** `default`: giá trị `default` phải xuất hiện như một lựa chọn mang nhãn khuyến nghị. | [D2](../DecisionLog.md) là phỏng vấn, không phải form. Ép người dùng chọn trong 4 ô sẽ bóp méo câu trả lời và sinh doc sai — thà để họ gõ còn hơn nhận một lựa chọn gần đúng. |

## 4. Hai loại câu — khác nhau về bản chất

| Loại | Câu | Nguồn lựa chọn |
|---|---|---|
| **Chọn tĩnh** | `CAL0`, `S7`, `W1`, `W2`, `W3`, `W4`, `M1`, `M2`, `M4`, `M5`, `C1`, `C2`, `C4`, `C5` | Viết cứng trong `script.yaml`. Không phụ thuộc câu trước. |
| **Mở, có gợi ý** | `S1`, `S2`, `S3`, `S4`, `S5` | **Không** viết cứng được — lựa chọn phải suy ra từ câu trả lời trước tại runtime. `script.yaml` chỉ khai `option_hints`: chỉ dẫn cho agent cách tổng hợp 2–3 gợi ý từ các câu đã chốt. |

Nhầm hai loại này là rủi ro thiết kế lớn nhất: nếu viết cứng lựa chọn cho `S3` (scope), mọi dự án sẽ nhận cùng một danh sách Must — đúng thứ [D2](../DecisionLog.md) cấm.

`S7` vừa khít giới hạn 4 lựa chọn của bề mặt Claude Code (web / mobile / hybrid / cli) + ô tự nhập.

## 5. Batch và phụ thuộc

| Batch | Tầng | Kết quả |
|---|---|---|
| **R-spike** | QA | Xác định thực nghiệm: trả lời thẻ tương tác **có** làm `UserPromptSubmit` bắn không. Cài hook log vào workspace trống, gọi thẻ, đọc log. Chặn B22c. |
| **B22a** | Nội dung | `options` cho 14 câu chọn tĩnh + `option_hints` cho 5 câu mở, trong `script.yaml` và các file markdown song sinh (`S0-S6-core.md`, `W-web.md`, `M-mobile.md`, `C-cli.md`). |
| **B22b** | Lõi | Mở rộng schema [interview-script.md](../Core/Schemas/interview-script.md) + validation trong `loadScript`. Schema `2.0.0 → 2.1.0`, tương thích ngược: thiếu `options` = câu free-text như cũ. |
| **B22c** | Adapter (Claude) | `render-inject.ts` đưa `options` vào ngữ cảnh inject; [SKILL.md](../../adapter/claude-code/skill/SKILL.md) viết lại nhịp lượt: thẻ hỏi → thẻ dịch ngược → commit → thẻ câu kế. Thêm thẻ ack cho câu có Critic-pass. |
| **B22d** | Adapter (degradation) | Codex plugin + [AGENTS.md](../../.agents/AGENTS.md) render `options` thành liệt kê text cùng nội dung. Thêm dòng capability `interactive_choice` vào [ConformanceMatrix.md](../Adapters/ConformanceMatrix.md). |
| **B22e** | QA | Test: mọi câu có `options` phải có 2–4 mục, mỗi mục có mô tả, `default` phải nằm trong danh sách, và luôn còn đường tự nhập. Cập nhật golden transcript cho khớp nhịp lượt mới. |

Thứ tự bắt buộc:

    R-spike ─────────────┐
    B22a ─ B22b ─────────┼─ B22c ─ B22d ─ B22e

## 6. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Người mới chọn bừa lựa chọn đầu tiên thay vì nghĩ | Cao | Lựa chọn khuyến nghị **không** đặt mặc định sẵn; mô tả từng lựa chọn nêu rõ đánh đổi, không chỉ nêu tên. |
| `option_hints` khiến agent tự chế lựa chọn lệch với câu trả lời trước | TB | B22e kiểm gợi ý phải trích được từ answers đã commit; giữ nguyên `translate_back` + `warning_rules` làm lưới chặn. |
| Thẻ tương tác chỉ Claude Code có → hai harness lệch trải nghiệm | TB | D53 giữ dữ liệu ở Lõi; ConformanceMatrix công bố đúng mức, không hứa đồng đều — theo [D37](../DecisionLog.md). |
| Nhịp "giữ câu trả lời qua lượt" phụ thuộc model nhớ đúng | TB | Nếu R-spike cho thấy `UserPromptSubmit` **có** bắn khi trả lời thẻ, bỏ hẳn cơ chế giữ; commit ngay trong lượt. |
| Lane chen hàng trước việc gỡ block 7.0.0 | Cao | Không mở lane cho tới khi toàn bộ điều kiện trong [v7-release-note.md](v7-release-note.md) §0 đóng. |

## 7. Out of scope

- **Gom nhiều câu vào một lượt.** Cần cho token mang *danh sách* `question_ids` và nới `checkRate` đúng bằng số câu trong batch — đụng thẳng mô hình uỷ quyền, phải có security review riêng. Lane khác.
- Đổi nội dung câu hỏi, thứ tự câu, hay `translate_back`. Lane này chỉ đổi *cách thu* câu trả lời.
- Sửa lỗ hổng newline bypass ([R08](../ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md)) và đường `amend` chết ([cliOperations.ts:131](../../src/adapters/shared/cliOperations.ts:131)). Hai việc độc lập, mức độ nặng hơn, nhưng không phải lane này.

## 8. Definition of Done

- Một người mới đi hết nhánh web mà chỉ phải tự soạn văn xuôi ở các câu mở (`S0`–`S5`), còn lại là chọn.
- `script.yaml` và bốn file markdown song sinh khớp nhau, có test chặn lệch.
- Codex và AGENTS.md nhận **cùng** bộ lựa chọn dưới dạng text; ConformanceMatrix công bố đúng mức enforcement từng harness.
- Số lượt gõ của golden transcript web giảm có đo được, ghi vào báo cáo — không claim bằng cảm nhận.
