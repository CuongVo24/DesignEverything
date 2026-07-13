# Contract — B11a Canonical runtime plan validator

> Tầng: Lõi. Nguồn: V3 Post-implementation Review F11-01, D36. Phụ thuộc: không có.

## 1. Micro-task target

Để validator đọc và chấm trực tiếp một `ExecutionPlanV3` canonical, bao gồm docs 09, graph task, Must→flow→task và risk, thay vì convert sang legacy plan.

## 2. Scope

**In scope**

- Thay public input legacy bằng `validateExecutionPlan(input: { answers, emitted_docs, shape, execution_plan: ExecutionPlanV3 }): PlanValidationResult`; adapter không tự map lại task/flow.
- `ExecutionPlanV3` có các field bắt buộc: `metadata`, `trace_links`, `risks`, `milestones`, `tasks`. `trace_links` là `Array<{ must_id: string; flow_id: string; task_ids: string[] }>`; mỗi task id phải tồn tại.
- Validate deterministic: bộ docs gồm 00–06, release doc đúng shape, 08, **09**, README và JSON runtime; README phải liệt kê 09; mỗi Must có một flow và task; Won't không có task MVP; risk `assumption`/`spike-required` phải có task spike phù hợp chạy trước task phụ thuộc.
- Validate graph: task/milestone id duy nhất, mỗi task thuộc đúng một milestone, dependency tồn tại, acyclic, precondition/command/path không rỗng và command/path có source capability hoặc task discovery chứng minh.
- `risk-unresolved`, missing 09, trace sai, graph sai và plan schema sai là `error`; `pass` chỉ khi không còn error. Xoá converter V3→legacy khỏi đường `validate` của CLI.

**Out of scope**

- Không thực thi command hay ghi evidence; B11b chịu trách nhiệm đó.
- Không suy luận stack mới từ folder; B11d/V4 B13 xử lý discovery/profile.
- Không đổi prose template ngoài anchor/error remediation cần thiết.

## 3. Checklist

- [ ] Chỉ còn một schema runtime kế hoạch được CLI, validator và state import; legacy schema bị xoá hoặc internal-only, không nhận tại public boundary.
- [ ] 09-execution-plan và execution-plan.json thiếu, sai digest hoặc README không liệt kê đều fail có `source`/remediation cụ thể.
- [ ] Mutation Must không có flow, flow không có task, task không tồn tại, dependency cycle và risk không có spike đều fail bằng error code ổn định.
- [ ] Một plan V3 hợp lệ đi qua đúng CLI `validate` không có conversion/fuzzy mapping theo `intent.includes`.
- [ ] Validator unit test dùng fixture emitted thật, không chỉ hand-written legacy payload.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/executionPlan.ts`, ≤200 dòng thay đổi: thêm `TraceLink`, risk-to-task reference và graph invariant schemas.
- [MODIFY] `src/core/schemas/planValidation.ts`, ≤160 dòng: `PlanValidationInput`, `ValidationIssueCode`, bỏ `ExecutionPlan` legacy public input.
- [MODIFY] `src/core/validatePlan.ts`, ≤200 dòng: `validateExecutionPlan` và deterministic graph/trace/doc rules.
- [MODIFY] `src/core/index.ts`, `src/core/schemas/index.ts`, ≤60 dòng: chỉ export canonical names.
- [MODIFY] `adapter/claude-code/cli.mjs`, ≤100 dòng: bỏ `convertV3PlanToLegacy`, parse schema trước khi validate.
- [MODIFY] `src/core/validatePlan.test.ts` và `test/fixtures/plan-validation/*`, ≤200 dòng/file: fixtures V3 emitted + mutation cases.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Migration làm vỡ adapter đang dùng legacy object | Cao | Search mọi import/call site; CLI chỉ tạo `ExecutionPlanV3`, test compile + CLI validate fixture. |
| Trace fields khiến emitter chưa kịp sinh | Cao | B11d phụ thuộc schema này; missing field fail rõ, không fallback fuzzy. |
| Validator quá chặt chặn plan discovery hợp lệ | TB | Cho phép command/path khi task discovery/capability evidence chỉ rõ source; fixture cho folder trống. |

## 6. Verification plan

- `npx vitest run validatePlan`
- `npm run typecheck && npm run lint && npm run build`
- E2E fixture: chạy `emit` rồi CLI `validate`; lần lượt mutation missing 09, README stale, missing flow link, cycle và unresolved risk đều exit non-zero với đúng code.
- `rg "convertV3PlanToLegacy|scopeMapped" adapter/claude-code src/core` chỉ còn kết quả được giải thích trong test migration, không còn runtime validate path.

## 7. Status

WAITING_FOR_APPROVAL
