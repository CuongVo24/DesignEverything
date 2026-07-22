# B1d — Typed blocked reason and transition contract

## 1. Micro-task target

Tách blocked do validation/integrity khỏi blocked do task verification/abort để lệnh validate không gỡ nhầm execution failure và remediation vẫn có đường đi.

## 2. Scope

### In scope

- Schema blocked_kind/reason_code/origin/remediation.
- Transition table và allowed remediation actions.
- Quy tắc active_task/evidence khi block/unblock.

### Out of scope

- Host hook mapping; thuộc B4a.
- Nội dung validation issue cụ thể.

## 3. Implementation checklist

- [ ] Thay block_reason string đơn bằng block record typed: kind, reason_code, origin_phase, task_id, recoverable_by, detail, created_at.
- [ ] Enum tối thiểu: validation, artifact-integrity, snapshot-stale, policy-corrupt, verification-failed, verification-aborted.
- [ ] transitionToReadyToExecute chỉ chấp nhận plan-validating hoặc blocked thuộc validation/artifact-integrity/snapshot-stale sau pass tương ứng.
- [ ] verification-failed/aborted giữ active_task, attempt/evidence và chỉ qua repair/resume/review policy đúng loại.
- [ ] blocked không deny mọi thứ; allow chính xác remediation command/path khai trong block record.
- [ ] Không cho caller truyền validationPass=true để bypass missing evidence/digest.
- [ ] Mọi transition illegal trả reason code, không mutate.
- [ ] Next-step render từ recoverable_by, không suy từ free-text reason.
- [ ] Migration block_reason cũ phân loại conservative; không rõ thì policy-corrupt và fail closed.

## 4. Interfaces / Files expected to change

- [MODIFY] src/core/schemas/executionState.ts — khoảng 35–60 dòng.
- [MODIFY] src/core/advanceExecutionState.ts — explicit transition table.
- [MODIFY] src/core/evaluatePreAction.ts — remediation scope.
- [MODIFY] src/adapters/shared/renderNextStep.ts.
- [MODIFY] Design/Core/Schemas/state-schema.md.
- [NEW] src/core/blockedTransition.test.ts.

Interface đích:

- blockExecution(state, blockRecord) → ExecutionState
- recoverBlockedExecution(state, proof) → transition result
- allowedRemediation(state) → action/path capability

## 5. Risks & mitigations

- Quá nhiều enum: reason_code mở rộng nhưng kind nhỏ/ổn định; unknown kind fail closed.
- Deadlock không sửa được docs: validation/integrity block cấp remediation scope hẹp cho managed source slots/emit command.
- Validation vô tình xóa task context: tests bắt active_task/evidence bất biến theo từng kind.

## 6. Verification plan

- Transition table test mọi cặp phase/kind/action, gồm illegal transitions.
- Regression: blocked verification-aborted + validate pass vẫn blocked và giữ active_task.
- Validation block cho phép đúng sửa slots/re-emit/validate, vẫn deny source code.
- Corrupt/unknown old block không tự ready-to-execute.
- Rendered next-step khớp recoverable_by và reason_code.

## 7. Status

WAITING_FOR_APPROVAL
