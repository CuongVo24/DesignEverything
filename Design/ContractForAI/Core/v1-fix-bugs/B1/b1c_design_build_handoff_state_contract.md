# B1c — Design-to-build handoff state contract

## 1. Micro-task target

Khóa một bàn giao duy nhất và đúng sự thật: emit xong chỉ sẵn sàng chạy /build validate; code chỉ được phép sau execution state ready-to-execute và task scope hợp lệ.

## 2. Scope

### In scope

- Quan hệ giữa interview phase và execution phase.
- Khởi tạo execution-state sau emit.
- Luật code gate cho docs-emitted/ready-to-build/plan-validating.
- Next-step canonical cho /design-everything → /build.

### Out of scope

- Copy skill/installer; thuộc B4d/B4f.
- Validation plan chi tiết đã có; contract này chỉ khóa precondition/transition.

## 3. Implementation checklist

- [ ] Thay nghĩa mơ hồ ready-to-build bằng ready-for-validation, hoặc migration alias có semantics tương đương.
- [ ] Successful tier-1 emit phải atomically tạo execution-state phase=plan-validating cùng plan/docs digests.
- [ ] Nếu docs/plan tồn tại mà execution-state thiếu/corrupt, code action luôn deny với reason EXECUTION_STATE_REQUIRED/CORRUPT.
- [ ] requires_validation không bao giờ được skip vì execState null.
- [ ] docs-emitted là transient/recovery phase và chặt ít nhất bằng ready-for-validation; không có phase inversion.
- [ ] Chỉ ready-to-execute, executing/repairing hợp lệ và path thuộc active task mới có thể allow code write.
- [ ] Core next-step sau emit trả nextCommand=/build và hành động đầu tiên validate, không trả “bắt đầu code M0”.
- [ ] Chốt invariant: gate artifact pass không đồng nghĩa plan validation pass.
- [ ] Migration state ready-to-build cũ tạo/đòi plan-validating, không tự nâng ready-to-execute.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Core/Schemas/state-schema.md — bảng phase và handoff invariant.
- [MODIFY] src/core/schemas/state.ts và src/core/schemas/executionState.ts.
- [MODIFY] src/core/advanceExecutionState.ts — init/transition handoff.
- [MODIFY] src/adapters/shared/renderNextStep.ts — canonical next card.
- [MODIFY] src/core/evaluatePreAction.ts — code authorization dựa trên execution phase.
- [NEW] src/core/designBuildHandoff.test.ts.

Interface đích:

- completeTier1Emit(interviewStore, emitResult) → { interviewStore, executionState }
- evaluateBuildReadiness(progress, plan, executionState) → readiness result có reason_code/next_command

## 5. Risks & mitigations

- Đổi phase phá state cũ: next-MAJOR migrator explicit và fixture v4/v5/v6.
- Emit và execution-state vẫn partial: dùng transaction boundary/manifest của B3d.
- UX thêm bước: next-step nói rõ “docs xong, kế hoạch chưa validate” và đưa đúng một command.

## 6. Verification plan

- Matrix tất cả interview/execution phase × có/thiếu/corrupt state × code/doc action.
- Assert docs-emitted và ready-for-validation đều deny code khi chưa validate.
- Emit success tạo plan-validating; /build validate pass mới chuyển ready-to-execute.
- Migration ready-to-build cũ không mở code tự động.
- Snapshot next-step tuyệt đối không chứa claim “gate đã mở để code” trước ready-to-execute.

## 7. Status

WAITING_FOR_APPROVAL
