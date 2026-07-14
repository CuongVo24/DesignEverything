# Contract — B12a PreActionGate core

> Tầng: Lõi. Nguồn: V4-NewbieExpansionPlan B12a, D37. Phụ thuộc: B11f.

## 1. Micro-task target

Tạo một core `PreActionGate` trung lập runtime để Claude và Codex hỏi cùng policy/state trước một action mà không copy logic theo tên tool của từng harness.

## 2. Scope

**In scope**

- Định nghĩa `PreActionRequest { runtime, tool_name, action_kind, target_paths, command_argv, workspace, session_id, plan_digest, state_digest }`; `action_kind` là `read | write | shell | mcp | external`.
- Định nghĩa `PreActionDecision { decision: "allow" | "deny" | "requires-user-confirmation", reason_code, user_message, enforcement: "hard" | "soft" | "unsupported", matched_task_id? }`.
- `evaluatePreAction(request)` dùng B11 canonical plan/state/snapshot và trả cùng reason code cho path outside scope, state invalid/stale, task inactive, command not registered, action external và read-only allow.
- Thêm `AdapterCapability { runtime, intercepts, enforcement_boundary, config_surface, known_gaps }`; adapter phải cung cấp capability trước khi gọi gate để core không giả sử mọi tool path intercept được.
- Không hardcode `Bash`, `Write`, `apply_patch`, `PreToolUse`, config TOML hay hook location vào core.

**Out of scope**

- Không cài hook/skill/plugin; Claude/Codex adapter tự chuyển input/output qua B12 gate.
- Không biến local policy thành security sandbox hoặc chặn tool mà runtime không intercept.
- Không thay đổi project profile/plan synthesis.

## 3. Checklist

- [ ] Core test cùng request semantic từ Claude/Codex cho ra decision/reason code giống nhau.
- [ ] Every deny có user_message ngắn gồm bị chặn vì gì và next action; adapter không tự chế business reason.
- [ ] Capability `unsupported` không được map thành `hard` hoặc silent allow trong public status.
- [ ] Request normalize absolute/relative/Windows path trước policy; command argv không parse qua shell string.
- [ ] Adapter-specific literals không xuất hiện trong `src/core` ngoài enum `runtime`/fixtures.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/preActionGate.ts`, ≤180 dòng: request/decision/capability Zod schemas + reason codes.
- [NEW] `src/core/evaluatePreAction.ts`, ≤200 dòng: pure policy decision over B11 state/plan snapshot.
- [MODIFY] `src/core/evaluateGate.ts`, ≤100 dòng: delegate backward-compatible gate checks to `evaluatePreAction` or deprecate clearly.
- [MODIFY] `src/core/index.ts`, `src/core/schemas/index.ts`, ≤60 dòng: exports only.
- [NEW] `src/core/evaluatePreAction.test.ts`, ≤200 dòng: shared semantic request matrix and Windows paths.
- [NEW] `Design/Core/Schemas/pre-action-gate.md`, ≤160 dòng: public semantics/capability legend.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Core abstraction quá chung, mất guard thật | Cao | Keep request fields limited to current policy; every adapter mapping has contract test. |
| Runtime không intercept action nhưng UI nói hard | Cao | Capability required and output carries enforcement; B15 replay checks public wording. |
| Duplicate old/new gate code drift | TB | One delegation path plus deprecation test; remove dead path in a follow-up only after adapters migrate. |

## 6. Verification plan

- `npx vitest run evaluatePreAction evaluateGate`
- `npm run typecheck && npm run lint && npm run build`
- Contract test matrix: valid task, missing state, stale digest, unsupported action, external action, path traversal and command mismatch across two adapter-shaped requests.

## 7. Status

WAITING_FOR_APPROVAL
