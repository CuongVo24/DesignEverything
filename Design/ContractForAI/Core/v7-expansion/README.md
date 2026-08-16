# Contracts — Interactive Question Cards (target 8.1.0)

> Nguồn: [InteractiveQuestionCardsPlan.md](../../../RoadMap/InteractiveQuestionCardsPlan.md) (TaskBrief
> của lane, theo ngoại lệ expansion [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0).
> Quyết định đã khoá: [D53–D55](../../../DecisionLog.md) (2026-08-01), [D58](../../../DecisionLog.md)
> (2026-08-16 — thẻ commit văn xuôi suy từ `label`/`description`, không commit `value` thô).
>
> **"v7" là số thứ tự lane mở rộng** (thứ 7, sau v2..v6-expansion) — **không phải** version 7.0.0.
> 7.0.0 thuộc `v1-fix-bugs` ([v7-release-note.md](../../../RoadMap/v7-release-note.md)); lane này
> nhắm **8.1.0**, MINOR trên nền `v6-expansion` (8.0.0), vì B22b tự khai tương thích ngược.
>
> **Lane MỞ (2026-08-10).** Hai điều kiện tiên quyết đã đóng đủ:
> 1. ✅ 7.0.0 cắt GA 2026-08-10 (xem `v7-release-note.md` §0, D56 cho điều kiện đóng thật —
>    24/24 contract on-axis, không phải tuyệt đối `VERIFIED`; gap công khai ở §5).
> 2. ✅ `v6-expansion` (8.0.0) cắt GA 2026-08-10 (xem `v6-expansion/README.md` §Đối chiếu —
>    6/6 contract DONE, đã cắt trước Interactive đúng thứ tự đã chốt 2026-08-01).
>
> **Đang thực thi (2026-08-16), nhánh `codex/lane-8-1-interactive-cards`.** Trạng thái
> `WAITING_FOR_APPROVAL` ở bảng dưới là trạng thái *governance ban đầu* của contract (chờ duyệt bắt
> tay code) — nay đã chuyển sang `IN_PROGRESS`, thực thi theo lộ trình 8 phase P0–P8 (P0 đóng ở
> commit `4fad0f6`, ổn định working tree). §7 từng contract sẽ ghi `DONE` kèm bằng chứng khi đóng
> đúng phase tương ứng (B22a=P3, B22b=P4, B22c=P5, B22d=P6, B22e=P7); R-spike đóng ở P2.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| R-spike | [userpromptsubmit-probe](r-spike-userpromptsubmit-probe.md) | QA | Gate mở lane | IN_PROGRESS (P2) |
| B22a | [script_options_content](B22/b22a_script_options_content_contract.md) | Nội dung | Gate mở lane | IN_PROGRESS (P3) |
| B22b | [script_schema_options](B22/b22b_script_schema_options_contract.md) | Lõi | B22a | IN_PROGRESS (P4) |
| B22c | [claude_interactive_cards](B22/b22c_claude_interactive_cards_contract.md) | Adapter (Claude) | R-spike, B22b | IN_PROGRESS (P5) |
| B22d | [codex_text_degradation](B22/b22d_codex_text_degradation_contract.md) | Adapter (degradation) | B22b | IN_PROGRESS (P6) |
| B22e | [options_invariants_qa](B22/b22e_options_invariants_qa_contract.md) | QA | B22c, B22d | IN_PROGRESS (P7) |

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
  ([advanceState.ts:174](../../../../src/core/advanceState.ts)). Thẻ tương tác chỉ đổi cách thu câu
  trả lời của MỘT câu đang chờ, không gộp nhiều câu vào một lượt — đó là lane khác (§7 của plan).
- **Luôn còn đường tự nhập (D55).** `options` không thay thế `default`; mọi câu có `options` phải
  giữ được nhánh free-text, và `default` phải xuất hiện như một lựa chọn có nhãn khuyến nghị.
- **Hai loại câu khác bản chất.** Câu chọn tĩnh (`options` viết cứng trong `script.yaml`) và câu mở
  có gợi ý (`option_hints`, agent tổng hợp lựa chọn tại runtime từ answers đã commit) là hai cơ chế
  khác nhau — B22a phải tách rõ, không viết cứng lựa chọn cho câu thuộc nhóm `S1–S5`.
  Xem plan §4.
- **Tương thích ngược bắt buộc.** Schema `2.0.0 → 2.1.0`: câu thiếu `options`/`option_hints` vẫn là
  free-text như cũ — đây là lý do target chỉ là MINOR (8.1.0), không phải MAJOR.
