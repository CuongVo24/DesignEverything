# B3d — Transactional tier-1 emit and managed manifest contract

## 1. Micro-task target

Đảm bảo emit/re-emit không để partial hoặc stale output, validate trước activation và tuyệt đối không xóa file user-owned.

## 2. Scope

### In scope

- Staging, consistency/quality validation, promotion, rollback/recovery.
- Managed artifact manifest và stale cleanup.
- Activation đồng bộ plan, docs digests và execution-state plan-validating.

### Out of scope

- Nội dung quality rule; thuộc B3a/B3b.
- CLI text/exit; thuộc B4c.

## 3. Implementation checklist

- [x] Render toàn bộ artifact vào `.design-everything/staging/<generation_id>/` cùng volume với live tree, không ghi trực tiếp live paths (`prepareEmit`).
- [x] Preflight trên staging: catalog completeness (thiếu required artifact = error), execution-plan.json schema (`executionPlanSchemaV3`), cross-doc consistency (`checkDocsConsistency`, tái dùng nguyên bộ luật B7/B4) (`validateStagedEmit`).
- [x] Severity `error` chặn `pass`; `warning` (vd docs-consistency) không tự chặn nhưng được trả về để lớp trên bắt user ack — không auto-pass.
- [x] Manifest generation gồm `generation_id`, `catalog_version`/`catalog_digest`, `input_digest`, exact `path` theo artifact, per-file sha256 `digest`, `ownership`, `created_at`/`activated_at` ([emitManifest.ts](../../../../../src/core/schemas/emitManifest.ts)).
- [x] Promotion có journal 4 bước (`backing-up → promoting → writing-manifest → done`) ghi TRƯỚC mỗi thao tác ghi đĩa; backup toàn bộ file sắp bị ghi đè/xoá vào `.design-everything/backups/<generation_id>/` trước khi đụng tới live tree.
- [x] `recoverEmit` đọc journal, luôn rollback về trạng thái known-good gần nhất (restore từ backup + xoá file mới tạo bởi promotion dở dang) nếu step chưa `done`; no-op khi không có journal hoặc step đã `done`; idempotent (test gọi 2 lần liên tiếp). **Đơn giản hoá so với "roll-forward hoặc rollback"**: bản này CHỈ rollback, không roll-forward — an toàn hơn nhưng nghĩa là một promotion dở dang luôn bị huỷ chứ không tự hoàn tất; ghi rõ để B3e/B4 biết khi build trên nó.
- [x] Runtime chỉ tin `.design-everything/emit-manifest.json` (active manifest) — staging dir không nằm trong live tree nên không thể lẫn vào gate.
- [x] Re-emit chỉ xoá path có trong previous **managed** manifest và absent ở manifest mới (`staleManagedPaths`); path không managed (user-owned) không bao giờ bị đụng.
- [x] Không overwrite unknown user-owned file: `activateEmit` kiểm tra mọi target path đã tồn tại trên đĩa mà KHÔNG có trong previous managed manifest → `status:'blocked', reason:'user-file-collision'`, liệt kê path, và **không mutate gì** (kiểm tra chạy trước khi ghi journal).
- [x] Successful activation set interview phase `ready-for-validation` (precondition đã kiểm ở
  `emitTier1.ts`'s `prepare` handoff — `progress.phase !== 'ready-for-validation'` throw trước khi
  activate) và execution-state `plan-validating` (`completeTier1Activation`'s `initExecutionState()`
  set `phase: 'plan-validating'` mặc định, gọi từ `tier1Handoff.complete` trong cùng transaction).
  Tested: `test/integration/cli-protocol.test.ts` "P3.1 — a successful tier-1 activation creates
  execution-state.json at plan-validating".
- [x] CLI output lấy exact activated paths từ manifest — `emitTier1.ts`'s `activateTier1Emit` trả
  `emitted_files: activation.manifest.artifacts.map((a) => a.path)`, `cliOperations.ts`'s `handleEmit`
  surface nguyên trạng vào `data.emitted_files`. Tested: `emitTier1.test.ts`.

