# Contract — B14a Newbie next-step experience

> Tầng: Adapter. Nguồn: V4-NewbieExpansionPlan B14a, D39. Phụ thuộc: B12b, B13b.

## 1. Micro-task target

Hiển thị cùng một “việc tiếp theo” ngắn, có lý do, proof và cách recover trong Claude/Codex build workflow để newbie không phải đọc execution JSON.

## 2. Scope

**In scope**

- Tạo adapter renderer `renderNextStep(plan, state, profile, capability)` cho states `needs-profile`, `needs-validation`, `ready`, `executing`, `verifying`, `repairing`, `blocked`, `complete`.
- Card bắt buộc có: `Now` (một task/action), `Why now` (dependency/risk/Must), `Allowed scope`, `Proof`, `If it fails`, `Enforcement` (hard/soft/unsupported) và tối đa một command/action tiếp theo.
- Claude build skill và Codex build skill cùng gọi renderer/protocol, deep/fast chỉ thay explanation length; không thay task/verification discipline.
- Failure output được rút gọn/redact, liên kết artifact evidence local và đưa tối đa ba remediation an toàn: retry verified command, repair active task, propose amendment.
- Unsupported/untrusted hook hiển thị warning ngay card thay vì chỉ trong installation docs.

**Out of scope**

- Không build web dashboard, chat UI mới, autonomous retry loop hay auto-accept amendment.
- Không tự giải thích error của mọi framework; chỉ render reason/evidence đã có từ core.

## 3. Checklist

- [ ] Mỗi state có exact next action, không có card mơ hồ kiểu “continue coding”.
- [ ] Card executing cho biết allowed paths và exact proof command, failure card giữ task id cũ và evidence pointer.
- [ ] Codex/Claude output snapshot cùng semantic fields; UI wording có thể khác nhưng enforcement level không khác.
- [ ] Deep/fast render cùng task id, command id, reason code; test asserts no safety omission in fast.
- [ ] Newbie walkthrough fixture hoàn thành preflight hoặc dừng blocked biết chính xác cần trả lời/chạy gì tiếp mà không mở JSON.

## 4. Interfaces / Files expected to change

- [NEW] `src/adapters/shared/renderNextStep.ts`, ≤200 dòng: pure renderer/view model with redaction.
- [MODIFY] `adapter/claude-code/skill/build/SKILL.md`, ≤120 dòng and Claude CLI presentation, ≤100 dòng.
- [MODIFY] `adapter/codex-plugin/skills/design-everything-build/SKILL.md`, ≤120 dòng and hook/status presentation, ≤100 dòng.
- [NEW] `src/adapters/shared/renderNextStep.test.ts`, ≤200 dòng: state/capability/deep-fast snapshots.
- [MODIFY] quickstart/adapter docs, ≤100 dòng: screenshot-free textual walkthrough only.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| UX wording hides a real block | Cao | Render reason code/enforcement visibly; never transform deny to generic encouragement. |
| Too much detail overwhelms user | TB | One primary action + expandable deep explanation, no JSON default. |
| Adapter text drifts | TB | Shared view model and semantic snapshot tests. |

## 6. Verification plan

- `npx vitest run renderNextStep`
- `npm run typecheck && npm run lint && npm run build`
- Scripted Claude/Codex walkthrough across all states; reviewer verifies one next action, proof and recovery remain accurate against live plan/state fixture.

## 7. Status

WAITING_FOR_APPROVAL
