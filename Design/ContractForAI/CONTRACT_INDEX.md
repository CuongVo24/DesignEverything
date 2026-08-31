# CONTRACT INDEX — mọi hợp đồng của DesignEverything

> Bảng duy nhất liệt kê **toàn bộ** contract dưới [`Core/`](Core/), kèm trạng thái thật đọc từ
> chính mục `Status` của từng file. Luật viết contract nằm ở
> [CONTRACT_STRUCTURE_RULE.md](CONTRACT_STRUCTURE_RULE.md); cách thực thi một contract nằm ở
> [EXECUTOR_RUNBOOK.md](EXECUTOR_RUNBOOK.md); bản đồ lane (plan ↔ contract ↔ evidence ↔ version)
> nằm ở [../RoadMap/LANE_INDEX.md](../RoadMap/LANE_INDEX.md).

## Tại sao cần file này

Trước 2026-08-31 dự án có 129 contract rải trên 14 thư mục (nay 135 / 15 lane) mà **không có mục lục nào**. Hệ quả đã
xảy ra thật: `v6-expansion/README.md` treo header "Lane CHƯA mở" suốt gần một tháng trong khi cả 6
contract của nó đã tự ghi `DONE` từ 2026-07-21 — không ai đối chiếu được vì không có chỗ nào để đối
chiếu. File này là chỗ đó.

Bảng dưới **không được sửa tay lệch khỏi sự thật**: `scripts/check-docs.mjs` (chạy trong `npm test`)
đối chiếu từng dòng với mục `Status` trong chính file contract, và fail nếu thiếu dòng, thừa dòng,
hoặc lệch trạng thái.

## Hai bộ từ vựng trạng thái

| Bộ | Dùng ở đâu | Giá trị |
|---|---|---|
| Một token — [CONTRACT_STRUCTURE_RULE.md §5](CONTRACT_STRUCTURE_RULE.md) | mọi lane trừ `v1-fix-bugs` | `WAITING_FOR_APPROVAL` · `READY_TO_IMPLEMENT` · `IN_PROGRESS` · `DONE` · `BLOCKED` |
| Ba trục `Spec + Implementation + Proof` — D56 | riêng `v1-fix-bugs` | Spec: `DRAFT`/`WAITING_FOR_APPROVAL`/`APPROVED` · Impl: `NOT_STARTED`/`PARTIAL`/`IMPLEMENTED` · Proof: `MISSING`…`VERIFIED` (vocabulary do `scripts/check-matrix.mjs` giữ) |

Ba trục là **cố ý**, không phải lệch chuẩn: D56 hạ DoD của 7.0.0 xuống mức on-axis, nên trạng thái
của lane đó mang theo cả mức bằng chứng thay vì gộp thành một chữ `DONE` không nói lên điều gì.

## Tổng quan

| Trạng thái | Số contract |
|---|---|
| `DONE` | 83 |
| `WAITING_FOR_APPROVAL` | 26 (20 cũ + 6 của lane v9 vừa mở) |
| `APPROVED + IMPLEMENTED + UNIT_ONLY` | 15 |
| `APPROVED + IMPLEMENTED + SEAM_PARTIAL` | 9 |
| `IN_PROGRESS` | 2 |
| **Tổng** | **135** |

## Khi mở lane mới

Thêm dòng cho mọi contract của lane vào bảng dưới **cùng commit** với lúc tạo file contract, và thêm
một dòng lane vào [../RoadMap/LANE_INDEX.md](../RoadMap/LANE_INDEX.md). `check-docs.mjs` sẽ fail nếu
quên.

---

### `month1` — Month 1 — engine lõi + adapter Claude Code đầu tiên

