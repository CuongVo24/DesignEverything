# B2e — Installed runtime health and fail-closed recovery contract

## 1. Micro-task target

Phân biệt project chưa cài với project đã cài nhưng mất/hỏng state, và biến mọi corruption bị nuốt ở status/next-step thành health error có recovery rõ ràng.

## 2. Scope

### In scope

- Install marker/manifest detection.
- Health model cho state, plan, profile, policy, assets, manifests.
- Fail-closed decision và recovery commands.

### Out of scope

- Installer tạo/repair manifest; thuộc B4d.
- CLI presentation/exit code; thuộc B4c.

## 3. Implementation checklist

- [x] Nếu không có install manifest và không có managed artifacts thì trả uninvolved; đây là trường hợp bypass duy nhất.
- [x] Có install manifest nhưng thiếu progress/interview-state/execution-state bắt buộc thì health=broken, không uninvolved.
- [x] Parse/schema/integrity/version error của state, plan, profile, policy và catalog không được catch rồi đổi thành null.
- [x] Optional deepen state có thể warning chỉ khi chưa opt-in; đã opt-in mà hỏng là blocking health error.
- [x] Health result gồm severity, reason_code, artifact, safe_next_command và can_auto_repair.
- [x] Pre-action khi health blocking chỉ allow read-only diagnostics và recovery operation/path scoped.
- [x] Recovery không tự reset/xóa state; luôn backup + migrate/repair explicit.
- [x] status và next-step cùng đọc một Core health result, không có logic catch riêng.
- [x] Missing managed state sau emit trả guidance restore/reinstall/migrate, không cho code.

## 4. Interfaces / Files expected to change

- [NEW] src/core/runtimeHealth.ts — khoảng 130–190 dòng.
- [NEW] src/core/schemas/runtimeHealth.ts.
- [MODIFY] src/adapters/shared/renderNextStep.ts.
- [MODIFY] src/core/evaluatePreAction.ts.
- [NEW] src/core/runtimeHealth.test.ts.
- [MODIFY] Design/Core/Schemas/state-schema.md.

Interface đích:

- inspectRuntimeHealth(root) → HealthReport
- authorizeRecovery(report, action) → scoped decision

## 5. Risks & mitigations

- False “installed” do file trùng tên: chỉ signed/versioned install manifest B4d là authority.
- Health check đắt: bounded reads và hashes từ manifest; vẫn ưu tiên đúng hơn fail-open.
- Recovery loop: reason code + idempotent repair + post-repair health assertion.

## 6. Verification plan

- Matrix uninstalled / installed healthy / missing state / corrupt JSON / wrong version / stale hash / optional deepen.
- status, next-step và pre-action nhận cùng reason_code.
- Xóa progress/interview state trong installed target vẫn deny code.
- Corrupt execution-plan/profile không bị hiển thị như chưa có kế hoạch.
- Recovery chỉ allow exact repair action, không mở shell/write chung.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-25 (bugfix, không phải implementation đầy đủ của contract): `authorizeRecovery` đã
xoá điều kiện `cmd.includes(attemptedAction)` — trước đây một `attemptedAction` ngắn tuỳ ý (vd chỉ
chuỗi `"node"`) khớp substring vào bất kỳ `safe_next_command` dài nào và được authorize, một đường
bypass rõ ràng của "Recovery chỉ allow exact repair action" ở §6. Giờ chỉ còn hướng
`attemptedAction.includes(cmd)` (attempted phải chứa TRỌN VẸN command an toàn).

Cập nhật 2026-08-03 (A1-P5): xác nhận `authorizeRecovery` hiện tại đã dùng exact match hai chiều
(`trimmedAttempt === cmd.trim()`), đã đúng "exact repair action" — ghi chú 2026-07-25 ở trên mô tả
trạng thái cũ, không còn khớp code hiện hành. Đóng R03 và phần B2e của X15 trong cùng đợt:

- **R03 (SessionStart nuốt lỗi)** — `onSessionStart` (`src/adapters/claude/sessionStart.ts`) không còn
  empty-catch cho `recoverEmit`/`migrateInterviewStore`; trả về `SessionStartResult` có
  `recover_error`/`migrate_error` thật cùng `health` (kết quả `inspectRuntimeHealth`, không còn bị bỏ).
  `session-start.mjs` giờ surface cả ba vào `additionalContext` thay vì tính rồi vứt.
- **X15 (project-profile.json ngoài health surface)** — thêm `classifyProjectProfileState` (phân biệt
  `missing`/`ok`/`corrupt`, không collapse cả hai vào `null` như `loadProjectProfile` cũ vẫn giữ cho
  hai caller hiện có của nó); `inspectRuntimeHealth` giờ phát `CORRUPT_PROJECT_PROFILE` khi file tồn
  tại nhưng hỏng.

Cập nhật 2026-08-06 (A1-P5, đóng nốt các mục còn mở ở trên):

- **execution-plan.json / gate-policy.yaml / artifact-catalog integrity** — 3 hàm check mới trong
  `runtimeHealth.ts` (`checkExecutionPlanIntegrity`, `checkGatePolicyIntegrity`,
  `checkArtifactCatalogIntegrity`), theo đúng pattern `checkEmitManifestIntegrity` sẵn có: file thiếu
  không phải lỗi (chưa synthesize/chưa cài), file tồn tại nhưng parse/schema fail thì health=broken
  với reason_code riêng (`CORRUPT_EXECUTION_PLAN`/`CORRUPT_GATE_POLICY`/`CORRUPT_ARTIFACT_CATALOG`).
  gate-policy/catalog resolve `workspaceRoot` trước `process.cwd()` (thứ tự ngược lại pattern
  deepen-script.yaml cũ — deepen's `process.cwd()`-first khiến test corrupt-case không bao giờ thấy
  bản trong workspace khi chạy từ chính repo engine; đã tránh lặp lại lỗi đó ở đây).
- **Symlink escape** — đóng cùng B2d (xem `b2d` §7 2026-08-06); rủi ro không chỉ ở `gateSnapshot.ts`
  mà health surface phụ thuộc cùng snapshot đó, nên fix chung một chỗ đủ cho cả hai contract.
- **status/next-step cùng đọc health** — rà lại phát hiện `handleNext`/`handleStart`
  (`src/adapters/shared/cliOps/next.ts`, `start.ts`) **chưa từng** gọi `inspectRuntimeHealth` — mỗi
  hàm tự try/catch riêng và trả `EXECUTION_STATE_MISSING` (chuỗi khác), trong khi `evaluatePreAction`
  (write-gate) đã dùng `MISSING_EXECUTION_STATE` (health canonical) cho đúng tình huống đó từ trước —
  hai lối cùng nghĩa nhưng hai chuỗi khác nhau. Thêm health-first gate vào `handleNext`/`handleStart`
  giống `handleStatus` (status.ts) đã làm; giờ cả ba (status/next/start/write-gate) cùng trả
  `MISSING_EXECUTION_STATE` khi thiếu execution-state sau emit. Test `cli-protocol.test.ts` P3.1 cập
  nhật theo reason_code thống nhất. `review.ts`/`verify.ts` cũng tự có `EXECUTION_STATE_MISSING`
  riêng — để lại cho A1-P8 (B4c, CLI operation surface) vì đó là phạm vi đúng của nó, không phải B2e.

Checklist §3 đủ 9/9. Implementation → `IMPLEMENTED`.
