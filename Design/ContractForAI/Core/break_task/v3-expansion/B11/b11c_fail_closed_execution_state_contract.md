# Contract — B11c Fail-closed execution state

> Tầng: Lõi. Nguồn: V3 Post-implementation Review F11-03, F11-05, D36. Phụ thuộc: B11a, B11b.

## 1. Micro-task target

Khoá state machine theo validated snapshot để state thiếu/hỏng/stale không mở quyền viết, repair không nhảy task, và thay đổi docs/plan bắt buộc validate lại.

## 2. Scope

**In scope**

- `ExecutionState` bắt buộc `validated_plan_digest`, `validated_docs_digest`, `validation_result_digest` và `active_task: string | null`; `loadExecutionState` parse schema và báo lỗi typed, không trả `null`/object thô.
- `assertValidatedSnapshot({ docs, plan, state })` canonical-hash input. Mismatch hoặc file thiếu chuyển outcome `blocked` với `state-missing`, `state-invalid` hoặc `snapshot-stale`; caller không được infer pass.
- `startTask` chỉ hợp lệ ở `ready-to-execute`, `active_task === null`, task runnable và snapshot hợp lệ. `repairTask` là transition riêng; `repairing` không được gọi `startTask` cho task khác.
- Chỉ `runTaskVerification` B11b được chuyển `verifying` sang completed/next; failed evidence giữ active task và đưa `repairing`/`blocked` theo policy.
- State cập nhật qua atomic write, history/evidence append-only và preserving failure evidence khi resume.

**Out of scope**

- Không làm chữ ký mật mã chống người dùng có toàn quyền máy; đây là integrity guardrail, không phải security boundary.
- Không quyết định nội dung amendment; V4 B14b chịu trách nhiệm tạo plan mới hợp lệ.

## 3. Checklist

- [ ] Missing, malformed hoặc schema-invalid `execution-state.json` bị typed deny; không có `execState ? ... : true` hoặc fallback pass.
- [ ] Sửa docs 00–09, README hoặc execution plan sau validate làm snapshot stale và chặn start/verify cho tới khi validate lại.
- [ ] Không thể start task B khi A active, verifying hoặc repairing; graph runnable không phải permission bypass.
- [ ] Evidence failure còn xuất hiện sau repair/resume; success chỉ được append từ B11b runner record.
- [ ] Crash giữa write không tạo JSON nửa chừng hoặc mất evidence cũ.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/executionState.ts`, ≤160 dòng: snapshot fields, typed block code và transition constraints.
- [NEW] `src/core/validatedSnapshot.ts`, ≤160 dòng: canonical digest + `assertValidatedSnapshot`.
- [MODIFY] `src/core/advanceExecutionState.ts`, ≤180 dòng: start/repair/verify transition finite-state.
- [MODIFY] `src/core/loadExecutionState.ts` hoặc loader tương đương, ≤100 dòng: strict parse và atomic persistence helper.
- [MODIFY] `src/core/evaluateGate.ts`, ≤100 dòng: state error/stale trả deny reason, không implicit allow.
- [NEW] `src/core/validatedSnapshot.test.ts` và mở rộng `executionState` tests, ≤200 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Hash thay đổi vì thứ tự JSON | TB | Canonical serialization ổn định, test key-order không đổi digest. |
| Newbie không hiểu “stale” | TB | Reason phải nêu file thay đổi và một next command `validate`, không chỉ mã lỗi. |
| Atomic write khác biệt Windows | TB | Viết temp cùng directory rồi rename; test Windows-compatible fixture. |

## 6. Verification plan

- `npx vitest run executionState validatedSnapshot evaluateGate`
- `npm run typecheck && npm run lint && npm run build`
- Mutation E2E: xoá/corrupt state, sửa 09 sau validate, start B trong repairing và crash simulated giữa write; tất cả deny/restore đúng, không mở task trái phép.

## 7. Status

WAITING_FOR_APPROVAL