| Nhóm | Contract | Status |
|---|---|---|
| W1 | [w1a_scaffold_repo_tooling](Core/month1/W1/w1a_scaffold_repo_tooling_contract.md) | `DONE` |
| W1 | [w1b_mvp_scope_lock](Core/month1/W1/w1b_mvp_scope_lock_contract.md) | `DONE` |
| W1 | [w1c_golden_web_fixture](Core/month1/W1/w1c_golden_web_fixture_contract.md) | `DONE` |
| W1 | [w1d_test_fixtures_layout](Core/month1/W1/w1d_test_fixtures_layout_contract.md) | `DONE` |
| W2 | [w2a_zod_schemas](Core/month1/W2/w2a_zod_schemas_contract.md) | `DONE` |
| W2 | [w2b_loaders](Core/month1/W2/w2b_loaders_contract.md) | `DONE` |
| W2 | [w2c_advance_state](Core/month1/W2/w2c_advance_state_contract.md) | `DONE` |
| W2 | [w2d_evaluate_gate](Core/month1/W2/w2d_evaluate_gate_contract.md) | `DONE` |
| W2 | [w2e_unit_tests](Core/month1/W2/w2e_unit_tests_contract.md) | `DONE` |
| W3 | [w3a_session_start_hook](Core/month1/W3/w3a_session_start_hook_contract.md) | `DONE` |
| W3 | [w3b_user_prompt_submit_hook](Core/month1/W3/w3b_user_prompt_submit_hook_contract.md) | `DONE` |
| W3 | [w3c_pre_tool_use_hook](Core/month1/W3/w3c_pre_tool_use_hook_contract.md) | `DONE` |
| W3 | [w3d_skill_inject](Core/month1/W3/w3d_skill_inject_contract.md) | `DONE` |
| W4 | [w4a_emit_docs](Core/month1/W4/w4a_emit_docs_contract.md) | `DONE` |
| W4 | [w4b_e2e_web_run](Core/month1/W4/w4b_e2e_web_run_contract.md) | `DONE` |
| W4 | [w4c_edge_cases_runbook](Core/month1/W4/w4c_edge_cases_runbook_contract.md) | `DONE` |

### `month2` — Month 2 — nhánh mobile + AGENTS.md + hardening

| Nhóm | Contract | Status |
|---|---|---|
| W5 | [w5a_mobile_warnings_content](Core/month2/W5/w5a_mobile_warnings_content_contract.md) | `DONE` |
| W5 | [w5b_mobile_e2e_regression](Core/month2/W5/w5b_mobile_e2e_regression_contract.md) | `DONE` |
| W6 | [w6a_agents_md_generator](Core/month2/W6/w6a_agents_md_generator_contract.md) | `DONE` |
| W6 | [w6b_soft_gate_conformance](Core/month2/W6/w6b_soft_gate_conformance_contract.md) | `WAITING_FOR_APPROVAL` |
| W7 | [w7a_template_polish_golden_sync](Core/month2/W7/w7a_template_polish_golden_sync_contract.md) | `DONE` |
| W8 | [w8a_edge_case_hardening](Core/month2/W8/w8a_edge_case_hardening_contract.md) | `DONE` |
| W8 | [w8b_dual_golden_regression_v1_release](Core/month2/W8/w8b_dual_golden_regression_v1_release_contract.md) | `DONE` |

### `month3` — Month 3 — dogfood & nội dung

| Nhóm | Contract | Status |
|---|---|---|
| W10 | [w10a_multiproject_measurement_runs](Core/month3/W10/w10a_multiproject_measurement_runs_contract.md) | `DONE` |
| W10 | [w10b_measurement_report_painrank](Core/month3/W10/w10b_measurement_report_painrank_contract.md) | `DONE` |
| W11 | [w11a_content_iteration_s3_defaults](Core/month3/W11/w11a_content_iteration_s3_defaults_contract.md) | `DONE` |
| W11 | [w11b_golden_sync_decisionlog_smoke](Core/month3/W11/w11b_golden_sync_decisionlog_smoke_contract.md) | `DONE` |
| W12 | [w12a_taxonomy_decision_assessment](Core/month3/W12/w12a_taxonomy_decision_assessment_contract.md) | `DONE` |
| W12 | [w12b_taxonomy_expansion_or_defer](Core/month3/W12/w12b_taxonomy_expansion_or_defer_contract.md) | `DONE` |
| W9 | [w9a_dogfood_run_friction_log](Core/month3/W9/w9a_dogfood_run_friction_log_contract.md) | `DONE` |
| W9 | [w9b_findings_backlog_classification](Core/month3/W9/w9b_findings_backlog_classification_contract.md) | `DONE` |

### `month4` — Month 4 — validation ngoài + drift flagging

