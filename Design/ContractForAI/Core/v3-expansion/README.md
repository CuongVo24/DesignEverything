# Contracts — V3 Execution Expansion (target 4.0.0)

> Nguồn: V3-ExecutionExpansionPlan, D29-D35, Contract Structure Rule. Lane này nối tiếp 3.0.0 build-plan; target phát hành là 4.0.0 vì thay đổi taxonomy, state và semantics gate.

## Vì sao có lane này
08-build-plan trả lời thứ tự milestone nhưng chưa đủ thông tin để một executor yếu hoặc người mới thực hiện an toàn. Các contract này buộc hệ thống chuyển từ docs tồn tại sang plan đã kiểm chứng, task nhỏ có phạm vi, evidence và evaluation thật.

## Bản đồ thực thi

| Batch | Contract | Phụ thuộc | Trạng thái |
|---|---|---|---|
| B7a | B7/b7a_semantic_plan_validator_contract.md | D29, D35 | WAITING_FOR_APPROVAL |
| B7b | B7/b7b_risk_discovery_execution_template_contract.md | B7a spec | WAITING_FOR_APPROVAL |
| B8a | B8/b8a_execution_state_evidence_gate_contract.md | B7a | WAITING_FOR_APPROVAL |
| B8b | B8/b8b_execution_plan_emitter_contract.md | B7a, B7b, B8a | WAITING_FOR_APPROVAL |
| B9a | B9/b9a_claude_build_orchestrator_contract.md | B8b | WAITING_FOR_APPROVAL |
| B9b | B9/b9b_rules_only_execution_protocol_contract.md | B8b | WAITING_FOR_APPROVAL |
| B10a | B10/b10a_newbie_journey_evaluation_contract.md | B9a, B9b | WAITING_FOR_APPROVAL |
| B10b | B10/b10b_v3_sync_release_contract.md | B10a | WAITING_FOR_APPROVAL |

## Kỷ luật quan trọng

- B7a khoá semantic contract trước khi B7b/B8 thay content, schema hay runtime.
- B8a phải hoàn tất trước B8b; emitter không tự phát minh state/evidence fields.
- B9 chỉ điều phối thông qua core CLI/state, không hardcode business logic vào adapter.
- B10a là bằng chứng sản phẩm; unit test xanh không đủ để claim newbie tự build được.
- Chưa contract nào ở lane này cho phép sửa source. Chỉ executor được giao một contract READY_TO_IMPLEMENT mới được chạm code.
