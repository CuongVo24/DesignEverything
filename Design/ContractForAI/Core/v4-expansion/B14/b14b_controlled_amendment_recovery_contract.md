# Contract — B14b Controlled amendment recovery

> Tầng: Lõi. Nguồn: V4-NewbieExpansionPlan B14b, D39. Phụ thuộc: B13b.

## 1. Micro-task target

Cho phép newbie đổi stack, dependency hoặc assumption sau failure qua amendment có diff, explicit approval, plan version mới và revalidation thay vì agent sửa JSON/plan âm thầm.

## 2. Scope

**In scope**

- Định nghĩa `PlanAmendment { id, reason_code, requested_by, proposed_changes, impact, requires_user_confirmation, status }`; reason enum giới hạn `stack-change`, `missing-capability`, `dependency-risk`, `scope-change`, `verification-failure`.
- `proposeAmendment` chỉ tính diff profile/plan/tasks/risks/commands/paths và next question; không write plan hoặc mở action.
- `approveAmendment` cần explicit user confirmation id, creates immutable plan revision/digest, preserves old evidence/history, invalidates active snapshot và bắt validate trước task mới.
- Amendment thay capability/stack quay lại B13 doctor/confirm; amendment thêm external/network action luôn `requires_user_confirmation`.
- CLI/status expose `amend propose`, `amend show`, `amend approve`; adapter B14a render proposal and approval boundary.

**Out of scope**

- Không auto-approve, merge code, discard evidence failure hay rewrite previous document history.
- Không là issue tracker/roadmap manager; chỉ changes blocking active execution plan.

## 3. Checklist

- [ ] Agent không thể sửa execution plan/state JSON để đổi command/path/risk mà không có amendment id + approved revision.
- [ ] Proposal hiển thị exact changed tasks/commands/paths/risks and impacted evidence; reject empty/no-op change.
- [ ] Approval preserves prior evidence, increments plan revision, invalidates snapshot and requires B11a validation.
- [ ] Stack/dependency amendment routes to confirmed doctor profile; user can reject and remain repairing/blocked safely.
- [ ] Tests cover missing runtime, wrong package manager, new dependency risk and scope creep.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/planAmendment.ts`, ≤160 dòng: amendment/proposal/approval schemas.
- [NEW] `src/core/planAmendment.ts`, ≤200 dòng: propose/diff/approve/revision persistence.
- [MODIFY] `src/core/schemas/executionState.ts`, `validatedSnapshot.ts`, ≤120 dòng: plan revision/history link and invalidation.
- [MODIFY] core CLI entry and `src/core/index.ts`, ≤160 dòng: amend verbs/status.
- [NEW] `src/core/planAmendment.test.ts`, ≤200 dòng: approval/version/evidence preservation mutations.
- [MODIFY] `src/adapters/shared/renderNextStep.ts`, ≤100 dòng: amendment card inputs only.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Agent turns every failure into scope expansion | Cao | Fixed reason enum, visible diff and explicit user approval. |
| Evidence history lost after revision | Cao | Immutable revision/evidence references and regression fixture. |
| Too many confirmation prompts | TB | Only semantic/external changes require approval; retry/repair stays in task flow. |

## 6. Verification plan

- `npx vitest run planAmendment validatedSnapshot executionState`
- `npm run typecheck && npm run lint && npm run build`
- E2E: verification fail → propose package-manager change → reject remains blocked; approve → old evidence preserved, validate required, new recipe opens only after profile confirmed.

## 7. Status

WAITING_FOR_APPROVAL
