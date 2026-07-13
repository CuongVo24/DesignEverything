# Contract — B8a Execution state, evidence và milestone gate

> Tầng: Lõi. Nguồn: V3-ExecutionExpansionPlan B8a, D30-D31, D35. Phụ thuộc: B7a.

## 1. Micro-task target
Mở rộng state machine và gate policy để chỉ một task nhỏ đã kiểm chứng được phép chạy tại một thời điểm, có evidence append-only để resume hoặc repair không mất lịch sử.

## 2. Scope

**In scope**

- execution-state.json trong .design-everything với phase plan-validating, ready-to-execute, executing, verifying, repairing, blocked, ready-to-ship.
- active_task, active_milestone, completed_tasks, evidence và block_reason có schema/timeline rõ.
- EvidenceRecord gồm task_id, command, exit_code, expected_result, observed_result, timestamp, artifact paths và actor.
- Gate thêm requires_validation, task_id, allows_paths và requires_evidence; Bậc A thực thi deterministic, Bậc B chỉ hướng dẫn.
- Transition: validate pass -> open task đầu; start -> verify -> record pass -> next task; fail -> repairing hoặc blocked, không âm thầm mở task sau.

**Out of scope**

- Không thay progress.json interview history; execution state là file riêng.
- Không tự commit/push/deploy hay tự sửa ngoài allows_paths.

## 3. Checklist

- [ ] Zod schema reject task/evidence không hợp lệ, duplicate evidence và transition không đúng.
- [ ] Evidence append-only; repair gắn với task hiện tại.
- [ ] Gate không mở nếu chỉ có docs đúng tên mà không có validation pass.
- [ ] Task khác active_task hoặc path ngoài allows_paths bị deny ở Bậc A.
- [ ] State hỗ trợ resume sau phiên mới bằng evidence đã lưu.

## 4. Interfaces / Files expected to change

- [NEW] src/core/schemas/executionState.ts, khoảng 180 dòng.
- [MODIFY] src/core/schemas/state.ts, schemas/index.ts, core index exports.
- [NEW] src/core/advanceExecutionState.ts và tests, khoảng 200 dòng.
- [MODIFY] src/core/evaluateGate.ts, loadGatePolicy.ts, schemas/gatePolicy.ts.
- [MODIFY] Design/Core/Schemas/state-schema.md, gate-policy.md và runtime gate-policy.yaml.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| State quá phức tạp hơn giá trị | TB | Chỉ một active task, event append-only và transition hữu hạn. |
| Chặn nhầm lệnh đọc/test | Cao | Phân loại read-only, verify command và write action; fixture Windows paths. |
| Evidence bị model bịa | Cao | Record phải có command/exit/observed result; adapter A lấy từ tool output khi có thể, B gắn nhãn self-reported. |

## 6. Verification plan

- npx vitest run executionState evaluateGate
- npm run typecheck && npm run lint
- E2E: docs tồn tại nhưng validation fail -> deny; M0 pass -> chỉ M1 mở; verify fail -> repairing/blocked; resume giữ evidence.

## 7. Status

WAITING_FOR_APPROVAL