| Nhóm | Contract | Status |
|---|---|---|
| W13 | [w13a_carryover_anchor_prefix_flex](Core/month4/W13/w13a_carryover_anchor_prefix_flex_contract.md) | `DONE` |
| W13 | [w13b_carryover_hybrid_release_deploy](Core/month4/W13/w13b_carryover_hybrid_release_deploy_contract.md) | `DONE` |
| W13 | [w13c_carryover_traceability_closure](Core/month4/W13/w13c_carryover_traceability_closure_contract.md) | `DONE` |
| W13 | [w13d_readme_onboarding_packaging](Core/month4/W13/w13d_readme_onboarding_packaging_contract.md) | `DONE` |
| W14 | [w14a_external_validation_real_diff](Core/month4/W14/w14a_external_validation_real_diff_contract.md) | `WAITING_FOR_APPROVAL` |
| W14 | [w14b_competitor_positioning_landing](Core/month4/W14/w14b_competitor_positioning_landing_contract.md) | `WAITING_FOR_APPROVAL` |
| W15 | [w15a_drift_anchor_resolver](Core/month4/W15/w15a_drift_anchor_resolver_contract.md) | `WAITING_FOR_APPROVAL` |
| W15 | [w15b_drift_compare_report_cli](Core/month4/W15/w15b_drift_compare_report_cli_contract.md) | `WAITING_FOR_APPROVAL` |
| W16 | [w16a_sixteen_week_summary_decision](Core/month4/W16/w16a_sixteen_week_summary_decision_contract.md) | `WAITING_FOR_APPROVAL` |

### `break_task` — Break task — fix/polish sau vòng review

| Nhóm | Contract | Status |
|---|---|---|
| Month1 | [m1_fix_state_reconcile_after_emit](Core/break_task/Month1/m1_fix_state_reconcile_after_emit_contract.md) | `WAITING_FOR_APPROVAL` |
| Month1 | [m1_polish_bash_whitelist_hardening](Core/break_task/Month1/m1_polish_bash_whitelist_hardening_contract.md) | `WAITING_FOR_APPROVAL` |
| Month2 | [m2_fix_conformance_matrix_drift](Core/break_task/Month2/m2_fix_conformance_matrix_drift_contract.md) | `DONE` |
| Month2 | [m2_fix_mobile_warnings_regression](Core/break_task/Month2/m2_fix_mobile_warnings_regression_contract.md) | `DONE` |
| Month2 | [m2_polish_agents_md_artifact_drift_guard](Core/break_task/Month2/m2_polish_agents_md_artifact_drift_guard_contract.md) | `DONE` |
| v3-expansion/B11 | [b11a_canonical_runtime_plan_validator](Core/break_task/v3-expansion/B11/b11a_canonical_runtime_plan_validator_contract.md) | `DONE` |
| v3-expansion/B11 | [b11b_verified_evidence_runner](Core/break_task/v3-expansion/B11/b11b_verified_evidence_runner_contract.md) | `DONE` |
| v3-expansion/B11 | [b11c_fail_closed_execution_state](Core/break_task/v3-expansion/B11/b11c_fail_closed_execution_state_contract.md) | `WAITING_FOR_APPROVAL` |
| v3-expansion/B11 | [b11d_emitted_plan_executability](Core/break_task/v3-expansion/B11/b11d_emitted_plan_executability_contract.md) | `WAITING_FOR_APPROVAL` |
| v3-expansion/B11 | [b11e_claude_guard_bypass_closure](Core/break_task/v3-expansion/B11/b11e_claude_guard_bypass_closure_contract.md) | `WAITING_FOR_APPROVAL` |
| v3-expansion/B11 | [b11f_v3_audit_release_truthfulness](Core/break_task/v3-expansion/B11/b11f_v3_audit_release_truthfulness_contract.md) | `WAITING_FOR_APPROVAL` |

