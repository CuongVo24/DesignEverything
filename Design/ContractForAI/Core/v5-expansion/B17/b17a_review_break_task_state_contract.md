# Contract — B17a Review & break-task state

> Tầng: Lõi. Nguồn: V5-ContractSynthesisPlan B17a, D45 (mở rộng D31/D36). Phụ thuộc: B16b.

## 1. Micro-task target

Thêm phase runtime `reviewing` giữa `verified` và feature kế: hợp đồng của một feature verify xong → manager-check sinh break-task nếu output bẩn; feature không "done" tới khi review đóng. Fail-closed.

## 2. Scope

**In scope**

- Mở rộng execution-state machine: `verified → reviewing → (break-task*) → feature-done → next-feature`. Cập nhật `state-schema.md` + zod.
- `reviewFeatureOutput({ featureMilestone, diff, lintResult, testResult })` → danh sách break-task (`fix_*`/`polish_*`), mỗi cái là một `Contract` nhỏ (status `WAITING_FOR_APPROVAL`) đặt trong `contracts/break/{feature}/`.
- Feature-done gate: từ chối chuyển `next-feature` khi còn break-task chưa DONE hoặc thiếu evidence review (fail-closed, D36).
- `advanceExecutionState` xử lý transition mới; evidence append-only ghi kết quả review.

**Out of scope**

- Không tự sinh nội dung fix (chỉ mô tả điểm bẩn + verification cần đạt); executor làm.
- Không multi-agent review; manager-check là một bước deterministic trên diff/lint/test.
- Không đổi ngữ nghĩa gate M0–M3 của V3.

## 3. Checklist

- [ ] State machine reject `next-feature` khi review chưa đóng hoặc break-task còn mở.
- [ ] `reviewFeatureOutput` sinh break-task khi lint/test bẩn; không sinh khi output sạch.
- [ ] Break-task có đủ 7 mục và `validateContract` pass.
- [ ] Evidence review append-only; state hỏng/thiếu → fail-closed, không tự "done".
- [ ] `state-schema.md` bump theo Versioning; ConformanceMatrix cập nhật.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/executionState.ts`, ≤120 dòng: phase `reviewing`, `feature-done`, break-task refs.
- [NEW] `src/core/reviewFeatureOutput.ts`, ≤180 dòng.
- [MODIFY] `src/core/advanceExecutionState.ts`, ≤160 dòng: transition review + feature-done gate.
- [NEW] `src/core/reviewFeatureOutput.test.ts`, `advanceExecutionState.review.test.ts`, ≤200 dòng/file.
- [MODIFY] `Design/Core/Schemas/state-schema.md`, `Design/Core/Versioning.md`, `Design/Adapters/ConformanceMatrix.md`, ≤120 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Review thành cửa cho "done giả" | Cao | Fail-closed: feature-done đòi mọi break-task DONE + evidence hợp lệ. |
| Manager-check bịa lỗi hoặc bỏ sót | TB | Chỉ dựa lint/test/diff thật; không heuristic mờ; log evidence tái kiểm được. |
| Break-task lồng vô hạn | TB | Break-task không tự đẻ break-task; vòng đóng ở feature-done. |

## 6. Verification plan

- `npx vitest run reviewFeatureOutput advanceExecutionState`
- `npm run typecheck && npm run lint && npm run build`
- E2E: feature verify với output bẩn → sinh break-task → chưa DONE thì gate chặn next-feature; fix xong + evidence → mới mở feature kế.

## 7. Status

DONE

> Đã code: phase `reviewing` + field `open_break_tasks`/`reviewed_milestones` (back-compat default) trong `schemas/executionState.ts`; `reviewFeatureOutput.ts`; transitions `transitionToReview`/`applyReviewOutcome`/`closeFeatureReview`/`assertNoUnreviewedFeature` (fail-closed) trong `advanceExecutionState.ts` + tests. typecheck/lint sạch.
