# Contract — B7a Semantic plan validator + gate plan-validated

> Tầng: Lõi. Nguồn: V3-ExecutionExpansionPlan B7a, D29, D35. Phụ thuộc: không có.

## 1. Micro-task target
Tạo contract máy-đọc được để chấm bộ docs và execution plan trước khi code: file tồn tại là điều kiện cần, semantic validation và traceability mới là điều kiện đủ để mở plan-validated.

## 2. Scope

**In scope**

- Định nghĩa PlanValidationResult gồm status pass/fail, issues, checked_at và evidence references.
- Định nghĩa issue có id ổn định, severity error/warning, source file/anchor, message và remediation.
- Rule deterministic: đúng release doc theo shape; README liệt kê đúng file thật; mỗi Must có flow, milestone/task, acceptance check; Won't không bị task MVP tham chiếu; command/path chỉ được dùng khi có task scaffold hoặc precondition chứng minh; risk chưa xác nhận không mở implementation.
- LLM critic chỉ tạo warning có dẫn chứng; không được tự cấp pass.

**Out of scope**

- Không viết một model judge hay chấm chất lượng văn phong chủ quan.
- Không sửa template, state hay hook trong contract này.

## 3. Checklist

- [ ] Có schema public PlanValidationResult và ValidationIssue trong Core Schemas.
- [ ] Có error code cố định cho branch/readme/traceability/phantom-command/scope-leak/risk-unresolved.
- [ ] Validator nhận answers, emitted docs, shape và execution plan; không parse Markdown tùy tiện để đoán business meaning.
- [ ] pass chỉ khi không còn error; warning phải hiện cho user trước khi xác nhận.
- [ ] Gate plan-validated cần validator pass và risk acknowledgement, không chỉ requires_docs.

## 4. Interfaces / Files expected to change

- [NEW] src/core/schemas/planValidation.ts, khoảng 120 dòng: interfaces và zod schemas.
- [NEW] src/core/validatePlan.ts, khoảng 200 dòng: validatePlan(input): PlanValidationResult.
- [MODIFY] src/core/schemas/index.ts và src/core/index.ts: export public interfaces/functions.
- [MODIFY] Design/Core/Schemas/gate-policy.md và gate-policy.yaml theo B8a, chỉ sau khi schema B7a được duyệt.
- [NEW] src/core/validatePlan.test.ts: fixture pass/fail cho từng error code.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Validator trở thành LLM chấm cảm tính | Cao | Chỉ pass bằng invariant deterministic; critic chỉ warning có evidence. |
| Rule quá chặt chặn dự án hợp lệ | TB | Error code có remediation rõ, fixture cho mỗi shape và escape hatch xác nhận có audit. |
| Chỉ đọc docs rồi bỏ quên plan JSON | Cao | Input bắt buộc cả docs + execution plan; thiếu một bên là error. |

## 6. Verification plan

- npx vitest run validatePlan
- npm run typecheck && npm run lint
- Mutation test: thiếu 07 đúng shape, README sai, Must không có task, Won't bị task tham chiếu, command ảo, risk unresolved đều fail với đúng error code.

## 7. Status

WAITING_FOR_APPROVAL
