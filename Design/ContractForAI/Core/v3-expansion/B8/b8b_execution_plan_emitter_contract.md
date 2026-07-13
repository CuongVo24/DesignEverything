# Contract — B8b Emit 09-execution-plan và task graph máy đọc

> Tầng: Lõi. Nguồn: V3-ExecutionExpansionPlan B8b, D30-D32, D35. Phụ thuộc: B7a, B7b, B8a.

## 1. Micro-task target
Emit cùng lúc 09-execution-plan.md cho người đọc và .design-everything/execution-plan.json cho runtime, biến Must/flow/risk đã xác nhận thành graph task nhỏ có precondition, allowed paths, verification và evidence requirement.

## 2. Scope

**In scope**

- Thêm 09 vào emit tree cho mọi shape và update README file map/reading order theo shape thật.
- execution-plan.json có metadata, trace links, risks, milestones và TaskCard.
- TaskCard bắt buộc: id, type spike/scaffold/implementation/verification, milestone, intent, depends_on, allowed_paths, preconditions, commands, expected_result, evidence_required, failure_policy.
- Task đầu tiên là preflight hoặc feasibility spike khi dependency/risk chưa confirmed; implementation không được đi trước nó.
- Chỉ sinh command khi command là precondition đã xác nhận hoặc task scaffold đã định nghĩa nó; nếu chưa biết, ghi expected discovery thay vì lệnh giả.

**Out of scope**

- Không chạy task, không sửa source dự án đích.
- Không để skill tự viết prose 09 không qua JSON/validator.

## 3. Checklist

- [ ] emitTree trả đúng taxonomy mới và update emitted_docs.
- [ ] Mỗi Must có ít nhất một TaskCard; mỗi TaskCard truy về flow/anchor/risk nếu áp dụng.
- [ ] Won't không có TaskCard MVP.
- [ ] Plan có exactly one first runnable task và graph không cycle.
- [ ] README không nói 07-deployment/release cho shape cli và không hardcode run command chưa scaffold.

## 4. Interfaces / Files expected to change

- [NEW] src/core/schemas/executionPlan.ts, khoảng 180 dòng.
- [MODIFY] src/core/emit.ts và emit tests, khoảng 200 dòng.
- [MODIFY] adapter/claude-code/cli.mjs: emit/validate ghi plan JSON đúng thư mục.
- [NEW] Design/Content/doc-templates/09-execution-plan.md và golden 09 cho web/mobile/cli.
- [MODIFY] README template, taxonomy, QualityRubric và output fixtures.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| LLM sinh task lớn và mơ hồ | Cao | JSON schema bắt field cụ thể; validator giới hạn one active task và traceability. |
| Command generic gây lừa newbie | Cao | Chỉ emit command đã có precondition/scaffold proof; otherwise discovery task. |
| Golden cũ che lỗi README theo shape | TB | Golden assert file list, reading order và absence của phantom command. |

## 6. Verification plan

- npx vitest run emit executionPlan
- npm test && npm run typecheck && npm run lint
- Golden web/mobile/cli assert 09, shape-specific 07, task traceability và first spike của fixture rủi ro.

## 7. Status

WAITING_FOR_APPROVAL
