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

- [x] Catalog mỗi artifact gồm id, exact relative path (hoặc `path_pattern` cho tier-2 dynamic), tier, shapes, required, ownership, source questions/recipes và media type ([artifact-catalog.yaml](../../../../Content/artifact-catalog.yaml)).
- [x] Catalog phân biệt docs files (`kind: doc`), docs/conventions (`kind: convention`), `.design-everything/execution-plan.json` (`kind: state`, không gắn `docs/`); `loadArtifactCatalog` reject state path nằm dưới `docs/`.
- [x] Journey catalog compile theo branch từ chính `script.yaml` (loại `kind=meta` như CAL0); hybrid = union web+mobile theo cùng rule `isQuestionCompatible` đã dùng ở `advanceState.ts`.
- [x] Artifact count luôn tính từ filtered catalog (`listArtifacts(rt,{shape,tier}).filter(kind==='doc').length`); test khẳng định 12 (web/mobile/cli) / 13 (hybrid) đọc trực tiếp từ catalog, không copy con số vào code.
- [x] Compiler (`compileRuntimeCatalog`) validate: duplicate id/path (ở loader), unknown question id, shape không tồn tại trong registry, case-collision path, path ngoài `docs/`/`.design-everything/`; 07-* phải khớp `shapes.yaml.release_docs` (chống drift hai nguồn).
- [x] `emit.ts` (tier-1) không còn hardcode literal file list — `emitTree` build `files` từ `listArtifacts(runtimeCatalog, {shape: branch, tier: 1})`, giữ nguyên hành vi (13 tests emit.test.ts/emitGreenfieldStack.test.ts pass không đổi assertion).
- [x] Catalog version/digest tính bằng sha256 trên `{version, artifacts}` đã sort ổn định (`RuntimeCatalog.digest`); sẵn sàng cho manifest ở B3d.
- [x] Tier-2/deepen artifacts (`glossary`, `test-strategy`, `adr` bằng `path_pattern`, `feature-spec` bằng `path_pattern`) khai trong cùng schema catalog, không lập danh sách riêng trong adapter.

Đã deferred sang B3d/B3e (không thuộc phạm vi B3c theo "Out of scope"):
- Wiring `emitTier2.ts` để dùng `path_pattern` sinh path ADR/feature-spec thật (tier-2 lifecycle thuộc B3e).
- Nhúng generated table/count vào public docs (README/skill wording) — cosmetic, không chặn runtime correctness.

## 4. Interfaces / Files expected to change

- [DONE] Design/Content/artifact-catalog.yaml — 23 artifact records (12 core-shape docs, 3 shape-specific 07-*, 4 conventions, 1 state, 4 tier-2).
- [DONE] src/core/schemas/artifactCatalog.ts — artifactSourceSchema/artifactRecordSchema/artifactCatalogSchema.
- [DONE] src/core/loadArtifactCatalog.ts — load + duplicate/case-collision/outside-root/state-under-docs validation.
- [DONE] src/core/compileRuntimeCatalog.ts — compileRuntimeCatalog/listArtifacts/listJourney, digest, shape/question/release-doc drift validation.
- [DONE] src/core/emit.ts — `emitTree` build tier-1 `files` từ catalog thay vì literal array; giữ nguyên `emitTier2.ts` (deferred, xem ghi chú §3).
- [DONE] src/core/schemas/index.ts — export schema/type mới.
- [DONE] src/core/artifactCatalog.test.ts — 9 test (load/compile, count snapshot, state path, journey, 4 mutation-reject case).

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): sửa từ vocabulary cũ đã bỏ
(`IMPLEMENTED_WAITING_FOR_REVIEW`) về đúng 3 trục — Implementation khớp README.md (`IMPLEMENTED`),
đây là contract Implementation duy nhất trong toàn plan đạt mức này. Proof vẫn `UNIT_ONLY` vì chưa
có test spawn qua CLI/installed target thật cho riêng catalog path-matching.
