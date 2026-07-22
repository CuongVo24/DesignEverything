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

- [ ] Render toàn bộ artifact vào generation staging cùng volume, không ghi trực tiếp live paths.
- [ ] Chạy schema, anchor, consistency, quality/provenance, catalog completeness và plan validation preflight trên staging.
- [ ] Severity error hoặc unacknowledged warning không được activate.
- [ ] Manifest generation gồm generation_id, catalog/version digest, input revisions/digest, exact paths, per-file digest, ownership và created_at.
- [ ] Promotion có journal: backup previous managed files, promote exact new set, activate manifest pointer và execution state; crash recovery roll-forward/rollback idempotent.
- [ ] Runtime chỉ tin active manifest; staging/partial files không thỏa gate.
- [ ] Re-emit xóa/archive chỉ stale path có trong previous managed manifest và absent new manifest.
- [ ] Không delete/overwrite unknown user-owned file; collision phải fail với actionable report.
- [ ] Successful activation set interview phase ready-for-validation và execution-state plan-validating theo B1c.
- [ ] CLI output lấy exact activated paths từ manifest, không dựng prefix.

## 4. Interfaces / Files expected to change

- [NEW] src/core/emitTransaction.ts — chia module để mỗi file dưới 200 dòng.
- [NEW] src/core/schemas/emitManifest.ts.
- [MODIFY] src/core/emit.ts và src/core/emitTier2.ts — render pure vào target staging.
- [MODIFY] src/core/checkDocsConsistency.ts.
- [NEW] src/core/recoverEmitTransaction.ts.
- [NEW] src/core/emitTransaction.test.ts.

Interface đích:

- prepareEmit(root, inputs, catalog) → staged generation
- validateStagedEmit(generation) → pass | issues
- activateEmit(root, generation, expectedRevision) → active manifest/state
- recoverEmit(root) → no-op | rolled-forward | rolled-back | explicit-error

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

WAITING_FOR_APPROVAL