### `v1-fix-bugs` — v1-fix-bugs — Release Truth Sync (7.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B1 | [b1a_interview_turn_capability](Core/v1-fix-bugs/B1/b1a_interview_turn_capability_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B1 | [b1b_atomic_interview_persistence](Core/v1-fix-bugs/B1/b1b_atomic_interview_persistence_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B1 | [b1c_design_build_handoff_state](Core/v1-fix-bugs/B1/b1c_design_build_handoff_state_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B1 | [b1d_blocked_reason_transition](Core/v1-fix-bugs/B1/b1d_blocked_reason_transition_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B2 | [b2a_protected_artifact_policy](Core/v1-fix-bugs/B2/b2a_protected_artifact_policy_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B2 | [b2b_shell_command_classifier](Core/v1-fix-bugs/B2/b2b_shell_command_classifier_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B2 | [b2c_canonical_path_matcher](Core/v1-fix-bugs/B2/b2c_canonical_path_matcher_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B2 | [b2d_gate_evidence_recompute](Core/v1-fix-bugs/B2/b2d_gate_evidence_recompute_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B2 | [b2e_runtime_health_recovery](Core/v1-fix-bugs/B2/b2e_runtime_health_recovery_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B3 | [b3a_answer_slot_validation](Core/v1-fix-bugs/B3/b3a_answer_slot_validation_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B3 | [b3b_derived_content_provenance_quality](Core/v1-fix-bugs/B3/b3b_derived_content_provenance_quality_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B3 | [b3c_authoritative_artifact_catalog](Core/v1-fix-bugs/B3/b3c_authoritative_artifact_catalog_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B3 | [b3d_transactional_emit_manifest](Core/v1-fix-bugs/B3/b3d_transactional_emit_manifest_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B3 | [b3e_deepen_lifecycle](Core/v1-fix-bugs/B3/b3e_deepen_lifecycle_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B4 | [b4a_claude_hook_policy_integration](Core/v1-fix-bugs/B4/b4a_claude_hook_policy_integration_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B4 | [b4b_exact_wrapper_invocation](Core/v1-fix-bugs/B4/b4b_exact_wrapper_invocation_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B4 | [b4c_cli_exit_output_health](Core/v1-fix-bugs/B4/b4c_cli_exit_output_health_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B4 | [b4d_self_contained_installer_integrity](Core/v1-fix-bugs/B4/b4d_self_contained_installer_integrity_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B4 | [b4e_codex_parity_shared_runtime](Core/v1-fix-bugs/B4/b4e_codex_parity_shared_runtime_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B4 | [b4f_skill_handoff_truth](Core/v1-fix-bugs/B4/b4f_skill_handoff_truth_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B5 | [b5a_adversarial_installed_runtime_integration](Core/v1-fix-bugs/B5/b5a_adversarial_installed_runtime_integration_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B5 | [b5b_transaction_fault_injection](Core/v1-fix-bugs/B5/b5b_transaction_fault_injection_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |
| B5 | [b5c_newbie_journey_quality_evaluation](Core/v1-fix-bugs/B5/b5c_newbie_journey_quality_evaluation_contract.md) | `APPROVED + IMPLEMENTED + UNIT_ONLY` |
| B5 | [b5d_docs_version_release_truth_sync](Core/v1-fix-bugs/B5/b5d_docs_version_release_truth_sync_contract.md) | `APPROVED + IMPLEMENTED + SEAM_PARTIAL` |

### `v2-expansion` — v2-expansion — đa hình-hài dự án (2.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B4 | [b4a_script_s7_meta_kind](Core/v2-expansion/B4/b4a_script_s7_meta_kind_contract.md) | `DONE` |
| B4 | [b4b_cli_shape_questions_template](Core/v2-expansion/B4/b4b_cli_shape_questions_template_contract.md) | `DONE` |
| B4 | [b4c_critic_content_generalized_traps](Core/v2-expansion/B4/b4c_critic_content_generalized_traps_contract.md) | `DONE` |
| B5 | [b5a_shapes_registry_schema_loader](Core/v2-expansion/B5/b5a_shapes_registry_schema_loader_contract.md) | `DONE` |
| B5 | [b5b_emit_shape_map_meta](Core/v2-expansion/B5/b5b_emit_shape_map_meta_contract.md) | `DONE` |
| B5 | [b5c_golden_cli_regression](Core/v2-expansion/B5/b5c_golden_cli_regression_contract.md) | `DONE` |
| B6 | [b6a_skill_critic_calibrate_wiring](Core/v2-expansion/B6/b6a_skill_critic_calibrate_wiring_contract.md) | `DONE` |
| B6 | [b6b_qa_sweep_conformance_release](Core/v2-expansion/B6/b6b_qa_sweep_conformance_release_contract.md) | `DONE` |

