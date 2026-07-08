# Contracts — v2 Expansion (B4–B6) · Đa hình-hài + Critic + Calibrate

> Nguồn: [V2-ExpansionPlan](../../../RoadMap/V2-ExpansionPlan.md) + spec đã khoá ở B1–B3 (DecisionLog D21–D26; interview-script/state schema; taxonomy registry; Contract/claude-code/agents-md critic). Tuân [CONTRACT_STRUCTURE_RULE](../CONTRACT_STRUCTURE_RULE.md).

## Vì sao có lane này
B1–B3 (quyết định + spec) đã khoá. Theo kỷ luật FB5: **spec khoá → viết contract → executor yếu code**. Đây là lane code thật cho mốc **MAJOR v2.0.0** — mỗi micro-task đủ 7 mục, sized cho executor yếu, signature/file/verify rõ để không tự chế.

## Khớp nối quan trọng (đọc trước khi sắp thứ tự)
1. **Code-schema trước content.** Thêm `kind`/`meta`/branch-mở vào `script.yaml` sẽ rớt validator zod hiện tại (đang ép `branch` enum + `target_doc` bắt buộc). Nên **B5a (zod + loader/validator) chạy TRƯỚC B4a (content)**.
2. **Registry cần file dữ liệu máy-đọc.** Runtime không parse markdown ([D15] tiền lệ gate-policy) → tạo `shapes.yaml` cạnh `script.yaml`, KHỚP 100% registry trong [taxonomy.md](../../../Content/taxonomy.md). Validator + emit đọc file này.
3. **web/mobile output KHÔNG đổi.** MAJOR đến từ *bề mặt hợp đồng/luồng* (thêm bước S7, branch mở, field `kind`) mà adapter phải xử lý — KHÔNG phải vì output web/mobile vỡ. Golden web/mobile phải **vẫn xanh** (chỉ regen nếu việc trim S6 làm đổi `06-constraints.md`, ghi rõ).

## Bản đồ batch → contract
| Batch | Tầng | Contract | Đơn vị |
|---|---|---|---|
| B5·a | Lõi | [b5a_shapes_registry_schema_loader](B5/b5a_shapes_registry_schema_loader_contract.md) | `shapes.yaml` + zod (branch mở, `kind`, target_doc điều kiện) + loader/validator |
| B4·a | Nội dung | [b4a_script_s7_meta_kind](B4/b4a_script_s7_meta_kind_contract.md) | `script.yaml`+S0-S6-core: thêm `kind`, câu meta-calibrate, tách S7, gọn S6 |
| B4·b | Nội dung | [b4b_cli_shape_questions_template](B4/b4b_cli_shape_questions_template_contract.md) | Bộ câu `cli` (C1–C5) + template `07-distribution.md` |
| B4·c | Nội dung | [b4c_critic_content_generalized_traps](B4/b4c_critic_content_generalized_traps_contract.md) | Nội dung critic 2 điểm fire + generalize cảnh báo "bẫy" theo shape |
| B5·b | Lõi | [b5b_emit_shape_map_meta](B5/b5b_emit_shape_map_meta_contract.md) | `emit.ts`: file-map theo shape từ `shapes.yaml` + xử lý câu meta + branch mở |
| B5·c | Lõi | [b5c_golden_cli_regression](B5/b5c_golden_cli_regression_contract.md) | Golden `cli` mới + giữ web/mobile xanh + test |
| B6·a | Adapter | [b6a_skill_critic_calibrate_wiring](B6/b6a_skill_critic_calibrate_wiring_contract.md) | Skill: critic-pass + calibrate-mode + inject S7 |
| B6·b | QA/Process | [b6b_qa_sweep_conformance_release](B6/b6b_qa_sweep_conformance_release_contract.md) | QA sweep + ConformanceMatrix + chốt Versioning 2.0.0 |

## Thứ tự chạy (có phụ thuộc)
```
B5a (schema/registry accept) ─► B4a (script) ─┬─► B4b (cli)  ─┐
                                              └─► B4c (critic)─┤
                                                              ├─► B5b (emit) ─► B5c (golden/test) ─► B6a (skill) ─► B6b (QA+release 2.0.0)
```
B5a **trước** B4a (để script.yaml mới validate). B4b/B4c song song sau B4a. B5b sau khi content đủ. B6b đóng mốc — bump 2.0.0 + ConformanceMatrix **cùng commit** (Versioning §3).

## Trạng thái lô
Cả 8 contract `WAITING_FOR_APPROVAL` — chờ manager duyệt. Executor chưa chạm code. Sau mỗi batch `DONE`, mở [break_task](../break_task/) nếu review lộ điểm chưa sạch.
