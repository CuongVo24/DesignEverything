# B4d — Self-contained Claude installer and repair contract

## 1. Micro-task target

Đóng gói đủ script/deepen/runtime vào target, loại phụ thuộc ENGINE_ROOT tuyệt đối/dist stale và khiến rerun installer sửa đúng hook cũ mà không phá hook người dùng.

## 2. Scope

### In scope

- Claude install asset/runtime layout và install manifest.
- deepen-script copy.
- Hook identity/migration/repair.
- Source build freshness và moved-engine behavior.

### Out of scope

- Codex parity; thuộc B4e.
- Runtime policy logic; thuộc B1–B3/B4a.

## 3. Implementation checklist

- [ ] Package target-local versioned runtime bundle dưới .design-everything/runtime hoặc equivalent; hook/skill dùng relative target path, không ENGINE_ROOT repo.
- [ ] Copy catalog-declared assets gồm script.yaml, deepen-script.yaml, gate-policy.yaml, shapes.yaml, templates, catalogs và schema/version metadata.
- [ ] Ghi install manifest: runtime/schema/catalog version, build hash, asset hashes, hook IDs, install time và target root.
- [ ] Installer verify bundle/source build hash; dev install gặp dist stale phải fail rõ với build command, release artifact không phụ thuộc source tree.
- [ ] ensureHook match exact event + stable hook ID/path, không command.includes.
- [ ] Rerun update hook cùng ID khi path/version/hash stale; giữ nguyên hook không thuộc DesignEverything và không duplicate.
- [ ] Migrate hook cũ chứa absolute ENGINE_ROOT, sai filename hoặc old skill name; report changed/preserved/conflict.
- [ ] Install/repair dùng staging + atomic file writes; failure không để half-installed manifest “healthy”.
- [ ] Post-install self-check spawn target-local CLI status/health và verify all hashes.
- [ ] Di chuyển/xóa repo nguồn sau install không ảnh hưởng target.
- [ ] Tách merge-settings, package verification và atomic install thành helper modules dưới 200 dòng; install.mjs chỉ orchestration.

## 4. Interfaces / Files expected to change

- [MODIFY] adapter/claude-code/install.mjs.
- [NEW] adapter/claude-code/package-manifest.json hoặc generated manifest source.
- [NEW] scripts/build-adapter-bundle.mjs.
- [MODIFY] adapter/claude-code/skill/SKILL.md path placeholders.
- [NEW] test/integration/claude-installer.test.ts.
- [MODIFY] package scripts/release packaging.

Interface đích:

- installClaudeAdapter(target, packageArtifact) → structured install report
- repairClaudeAdapter(target, expectedManifest) → structured repair report
- verifyInstalledRuntime(target) → health report

## 5. Risks & mitigations

- Bundle lớn: tree-shake Core nhưng không bỏ asset; integrity quan trọng hơn vài MB.
- Ghi đè user settings: merge theo stable hook ID, backup settings và conflict fail explicit.
- Node/runtime compatibility: manifest ghi engine range và preflight trước mutation.

## 6. Verification plan

- Temp target install chứa deepen-script và mọi catalog asset; hashes khớp.
- Đổi/xóa repo engine sau install, target CLI/hook vẫn chạy.
- Fixture dist stale bị fail trước target mutation.
- Rerun sửa absolute/stale/wrong hook, không duplicate và giữ custom hooks byte-for-byte.
- Failure injection giữa copy/settings/manifest rollback hoặc health=broken có repair path.

## 7. Status

WAITING_FOR_APPROVAL
