# Contract — B5b `emit.ts`: file-map theo shape từ `shapes.yaml` + xử lý câu meta + branch mở

> **Tầng:** Lõi. Nguồn: [V2-ExpansionPlan B5](../../../../RoadMap/V2-ExpansionPlan.md) + [emit.ts](../../../../../src/core/emit.ts) + `shapes.yaml` (B5a) + template `07-distribution.md` (B4b). Phụ thuộc: [B5a](b5a_shapes_registry_schema_loader_contract.md) + [B4a](../B4/b4a_script_s7_meta_kind_contract.md) + [B4b](../B4/b4b_cli_shape_questions_template_contract.md) `DONE`.

## 1. Micro-task target
Cho `emitTree` chạy đa hình-hài: (a) `branch` nhận `<shape-id>` bất kỳ trong registry; (b) danh sách file `07-*` **đọc từ `shapes.yaml`** thay vì hằng số if/else; (c) map slot của shape `cli` (C1–C5 → `05-architecture.md`/`07-distribution.md`); (d) bỏ qua câu `kind=meta` khi emit (không sinh doc). Giữ web/mobile/hybrid y hệt output cũ.

## 2. Scope
**In scope:**
- `emitTree` signature: `branch: string` (validate ∈ registry) thay cho union; giữ tham số `options?.srcPrefix` (F-04) nguyên.
- Danh sách file: `const releaseDocs = shapes[branch].release_docs` từ `shapes.yaml`; ghép `[00..06, ...releaseDocs, README]`.
- filledSlots cho `cli`: map C1–C4 → slot `05-architecture.md`; C5 → slot `07-distribution.md` (khớp key template B4b).
- Câu `kind=meta`: không có placeholder doc → emit bỏ qua (không vào output, không anchor).
- `srcPrefix` mặc định cho shape mới: `cli` → `src/` (ghi rõ; override qua options như cũ).

**Out of scope**
- KHÔNG đổi output web/mobile/hybrid (phải khớp golden cũ).
- KHÔNG viết golden cli/test (B5c).
- KHÔNG wiring skill/critic (B6a).

## 3. Checklist
- [x] `emitTree(branch: string)` validate ∈ registry; branch lạ → lỗi rõ.
- [x] File-map đọc từ `shapes.yaml` (không hardcode if/else 07-*).
- [x] `cli` emit đúng cây: 00–06 + `07-distribution.md` + README, slot C1–C5 có nội dung.
- [x] Câu meta không sinh doc/anchor.
- [x] web/mobile/hybrid output **byte-khớp** hành vi cũ (golden xanh).

## 4. Interfaces / Files expected to change
- `[MODIFY]` `src/core/emit.ts` (branch string + file-map từ shapes + slot cli + skip meta)
- `[MODIFY]` `src/core/emit.test.ts` (ca cli emit + ca meta-skip; giữ ca web/mobile/hybrid)
- `[MODIFY]` `src/core/index.ts` nếu export đổi

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Refactor file-map làm lệch output web/mobile | Cao | Giữ thứ tự file y cũ cho web/mobile/hybrid; golden regression phải xanh. |
| Slot cli lệch key template | Cao | Đối chiếu key với `07-distribution.md` (B4b); test khẳng định slot có nội dung. |
| `srcPrefix` cli chưa map | TB | Mặc định `src/`; test 1 ca. |

## 6. Verification plan
- `npx vitest run emit` — cli + meta-skip + web/mobile/hybrid đều xanh.
- `npm run typecheck && npm run lint` — branch string nhất quán toàn repo.
- `npm test` — web/mobile/hybrid golden **không đỏ** vì behavior đổi (chỉ đỏ nếu B4a trim S6, xử lý ở B5c).

## 7. Status
`DONE`
