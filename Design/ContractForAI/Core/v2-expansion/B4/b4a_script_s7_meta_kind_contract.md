# Contract — B4a `script.yaml`: thêm `kind`, câu meta-calibrate, tách S7, gọn S6

> **Tầng:** Nội dung. Nguồn: [V2-ExpansionPlan B4](../../../../RoadMap/V2-ExpansionPlan.md) + [interview-script.md](../../../../Core/Schemas/interview-script.md) (B2) + [script.yaml](../../../../Content/interview-script/script.yaml) + [S0-S6-core.md](../../../../Content/interview-script/S0-S6-core.md) + DecisionLog D22/D23. Phụ thuộc: [B5a](../B5/b5a_shapes_registry_schema_loader_contract.md) `DONE` (validator đã chấp nhận `kind`/branch mở).

## 1. Micro-task target
Sửa khung lõi trong `script.yaml` + `S0-S6-core.md`: (a) thêm field `kind` cho mọi câu (cũ = `anchored`); (b) thêm **câu meta-calibrate** đầu phiên (`kind=meta`, không neo doc); (c) **tách câu chọn hình-hài `S7`** (`branch: core`, set branch); (d) **gọn S6** — bỏ vế "web hay app" (đã chuyển sang S7). Bump `script.yaml` version → `2.0.0`.

## 2. Scope
**In scope:**
- Thêm `kind: anchored` cho toàn bộ câu hiện có (giữ nguyên nghĩa).
- Câu meta-calibrate `CAL0`: `kind: meta`, `branch: core`, `target_doc: null`, `gate: null`, `depends_on: []`, đứng **đầu**; nội dung set chế độ "giải thích kỹ vs đi nhanh". Câu trả lời map sang `progress.calibrate_mode = deep|fast` (skill set, [B6a](../B6/b6a_skill_critic_calibrate_wiring_contract.md)); field đã khoá ở state-schema/[B5a](../B5/b5a_shapes_registry_schema_loader_contract.md).
- Câu `S7`: `branch: core`, `kind: anchored`, `target_doc: 06-constraints.md`, `depends_on: [S6]`; hỏi "web / app / công cụ dòng lệnh / …" → set `branch`.
- Sửa `ask`/`translate_back` của **S6**: bỏ "web hay app", chỉ còn team/deadline/budget.
- Cập nhật `depends_on` câu nhánh web/mobile: `[S6]` → `[S7]`.

**Out of scope**
- KHÔNG thêm bộ câu `cli` (B4b) — chỉ tạo *khung* S7 chọn được shape.
- KHÔNG đổi placeholder keys mà [emit.ts](../../../../../src/core/emit.ts) đang map (vỡ emit).
- KHÔNG viết nội dung critic (B4c).

## 3. Checklist
- [ ] Mọi câu có `kind`; câu cũ = `anchored`, nghĩa không đổi.
- [ ] `CAL0` meta đứng đầu, `target_doc: null`, không gate.
- [ ] `S7` set branch, `depends_on: [S6]`; câu nhánh web/mobile `depends_on: [S7]`.
- [ ] S6 đã bỏ vế chọn nhánh; `translate_back` S6 không còn web/mobile.
- [ ] `version: 2.0.0`; placeholder keys **không đổi**.
- [ ] `Content/interview-script/README.md` cập nhật CAL0/S7/đa-shape; bảng S6 bỏ "web hay app".

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/interview-script/script.yaml` (thêm CAL0, S7; field kind; sửa S6; depends_on)
- `[MODIFY]` `Design/Content/interview-script/S0-S6-core.md` (bản người-đọc khớp: CAL0, S7, S6 gọn)
- `[MODIFY]` `Design/Content/interview-script/README.md` (bảng khung lõi: thêm CAL0, S7; bỏ "web hay app" ở S6; nêu đa hình-hài)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Đổi placeholder làm vỡ emit | Cao | Không đụng key; chỉ thêm câu + field. `npx vitest run emit` phải xanh sau B5b. |
| S6 trim làm đổi `06-constraints.md` golden | TB | Ghi rõ để [B5c](../B5/b5c_golden_cli_regression_contract.md) regen 06-constraints golden có kiểm soát. |
| meta CAL0 bị hook tính nhịp sai | TB | CAL0 vẫn là 1 bước answered (chịu rate-limit) — đúng spec; test ở B5/B6. |

## 6. Verification plan
- `npx vitest run loadScript contentIntegrity` — script.yaml 2.0.0 validate (kind/meta/S7 hợp lệ theo B5a).
- Review thủ công: S0-S6-core.md khớp script.yaml; S6 gọn; S7 rẽ nhánh rõ.
- `npm test` — golden có thể đỏ tạm ở `06-constraints` (nếu S6 đổi) → chuyển B5c xử lý; ghi rõ test nào đỏ.

## 7. Status
`WAITING_FOR_APPROVAL`
