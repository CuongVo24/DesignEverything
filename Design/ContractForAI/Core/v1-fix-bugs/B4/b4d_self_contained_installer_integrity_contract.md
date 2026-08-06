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

- [x] Package target-local versioned runtime bundle dưới .design-everything/runtime hoặc equivalent; hook/skill dùng relative target path, không ENGINE_ROOT repo.
- [x] Copy catalog-declared assets gồm script.yaml, deepen-script.yaml, gate-policy.yaml, shapes.yaml, templates, catalogs và schema/version metadata.
- [x] Ghi install manifest: runtime/schema/catalog version, build hash, asset hashes, hook IDs, install time và target root.
- [x] Installer verify bundle/source build hash; dev install gặp dist stale phải fail rõ với build command, release artifact không phụ thuộc source tree.
- [x] ensureHook match exact event + stable hook ID/path, không command.includes.
- [x] Rerun update hook cùng ID khi path/version/hash stale; giữ nguyên hook không thuộc DesignEverything và không duplicate.
- [x] Migrate hook cũ chứa absolute ENGINE_ROOT, sai filename hoặc old skill name; report changed/preserved/conflict.
- [x] Install/repair dùng staging + atomic file writes; failure không để half-installed manifest “healthy”.
- [x] Post-install self-check spawn target-local CLI status/health và verify all hashes.
- [x] Di chuyển/xóa repo nguồn sau install không ảnh hưởng target.
- [x] Tách merge-settings, package verification và atomic install thành helper modules dưới 200 dòng; install.mjs chỉ orchestration.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

**Cập nhật 2026-08-06 (A1-P9):** đóng 3 gap thật còn lại sau khi khảo sát lại code (7/11 mục đã có
evidence từ trước, xem ghi chú 2026-07-30 bên dưới):
- **Dist-staleness (#4):** `adapter/claude-code/installer/shared.mjs`'s `checkDistFreshness()` so
  mtime mọi `src/**/*.ts` (trừ `*.test.ts`) với `dist/bundle/runtime.mjs`; fail rõ với lệnh
  `npm run build:bundle` khi dev checkout có source mới hơn bundle. No-op khi `src/` không tồn tại
  (release artifact qua npm chỉ ship `dist/`). Test:
  `test/integration/installed-runtime/installer-dist-staleness.test.ts` (gọi trực tiếp hàm export,
  dùng fake engineRoot cô lập — tránh đua tiến trình với các test khác cũng spawn installer thật
  và cùng đọc/ghi `src/`, `dist/bundle/runtime.mjs` của chính repo).
- **Stable hook identity + legacy migration + report (#5, #7):**
  `adapter/claude-code/installer/settingsMerge.mjs`'s `mergeHookSettings()` nhận diện hook "của
  mình" qua 2 pattern: path versioned hiện hành VÀ path legacy
  `adapter/claude-code/hooks/<file>` (hook cài trước P9, trỏ absolute vào repo checkout) — rerun
  sửa tại chỗ thay vì thêm entry mới bên cạnh entry chết. Nếu một role khớp nhiều entry (legacy +
  versioned cùng tồn tại), giữ 1 và xoá phần trùng (nhánh `conflict`). Trả về
  `{ hookIds, report: { changed, preserved, conflicts } }`, in vào completion text
  (`installer/summary.mjs`). Test: mở rộng `installer-repair.test.ts` với case
  "migrates a legacy pre-P9 hook pointing at an absolute repo path".
- **Tách file (#11):** `install.mjs` (344 dòng) → orchestrator 99 dòng +
  `adapter/claude-code/installer/{shared,stage,promote,settingsMerge,healthCheck,manifest,summary}.mjs`,
  mỗi file dưới 200 dòng. Behavior-preserving: 71 test trong
  `test/integration/installed-runtime/` + `adapter-parity.test.ts` xanh trước/sau tách.

Mục #3 (schema/runtime/catalog version trong manifest) hoá ra không phải gap:
`installManifestSchema.version` (comment tại `src/core/schemas/installManifest.ts:20`) đã là
"manifest schema version, not the runtime version", tách biệt với `runtime_version`/`catalog_version`.

**Ghi chú gốc (2026-07-30, P2.5 vocabulary sync), giữ để lưu vết:** "chuẩn hoá về đúng 3 trục khớp
README.md — trước đó README ghi Implementation dạng mơ hồ `NOT_STARTED/PARTIAL`, đã sửa về
`PARTIAL`. Rà lại evidence phát hiện checklist §3 đã có bằng chứng installed-seam thật, trước đó
không được liên kết vào matrix: U07 (ENGINE_ROOT tuyệt đối, không pin/integrity) nay FIXED —
`moved-source.test.ts` xoá REPO_ROOT rồi relocate cả cây cài, `tampered-runtime.test.ts` chứng
minh bit-flip runtime bundle fail closed. `installer-repair.test.ts`/`installer-interrupted.test.ts`
chứng minh rerun không duplicate hook và crash giữa install tự phục hồi. X13 nay có fixture installed
target seed cả ba hook DesignEverything với runtime version cũ, rerun thay đúng mỗi command về version
hiện hành và giữ nguyên byte command của user hook."