### `v3-expansion` — v3-expansion — execution plan + evidence (4.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B10 | [b10a_newbie_journey_evaluation](Core/v3-expansion/B10/b10a_newbie_journey_evaluation_contract.md) | `DONE` |
| B10 | [b10b_v3_sync_release](Core/v3-expansion/B10/b10b_v3_sync_release_contract.md) | `DONE` |
| B7 | [b7a_semantic_plan_validator](Core/v3-expansion/B7/b7a_semantic_plan_validator_contract.md) | `DONE` |
| B7 | [b7b_risk_discovery_execution_template](Core/v3-expansion/B7/b7b_risk_discovery_execution_template_contract.md) | `DONE` |
| B8 | [b8a_execution_state_evidence_gate](Core/v3-expansion/B8/b8a_execution_state_evidence_gate_contract.md) | `DONE` |
| B8 | [b8b_execution_plan_emitter](Core/v3-expansion/B8/b8b_execution_plan_emitter_contract.md) | `DONE` |
| B9 | [b9a_claude_build_orchestrator](Core/v3-expansion/B9/b9a_claude_build_orchestrator_contract.md) | `DONE` |
| B9 | [b9b_rules_only_execution_protocol](Core/v3-expansion/B9/b9b_rules_only_execution_protocol_contract.md) | `DONE` |

### `v4-expansion` — v4-expansion — newbie journey (5.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B12 | [b12a_pre_action_gate_core](Core/v4-expansion/B12/b12a_pre_action_gate_core_contract.md) | `WAITING_FOR_APPROVAL` |
| B12 | [b12b_codex_pre_tool_use_adapter](Core/v4-expansion/B12/b12b_codex_pre_tool_use_adapter_contract.md) | `WAITING_FOR_APPROVAL` |
| B13 | [b13a_project_profile_doctor](Core/v4-expansion/B13/b13a_project_profile_doctor_contract.md) | `WAITING_FOR_APPROVAL` |
| B13 | [b13b_stack_aware_plan_synthesis](Core/v4-expansion/B13/b13b_stack_aware_plan_synthesis_contract.md) | `WAITING_FOR_APPROVAL` |
| B14 | [b14a_newbie_next_step_experience](Core/v4-expansion/B14/b14a_newbie_next_step_experience_contract.md) | `WAITING_FOR_APPROVAL` |
| B14 | [b14b_controlled_amendment_recovery](Core/v4-expansion/B14/b14b_controlled_amendment_recovery_contract.md) | `WAITING_FOR_APPROVAL` |
| B15 | [b15a_cross_runtime_replay_benchmark](Core/v4-expansion/B15/b15a_cross_runtime_replay_benchmark_contract.md) | `WAITING_FOR_APPROVAL` |
| B15 | [b15b_pilot_claim_release_gate](Core/v4-expansion/B15/b15b_pilot_claim_release_gate_contract.md) | `WAITING_FOR_APPROVAL` |

### `v5-expansion` — v5-expansion — contract synthesis (6.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B16 | [b16a_contract_schema_and_conventions_bind](Core/v5-expansion/B16/b16a_contract_schema_and_conventions_bind_contract.md) | `DONE` |
| B16 | [b16b_feature_contract_synthesis](Core/v5-expansion/B16/b16b_feature_contract_synthesis_contract.md) | `DONE` |
| B17 | [b17a_review_break_task_state](Core/v5-expansion/B17/b17a_review_break_task_state_contract.md) | `DONE` |
| B17 | [b17b_claude_codex_feature_workflow](Core/v5-expansion/B17/b17b_claude_codex_feature_workflow_contract.md) | `DONE` |
| B18 | [b18a_feature_journey_evaluation](Core/v5-expansion/B18/b18a_feature_journey_evaluation_contract.md) | `IN_PROGRESS` |
| B18 | [b18b_v6_sync_release](Core/v5-expansion/B18/b18b_v6_sync_release_contract.md) | `IN_PROGRESS` |

### `v6-expansion` — v6-expansion — deepening tier-2 (8.0.0)

| Nhóm | Contract | Status |
|---|---|---|
| B19 | [b19a_tier2_taxonomy_lock](Core/v6-expansion/B19/b19a_tier2_taxonomy_lock_contract.md) | `DONE` |
| B19 | [b19b_deepening_interview_script](Core/v6-expansion/B19/b19b_deepening_interview_script_contract.md) | `DONE` |
| B20 | [b20a_deepen_state_and_gate](Core/v6-expansion/B20/b20a_deepen_state_and_gate_contract.md) | `DONE` |
| B20 | [b20b_emit_tier2_render](Core/v6-expansion/B20/b20b_emit_tier2_render_contract.md) | `DONE` |
| B21 | [b21a_adapter_deepen_workflow](Core/v6-expansion/B21/b21a_adapter_deepen_workflow_contract.md) | `DONE` |
| B21 | [b21b_golden_corpus_eval](Core/v6-expansion/B21/b21b_golden_corpus_eval_contract.md) | `DONE` |

