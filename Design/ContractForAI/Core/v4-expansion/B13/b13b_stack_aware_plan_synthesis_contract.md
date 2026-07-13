# Contract — B13b Stack-aware plan synthesis

> Tầng: Lõi. Nguồn: V4-NewbieExpansionPlan B13b, D38. Phụ thuộc: B12a, B13a.

## 1. Micro-task target

Sinh `ExecutionPlanV3` scaffold/verify có thể chạy từ `ProjectProfile.confirmed`, với exact paths, argv commands và evidence phù hợp stack thay vì default generic.

## 2. Scope

**In scope**

- `synthesizeExecutionPlan({ answers, profile, docs })` chỉ nhận profile confirmed/supported; profile khác trả blocked plan với next question, không sinh implementation command.
- Mỗi supported profile có recipe dữ liệu versioned: manifest/config/source paths được tạo, command `argv` không shell, expected artifact và capability references. Recipe initial: Node CLI npm/pnpm, Vite Web npm/pnpm, Python CLI venv/pip.
- Task T0 preflight kiểm runtime/profile; T1 scaffold được phép tạo manifest/config/source paths recipe nêu; T2 walking skeleton; T3 verify. Dependency/risk/Must-flow trace giữ đúng B11a semantics.
- Command chỉ xuất hiện nếu executable/runtime/profile declaration chứng minh; package install hoặc network action phải có `requires_user_confirmation: true` và không auto-run.
- 09 prose render từ JSON recipe/task ids để không drift allowed paths, proof hay blocked condition.

**Out of scope**

- Không sinh arbitrary framework recipe, mobile, cloud deploy, database provisioning hay auth vendor.
- Không tự chạy package install; user approval/execution runner policy vẫn bắt buộc.

## 3. Checklist

- [ ] Empty Node CLI/Vite/Python profiles generate distinct plan with manifest/config/source scope đủ để commands sau đó tồn tại.
- [ ] No recipe emits Node/npm command for Python, or source glob/package script before relevant scaffold task creates it.
- [ ] Every command is `VerificationCommand.argv`, has capability id and expected machine assertion; no free-form shell string.
- [ ] Every task carries Must/flow/risk trace and valid dependency graph; B11a validates emitted plan unchanged.
- [ ] Snapshot semantic test asserts 09 and JSON task/path/command ids identical for each profile.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/stackRecipes.ts`, ≤200 dòng: versioned recipe descriptors for three initial profiles.
- [NEW] `src/core/synthesizeExecutionPlan.ts`, ≤200 dòng: profile → canonical plan and trace links.
- [MODIFY] `src/core/emit.ts`, ≤160 dòng: call synthesis only after profile; no generic generator.
- [MODIFY] `src/core/schemas/executionPlan.ts`, ≤100 dòng: recipe/capability/user-confirmation fields.
- [MODIFY] `Design/Content/doc-templates/09-execution-plan.md`, ≤120 dòng: JSON-derived rendering fields.
- [NEW] `src/core/synthesizeExecutionPlan.test.ts` and profile fixtures, ≤200 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Recipe is stale for a tool version | TB | Version recipe + profile evidence, clear unsupported rather than silent best guess. |
| `npm install` hides network side effect | Cao | Mark external action, require explicit confirmation and runner displays it. |
| Template/JSON drift again | Cao | One synthesis source + semantic snapshot test. |

## 6. Verification plan

- `npx vitest run synthesizeExecutionPlan emitTree validatePlan`
- `npm run typecheck && npm run lint && npm run build`
- Clean-workspace E2E for three profiles: doctor → confirm → emit → validate → T0/T1 allowed scope; assert no phantom command and no network command auto-runs.

## 7. Status

WAITING_FOR_APPROVAL