## 4. Interfaces / Files expected to change

- [DONE] src/core/schemas/emitManifest.ts — `EmitManifest`, `EmitManifestArtifact`, `EmitJournal`.
- [DONE] src/core/emitTransactionStage.ts (~100 dòng) — `prepareEmit`.
- [DONE] src/core/emitTransactionValidate.ts (~95 dòng) — `validateStagedEmit`.
- [DONE] src/core/emitTransactionActivate.ts (~150 dòng) — `activateEmit` + journal.
- [DONE] src/core/recoverEmitTransaction.ts (~95 dòng) — `recoverEmit`.
- [DONE] src/core/emitTransaction.ts — barrel re-export, giữ interface đích §Interfaces.
- [UNCHANGED] src/core/emit.ts và src/core/emitTier2.ts — đã pure (không ghi đĩa) từ trước B3c/B3d nên không cần sửa để "render pure vào staging"; `emitTree`'s output (`EmittedDoc[]`) là input trực tiếp cho `prepareEmit`.
- [UNCHANGED] src/core/checkDocsConsistency.ts — dùng nguyên hàm hiện có trong `validateStagedEmit`, không cần sửa.
- [DONE] src/core/emitTransaction.test.ts — 8 test: staging isolation, preflight pass/fail, first activation, re-emit stale cleanup + user file survives, revision-mismatch block, user-file-collision block (no mutation), recover no-op, recover rollback (idempotent).

Interface đích:

- prepareEmit(root, inputs, catalog) → staged generation
- validateStagedEmit(generation) → pass | issues
- activateEmit(root, generation, expectedRevision) → active manifest/state
- recoverEmit(root) → no-op | rolled-back | explicit-error (rollback-only; không hứa roll-forward)

## 5. Risks & mitigations

- Multi-file rename không atomic: active manifest pointer là authority; journal + backups bảo đảm recovery trước mọi read/action.
- User file collision: fail trước promotion và liệt kê path; không auto-adopt.
- Disk đầy: preflight size, temp cùng volume, rollback fixture.

## 6. Verification plan

- Failure injection ở từng bước render/validate/backup/promote/manifest/state/cleanup.
- Sau restart chỉ old hoặc new generation là active; gate không thấy mixed generation.
- Re-emit thay shape dọn đúng stale managed files, giữ unknown docs.
- Consistency/quality fail để live tree và execution state không đổi.
- Path output gồm đúng docs/... và .design-everything/execution-plan.json.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED (2026-08-03) | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): sửa từ vocabulary cũ đã bỏ
(`PARTIALLY_IMPLEMENTED_WAITING_FOR_REVIEW`) về đúng 3 trục khớp README.md. Note cũ "không có CLI
entrypoint nào gọi emit hiện nay" đã LỖI THỜI — `cliOperations.ts` `handleEmit` gọi
`recoverEmit`/`activateEmit` thật (xác nhận lại 2026-07-30, xem finding-coverage-matrix.md X16).
Core transaction engine (stage/validate/activate/recover) done và tested; X22 (re-emit cleanup xóa
nhầm user-owned docs) đã FIXED. Proof vẫn `UNIT_ONLY` vì crash-injection test (FE-01..06) gọi thẳng
engine qua `crash-worker.mjs`, chưa crash một tiến trình `cli.mjs emit` thật — chấp nhận theo phạm
vi P1 2.3 của plan-v1-fix.md, không phải thiếu sót chưa biết.

Cập nhật 2026-08-03 (A1-P7, đối chiếu lại 2 mục còn `[ ]` với code thật — không cần code mới, chỉ
xác minh): cả hai mục "chưa làm" ở §3 hoá ra đã đóng từ trước, ghi chú stale. Implementation chuyển
`IMPLEMENTED` — 100% checklist §3 đã tick, có test xác nhận cho từng mục. Proof giữ `UNIT_ONLY` vì lý
do đã nêu ở trên (chưa qua crash một tiến trình CLI thật) không đổi.
