# B3c — Authoritative runtime and artifact catalog contract

## 1. Micro-task target

Loại số file/path/journey viết tay bằng một catalog máy đọc duy nhất cho question order, output theo shape, conventions, tier-2 và non-doc artifacts.

## 2. Scope

### In scope

- Machine-readable catalog và compiler từ taxonomy/script.
- Exact output path, ownership, requiredness và count theo shape/tier.
- API/CLI result dùng catalog.

### Out of scope

- Nội dung từng template.
- Atomic filesystem promotion; thuộc B3d.

## 3. Implementation checklist

- [ ] Catalog mỗi artifact gồm id, exact relative path, tier, shapes, required, ownership, source questions/recipes và media type.
- [ ] Catalog phân biệt docs files, docs/conventions, .design-everything/execution-plan.json, state và manifests; không gắn docs/ theo thói quen.
- [ ] Journey catalog compile thứ tự CAL0, S0–S8, R1 và W/M/C theo branch; hybrid union theo rule explicit.
- [ ] Artifact count luôn tính từ filtered catalog; không lưu magic number 10/11/12/13 trong CLI/docs tests.
- [ ] Compiler validate duplicate path/id, missing target_doc, shape không tồn tại, case collision và path ngoài managed roots.
- [ ] Emit trả danh sách exact paths từ activated manifest.
- [ ] Public docs có thể nhúng generated table/count hoặc test assertion từ catalog.
- [ ] Catalog version/digest nằm trong install và emit manifests.
- [ ] Tier-2/deepen artifacts mở rộng cùng schema, không lập danh sách riêng trong adapter.

## 4. Interfaces / Files expected to change

- [NEW] Design/Content/artifact-catalog.yaml hoặc generated source tương đương.
- [NEW] src/core/loadArtifactCatalog.ts — khoảng 100–160 dòng.
- [NEW] src/core/compileRuntimeCatalog.ts — khoảng 100–170 dòng.
- [MODIFY] src/core/emit.ts và src/core/emitTier2.ts để nhận catalog.
- [MODIFY] src/core/schemas/index.ts.
- [NEW] src/core/artifactCatalog.test.ts.

Interface đích:

- compileRuntimeCatalog({ taxonomy, script, deepenScript, templates }) → catalog
- listArtifacts(catalog, { shape, tier }) → exact artifact records
- listJourney(catalog, shape) → ordered question ids

## 5. Risks & mitigations

- Hai nguồn taxonomy/catalog drift: catalog được compile/validate từ source đã chọn và release check so digest.
- Hybrid duplicate path: union theo artifact id, reject conflict metadata.
- Docs cần số tĩnh cho lịch sử: ghi “tại release X” và test từ catalog version đó.

## 6. Verification plan

- Assert journey có branch questions và hybrid đúng union/order.
- Assert exact path-set snapshot cho từng shape; count chỉ được tính từ path set (audit hiện tại tương ứng 12 cho web/mobile/CLI và 13 cho hybrid), không có literal count riêng ở consumer.
- Assert execution-plan path không có prefix docs/.
- Mutation fixtures duplicate/case collision/missing target/outside root bị reject.
- Search test cấm magic count trong CLI/skill/quickstart ngoại trừ generated snapshot có provenance.

## 7. Status

WAITING_FOR_APPROVAL
