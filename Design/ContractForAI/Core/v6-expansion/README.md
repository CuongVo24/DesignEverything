# Contracts — V6 Detailed Design (target 7.0.0)

> Nguồn: [V6-DetailedDesignPlan](V6-DetailedDesignPlan.md) (TaskBrief của lane, theo ngoại lệ expansion [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0), đề xuất D48–D51, và bộ chuẩn bị brownfield [prep-brownfield/](prep-brownfield/00-problem-statement.md).
> **Lane CHƯA mở.** Điều kiện mở ghi trong plan: ReleaseReadinessPlan đóng nợ (RB-05 e2e, RB-06b, RB-08) + pilot B18a xong + D48–D51 được duyệt vào DecisionLog.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| B19a | [tier2_taxonomy_lock](B19/b19a_tier2_taxonomy_lock_contract.md) | Nội dung | Gate mở lane | WAITING_FOR_APPROVAL |
| B19b | [deepening_interview_script](B19/b19b_deepening_interview_script_contract.md) | Nội dung | B19a | WAITING_FOR_APPROVAL |
| B20a | [deepen_state_and_gate](B20/b20a_deepen_state_and_gate_contract.md) | Lõi | B19b | WAITING_FOR_APPROVAL |
| B20b | [emit_tier2_render](B20/b20b_emit_tier2_render_contract.md) | Lõi | B20a | WAITING_FOR_APPROVAL |
| B21a | [adapter_deepen_workflow](B21/b21a_adapter_deepen_workflow_contract.md) | Adapter | B20b | WAITING_FOR_APPROVAL |
| B21b | [golden_corpus_eval](B21/b21b_golden_corpus_eval_contract.md) | QA | B21a | WAITING_FOR_APPROVAL |

Thứ tự bắt buộc: `B19a → B19b → B20a → B20b → B21a → B21b` — nội dung khoá trước lõi, lõi trước adapter.

## Kỷ luật lane

- **Opt-in tuyệt đối (D48):** người không gọi deepen không thấy gì thay đổi; golden test tầng 1 không đổi output.
- **Kênh riêng, không đụng tầng 1 (review 2026-07-19):** câu DS* ở `deepen-script.yaml` + commit qua `commitDeepenAnswer` riêng; KHÔNG sửa `script.yaml`/`gate-policy.yaml`, KHÔNG gate PreToolUse — enforcement là fail-closed trong core + CLI. Đơn vị answered là question-instance `{module, question_id, subject_id}` (mỗi Must / mỗi quyết định một bộ câu).
- **Module độc lập, fail-closed cục bộ (D49):** 4 module đóng cho 7.0.0 (`glossary`, `feature-spec`, `adr`, `test-strategy`); module mở dở dang chỉ chặn emit của chính nó.
- **Grounding bắt buộc (D50):** renderer đọc answers + docs tầng 1 đã emit; câu deepen chỉ bù phần thiếu; câu không truy được nguồn → gắn cờ, không bịa.
- **Golden corpus là thước (D51):** eval so bản sinh với cây `Design/` viết tay của DesignEverything; đây cũng là cổng vào brownfield.
- **Brownfield (phần b) KHÔNG có contract trong lane này** — chỉ có bộ chuẩn bị tại [prep-brownfield/](prep-brownfield/00-problem-statement.md); mở lane riêng khi đủ điều kiện ghi ở [03-risks-open-questions](prep-brownfield/03-risks-open-questions.md).
