# Contracts — Interactive Question Cards (target 8.1.0)

> Nguồn: [InteractiveQuestionCardsPlan.md](../../../RoadMap/InteractiveQuestionCardsPlan.md) (TaskBrief
> của lane, theo ngoại lệ expansion [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0).
> Quyết định đã khoá: [D53–D55](../../../DecisionLog.md) (2026-08-01).
>
> **"v7" là số thứ tự lane mở rộng** (thứ 7, sau v2..v6-expansion) — **không phải** version 7.0.0.
> 7.0.0 thuộc `v1-fix-bugs` ([v7-release-note.md](../../../RoadMap/v7-release-note.md)); lane này
> nhắm **8.1.0**, MINOR trên nền `v6-expansion` (8.0.0), vì B22b tự khai tương thích ngược.
>
> **Lane CHƯA mở.** Hai điều kiện tiên quyết, không thương lượng:
> 1. Toàn bộ điều kiện gỡ block 7.0.0 ở `v7-release-note.md` §0 đóng và 7.0.0 được cắt.
> 2. `v6-expansion` (8.0.0) cắt trước — chủ repo đã chốt 2026-08-01: Interactive chạy **sau** V6.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| R-spike | [userpromptsubmit-probe](r-spike-userpromptsubmit-probe.md) | QA | Gate mở lane | WAITING_FOR_APPROVAL |
| B22a | [script_options_content](B22/b22a_script_options_content_contract.md) | Nội dung | Gate mở lane | WAITING_FOR_APPROVAL |
| B22b | [script_schema_options](B22/b22b_script_schema_options_contract.md) | Lõi | B22a | WAITING_FOR_APPROVAL |
| B22c | [claude_interactive_cards](B22/b22c_claude_interactive_cards_contract.md) | Adapter (Claude) | R-spike, B22b | WAITING_FOR_APPROVAL |
| B22d | [codex_text_degradation](B22/b22d_codex_text_degradation_contract.md) | Adapter (degradation) | B22b | WAITING_FOR_APPROVAL |
| B22e | [options_invariants_qa](B22/b22e_options_invariants_qa_contract.md) | QA | B22c, B22d | WAITING_FOR_APPROVAL |

Thứ tự bắt buộc:

```text
R-spike ─────────────┐
B22a ─ B22b ─────────┼─ B22c ─ B22d ─ B22e
```

R-spike và B22a không phụ thuộc nhau, chạy song song. B22c chặn bởi cả R-spike (kết quả xác định
có cần giữ câu trả lời qua lượt hay không) lẫn B22b (schema `options` phải tồn tại trước khi
render). B22d và B22e đều chờ B22c xong vì cả hai đọc lại nhịp lượt mà B22c khoá.

## Kỷ luật lane

- **Dữ liệu ở Lõi, render ở Adapter (D53).** `options`/`option_hints` nằm trong `script.yaml`
  (Nội dung) và schema `interview-script.md` (Lõi); B22c/B22d chỉ đọc, không tự chế lựa chọn.
- **Một lượt = một commit (D54).** Không đổi `turnCapability.ts` hay `checkRate`
  ([advanceState.ts:171](../../../../src/core/advanceState.ts)). Thẻ tương tác chỉ đổi cách thu câu
  trả lời của MỘT câu đang chờ, không gộp nhiều câu vào một lượt — đó là lane khác (§7 của plan).
- **Luôn còn đường tự nhập (D55).** `options` không thay thế `default`; mọi câu có `options` phải
  giữ được nhánh free-text, và `default` phải xuất hiện như một lựa chọn có nhãn khuyến nghị.
- **Hai loại câu khác bản chất.** Câu chọn tĩnh (`options` viết cứng trong `script.yaml`) và câu mở
  có gợi ý (`option_hints`, agent tổng hợp lựa chọn tại runtime từ answers đã commit) là hai cơ chế
  khác nhau — B22a phải tách rõ, không viết cứng lựa chọn cho câu thuộc nhóm `S1–S5`.
  Xem plan §4.
- **Tương thích ngược bắt buộc.** Schema `2.0.0 → 2.1.0`: câu thiếu `options`/`option_hints` vẫn là
  free-text như cũ — đây là lý do target chỉ là MINOR (8.1.0), không phải MAJOR.
