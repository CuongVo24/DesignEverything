# Contract — B5a `shapes.yaml` registry + zod (branch mở, `kind`) + loader/validator

> **Tầng:** Lõi. Nguồn: [V2-ExpansionPlan B5](../../../../RoadMap/V2-ExpansionPlan.md) + [interview-script.md](../../../../Core/Schemas/interview-script.md) (đã khoá B2) + [taxonomy registry](../../../../Content/taxonomy.md) + [state-schema.md](../../../../Core/Schemas/state-schema.md) + tiền lệ [D15](../../../../DecisionLog.md). Phụ thuộc: B1–B3 `DONE`.

## 1. Micro-task target
Cho code **chấp nhận** hình dạng v2 trước khi content điền: (a) tạo `shapes.yaml` máy-đọc (registry hình-hài, khớp taxonomy.md); (b) sửa zod để `branch` là chuỗi shape hợp lệ theo registry, thêm field `kind`, cho `target_doc` null khi meta; (c) loader/validator đọc registry. **Chưa đổi hành vi emit** (B5b). Đây là bước "mở cửa schema" để `script.yaml` mới không rớt validate.

## 2. Scope
**In scope:**
- `[NEW]` `Design/Content/interview-script/shapes.yaml` (version 2.0.0): mỗi shape `{ id, branch_prefix, release_docs[] }` cho `web/mobile/hybrid/cli`, KHỚP 100% registry [taxonomy.md](../../../../Content/taxonomy.md).
- `src/core/schemas/interviewScript.ts`: `branch` từ enum → `string` (validate ∈ shapes registry ∪ `core`); thêm `kind: z.enum(['anchored','meta']).default('anchored')`; `target_doc` → `string.nullable()` với refine: `kind==='meta' ⇒ target_doc===null`, `kind==='anchored' ⇒ target_doc` là string. **Thêm top-level optional** `critics: z.record(z.object({ challenge: z.string().min(1), ack_prompt: z.string().min(1) })).optional()` — refine mọi key ∈ question ids.
- `src/core/schemas/state.ts`: `branch` từ enum → `string|null` (validate ∈ registry khi khác null); **thêm** `calibrate_mode: z.enum(['deep','fast']).nullable()`.
- `[NEW]` `src/core/loadShapes.ts` + zod cho shapes.yaml; `loadScript`/validator dùng registry để kiểm `branch`.
- Cập nhật `contentIntegrity` test: shapes.yaml khớp taxonomy registry; mọi `branch` trong script.yaml ∈ registry∪core.

**Out of scope**
- KHÔNG đụng `emit.ts` (B5b) — chưa đổi file-map/hành vi.
- KHÔNG điền câu S7/meta/cli vào script.yaml (B4).
- KHÔNG viết critic (B4c/B6a).

## 3. Checklist
- [ ] `shapes.yaml` tồn tại, parse+validate, khớp 4 shape trong taxonomy registry.
- [ ] zod `interviewScript`: `branch` string theo registry; `kind` default `anchored`; `target_doc` null-iff-meta (refine).
- [ ] zod `state`: `branch` string|null theo registry.
- [ ] `loadShapes` + validator hoạt động; script.yaml **hiện tại** (chưa có kind/meta) vẫn validate (tương thích ngược).
- [ ] `state`: `calibrate_mode` ∈ {deep,fast,null}. `critics` (nếu có) key ∈ question ids, entry `{challenge, ack_prompt}` không rỗng.
- [ ] `contentIntegrity` kiểm shapes.yaml ↔ taxonomy + branch hợp lệ.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/Content/interview-script/shapes.yaml`
- `[NEW]` `src/core/loadShapes.ts` (+ `loadShapes.test.ts`)
- `[MODIFY]` `src/core/schemas/interviewScript.ts`, `src/core/schemas/state.ts`, `src/core/schemas/index.ts` (export)
- `[MODIFY]` `src/core/loadScript.ts` (validate branch theo registry), `src/core/contentIntegrity.test.ts`
- `[MODIFY]` `Design/DecisionLog.md`: **D27** — chốt vị trí+định dạng `shapes.yaml` (runtime registry, mirror taxonomy.md, theo tiền lệ D15).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Nới `branch` thành string làm mất kiểm tra | Cao | Refine validate ∈ registry đọc từ shapes.yaml; test ca branch lạ → fail. |
| shapes.yaml lệch taxonomy.md | Cao | contentIntegrity so hai bên; lệch → đỏ. |
| `default('anchored')` che câu meta thiếu cấu hình | TB | Refine bắt buộc target_doc===null khi kind meta; test ca meta có target_doc → fail. |

## 6. Verification plan
- `npx vitest run loadShapes loadScript contentIntegrity` — xanh, gồm ca branch-lạ fail + meta-refine.
- `npm run typecheck && npm run lint` — sạch.
- `npm test` — **toàn bộ xanh** (script.yaml cũ vẫn hợp lệ, chưa đổi behavior).

## 7. Status
`WAITING_FOR_APPROVAL`
