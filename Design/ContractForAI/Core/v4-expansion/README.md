# Contracts — V4 Newbie Expansion (target 5.0.0)

> Nguồn: [V4-NewbieExpansionPlan](../../../RoadMap/V4-NewbieExpansionPlan.md), D36–D40 và Contract Structure Rule. V4 chỉ được mở khi B11f đã DONE.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| B12a | [pre_action_gate_core](B12/b12a_pre_action_gate_core_contract.md) | Lõi | B11f | WAITING_FOR_APPROVAL |
| B12b | [codex_pre_tool_use_adapter](B12/b12b_codex_pre_tool_use_adapter_contract.md) | Adapter | B12a | WAITING_FOR_APPROVAL |
| B13a | [project_profile_doctor](B13/b13a_project_profile_doctor_contract.md) | Lõi | B11f | WAITING_FOR_APPROVAL |
| B13b | [stack_aware_plan_synthesis](B13/b13b_stack_aware_plan_synthesis_contract.md) | Lõi | B13a, B12a | WAITING_FOR_APPROVAL |
| B14a | [newbie_next_step_experience](B14/b14a_newbie_next_step_experience_contract.md) | Adapter | B12b, B13b | WAITING_FOR_APPROVAL |
| B14b | [controlled_amendment_recovery](B14/b14b_controlled_amendment_recovery_contract.md) | Lõi | B13b | WAITING_FOR_APPROVAL |
| B15a | [cross_runtime_replay_benchmark](B15/b15a_cross_runtime_replay_benchmark_contract.md) | QA | B12b, B13b, B14a, B14b | WAITING_FOR_APPROVAL |
| B15b | [pilot_claim_release_gate](B15/b15b_pilot_claim_release_gate_contract.md) | QA/Process | B15a | WAITING_FOR_APPROVAL |

## Kỷ luật Codex

- Contract B12b dùng tên chính xác `PreToolUse`, `PostToolUse` và `PermissionRequest` của Codex, không dùng tên suy đoán “ToolPreUse”.
- PreToolUse của Codex là hard deny **chỉ** trên tool paths mà runtime intercept; coverage ngoài Bash, `apply_patch` và MCP tool phải được gắn nhãn soft hoặc unsupported.
- Plugin/hook local phải qua trust review; không đặt cờ bypass trust trong installer, test hay quickstart.
