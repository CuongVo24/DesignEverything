# Contract — B12b Codex PreToolUse adapter

> Tầng: Adapter. Nguồn: V4-NewbieExpansionPlan B12b, D37. Phụ thuộc: B12a. Capability source: [Codex Hooks](https://learn.chatgpt.com/docs/hooks).

## 1. Micro-task target

Đóng gói adapter Codex dùng `PreToolUse`/`PostToolUse` và build skill để gọi `PreActionGate`, deny đúng tool path được hỗ trợ và công bố giới hạn enforcement thật.

## 2. Scope

**In scope**

- Tạo plugin Codex repo-local tại `adapter/codex-plugin/` gồm manifest, `hooks/hooks.json`, command hook scripts và skill `/build`; installer chỉ cài/enable bundle, không tự trust hook hoặc truyền `--dangerously-bypass-hook-trust`.
- `PreToolUse` matcher cho `Bash` và `apply_patch` (`Edit|Write` alias); normalize `tool_input.command` thành B12a request, trả JSON `permissionDecision: "deny"` với `permissionDecisionReason` khi core deny.
- `PostToolUse` cho `Bash`/`apply_patch` ghi audit event tối thiểu và khi phát hiện unexpected changed path thì block execution state cho action tiếp theo; không tự đánh dấu verification pass.
- Build skill chỉ gọi core CLI `validate`, `status`, `next`, `start`, `verify`, `repair`/amend; hiển thị capability card: hard coverage `Bash`, `apply_patch`, matched MCP; known gaps gồm tool paths PreToolUse không intercept.
- `PermissionRequest` chỉ áp policy approval khi Codex yêu cầu approval; không được coi nó là interceptor tổng quát.

**Out of scope**

- Không claim Codex PreToolUse là complete sandbox. Official docs nói hook chỉ intercept một tập Bash/apply_patch/MCP và có đường tool tương đương khác.
- Không hỗ trợ cloud/IDE/desktop-specific behavior chưa được replay trên surface đó; initial support target là Codex CLI/desktop local runtime mà plugin hook được trust.
- Không cài managed enterprise hook hoặc sửa global `~/.codex` tự động.

## 3. Checklist

- [ ] Plugin manifest + hooks JSON dùng event names chính xác `PreToolUse`, `PostToolUse`, `PermissionRequest`, `SessionStart`; command Windows override chạy được.
- [ ] PreToolUse deny `Bash` mutation, `apply_patch` path outside task, stale/missing state và unregistered command; allow exact active task action.
- [ ] Hook input/output fixtures dùng official JSON fields `tool_name`, `tool_use_id`, `tool_input`, `cwd`, `session_id`; deny output dùng `hookSpecificOutput.permissionDecision`.
- [ ] Skill và status nói rõ coverage/gaps; khi hook chưa trusted hoặc features hooks off, workflow hạ thành soft và yêu cầu user review `/hooks`.
- [ ] Plugin test không dùng bypass-hook-trust, không ghi global config và không cần token/network.

## 4. Interfaces / Files expected to change

- [NEW] `adapter/codex-plugin/.codex-plugin/plugin.json`, ≤80 dòng: manifest + hook path.
- [NEW] `adapter/codex-plugin/hooks/hooks.json`, ≤120 dòng: matchers/status messages/Windows command override.
- [NEW] `adapter/codex-plugin/hooks/pre-tool-use.mjs`, `post-tool-use.mjs`, `permission-request.mjs`, ≤200 dòng/file: stdin JSON → B12a CLI/core → valid hook JSON.
- [NEW] `adapter/codex-plugin/skills/design-everything-build/SKILL.md`, ≤180 dòng: validate/status/next/verify/repair flow + capability card.
- [NEW] `adapter/codex-plugin/install.mjs`, ≤180 dòng: local install/inspection instructions without trust bypass.
- [NEW] `src/adapters/codex/preToolUse.test.ts` và `adapter/codex-plugin/hooks/*.fixture.json`, ≤200 dòng/file.
- [MODIFY] README/adapter matrix/ConformanceMatrix surfaces, ≤100 dòng: supported surface and limitation wording.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Hook payload/API changes | Cao | Pin fixture against current official docs, include capability version and fail safe on unknown payload. |
| User has not trusted project hook | Cao | Status explicitly reports soft/disabled; install never bypasses trust. |
| Tool route outside PreToolUse changes source | Cao | Document gap, PostToolUse audit, runner evidence and replay; never claim total prevention. |

## 6. Verification plan

- `npx vitest run preToolUse` for Codex adapter plus `npm run typecheck && npm run lint && npm run build`
- Codex local smoke: install plugin → inspect/trust hook through `/hooks` → folder fixture `validate → start → allowed apply_patch → verify`; assert deny for Bash write/out-of-scope apply_patch/stale state.
- Repeat with hooks disabled/untrusted: capability card must say soft/disabled, not hard; no test uses `--dangerously-bypass-hook-trust`.

## 7. Status

WAITING_FOR_APPROVAL