### `v7-expansion` — v7-expansion — interactive question cards (8.1.0)

| Nhóm | Contract | Status |
|---|---|---|
| B22 | [b22a_script_options_content](Core/v7-expansion/B22/b22a_script_options_content_contract.md) | `DONE` |
| B22 | [b22b_script_schema_options](Core/v7-expansion/B22/b22b_script_schema_options_contract.md) | `DONE` |
| B22 | [b22c_claude_interactive_cards](Core/v7-expansion/B22/b22c_claude_interactive_cards_contract.md) | `DONE` |
| B22 | [b22d_codex_text_degradation](Core/v7-expansion/B22/b22d_codex_text_degradation_contract.md) | `DONE` |
| B22 | [b22e_options_invariants_qa](Core/v7-expansion/B22/b22e_options_invariants_qa_contract.md) | `DONE` |

### `v8-hotfix` — v8-hotfix — H1–H6 (ra dưới 9.0.0, D68)

| Nhóm | Contract | Status |
|---|---|---|
| — | [h1_bootstrap_deadlock](Core/v8-hotfix/h1_bootstrap_deadlock_contract.md) | `DONE` |
| — | [h2_slots_file_gate_alignment](Core/v8-hotfix/h2_slots_file_gate_alignment_contract.md) | `DONE` |
| — | [h3_powershell_gate_coverage](Core/v8-hotfix/h3_powershell_gate_coverage_contract.md) | `DONE` |
| — | [h4_status_question_card](Core/v8-hotfix/h4_status_question_card_contract.md) | `DONE` |
| — | [h5_hook_seam_integration_test](Core/v8-hotfix/h5_hook_seam_integration_test_contract.md) | `DONE` |
| — | [h6_gates_passed_and_ready_for_validation](Core/v8-hotfix/h6_gates_passed_and_ready_for_validation_contract.md) | `DONE` |

### `v8-expansion` — v8-expansion — interview cadence (ra dưới 9.0.0, D68)

| Nhóm | Contract | Status |
|---|---|---|
| B24 | [b24a_undo](Core/v8-expansion/B24/b24a_undo_contract.md) | `DONE` |
| B24 | [b24b_batch_capability](Core/v8-expansion/B24/b24b_batch_capability_contract.md) | `DONE` |
| B24 | [b24c1_multi_select_schema](Core/v8-expansion/B24/b24c1_multi_select_schema_contract.md) | `DONE` |
| B24 | [b24c2_multi_select_content](Core/v8-expansion/B24/b24c2_multi_select_content_contract.md) | `DONE` |
| B24 | [b24d_skill_cadence_rewrite](Core/v8-expansion/B24/b24d_skill_cadence_rewrite_contract.md) | `DONE` |
| B24 | [b24e_codex_degradation_sync](Core/v8-expansion/B24/b24e_codex_degradation_sync_contract.md) | `DONE` |
| B24 | [b24f_qa_invariants_and_turn_count](Core/v8-expansion/B24/b24f_qa_invariants_and_turn_count_contract.md) | `DONE` |

### `v9-expansion` — v9-expansion — doc depth (9.0.0, lane MỞ — 6/6 duyệt 2026-08-31)

| Nhóm | Contract | Status |
|---|---|---|
| B25 | [b25a_guideline_emitter](Core/v9-expansion/B25/b25a_guideline_emitter_contract.md) | `READY_TO_IMPLEMENT` |
| B25 | [b25b_contract_tree_emitter](Core/v9-expansion/B25/b25b_contract_tree_emitter_contract.md) | `READY_TO_IMPLEMENT` |
| B26 | [b26a_doc_checker_emitter](Core/v9-expansion/B26/b26a_doc_checker_emitter_contract.md) | `READY_TO_IMPLEMENT` |
| B26 | [b26b_modules_deepen_module](Core/v9-expansion/B26/b26b_modules_deepen_module_contract.md) | `READY_TO_IMPLEMENT` |
| B27 | [b27a_frontend_deepen_module](Core/v9-expansion/B27/b27a_frontend_deepen_module_contract.md) | `READY_TO_IMPLEMENT` |
| B27 | [b27b_v9_sync_release](Core/v9-expansion/B27/b27b_v9_sync_release_contract.md) | `READY_TO_IMPLEMENT` |

