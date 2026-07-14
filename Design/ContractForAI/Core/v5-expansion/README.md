# Contracts — V5 Contract Synthesis (target 6.0.0)

> Nguồn: [V5-ContractSynthesisPlan](../../../RoadMap/V5-ContractSynthesisPlan.md), sketch [V5-B16b](../../../RoadMap/V5-B16b-sketch.md), D41–D47 và [Contract Structure Rule](../../CONTRACT_STRUCTURE_RULE.md). V5 chỉ được mở khi lane V4 (B15b) đã DONE và 5.0.0 phát hành.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| B16a | [contract_schema_and_conventions_bind](B16/b16a_contract_schema_and_conventions_bind_contract.md) | Lõi | B15b | WAITING_FOR_APPROVAL |
| B16b | [feature_contract_synthesis](B16/b16b_feature_contract_synthesis_contract.md) | Lõi | B16a | WAITING_FOR_APPROVAL |
| B17a | [review_break_task_state](B17/b17a_review_break_task_state_contract.md) | Lõi | B16b | WAITING_FOR_APPROVAL |
| B17b | [claude_codex_feature_workflow](B17/b17b_claude_codex_feature_workflow_contract.md) | Adapter | B17a | WAITING_FOR_APPROVAL |
| B18a | [feature_journey_evaluation](B18/b18a_feature_journey_evaluation_contract.md) | QA | B17b | WAITING_FOR_APPROVAL |
| B18b | [v6_sync_release](B18/b18b_v6_sync_release_contract.md) | QA/Process | B18a | WAITING_FOR_APPROVAL |

Thứ tự bắt buộc: `B16a → B16b → B17a → B17b → B18a → B18b`. Contract schema + Conventions bind (B16a) phải khoá trước synthesis (B16b) — đúng luật "no locked Core, no adapter code".

## Kỷ luật lane

- **Contract compile xuống TaskCard**, không đẻ cơ chế runtime mới: `interfaces[].path → allowed_paths`, `verification → commands`, `feature_milestone → milestone`. Gate/evidence V3 giữ nguyên.
- **Số hợp đồng theo quy mô (D42)**, không cố định; sizing từ Must × entity × flow-step, trần ~200 dòng/một tầng.
- **Chất lượng không dựa vào generator (D47)**: ba lưới — grounding docs khoá + bind Conventions + review/break-task.
- **Claim "build tới sản phẩm" khoá tới B18a**: chỉ mở sau pilot đi hết ≥1 feature Must thật trên nhiều quy mô (D47, mở rộng D40).
- **Codex vẫn soft-gate**: B17b công bố coverage trung thực, không hứa hard-enforce vòng feature dài.
