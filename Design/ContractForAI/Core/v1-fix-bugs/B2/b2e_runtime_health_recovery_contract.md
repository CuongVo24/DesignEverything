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

- [ ] Nếu không có install manifest và không có managed artifacts thì trả uninvolved; đây là trường hợp bypass duy nhất.
- [ ] Có install manifest nhưng thiếu progress/interview-state/execution-state bắt buộc thì health=broken, không uninvolved.
- [ ] Parse/schema/integrity/version error của state, plan, profile, policy và catalog không được catch rồi đổi thành null.
- [ ] Optional deepen state có thể warning chỉ khi chưa opt-in; đã opt-in mà hỏng là blocking health error.
- [ ] Health result gồm severity, reason_code, artifact, safe_next_command và can_auto_repair.
- [ ] Pre-action khi health blocking chỉ allow read-only diagnostics và recovery operation/path scoped.
- [ ] Recovery không tự reset/xóa state; luôn backup + migrate/repair explicit.
- [ ] status và next-step cùng đọc một Core health result, không có logic catch riêng.
- [ ] Missing managed state sau emit trả guidance restore/reinstall/migrate, không cho code.

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

WAITING_FOR_APPROVAL
