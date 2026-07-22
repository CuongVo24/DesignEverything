# B4a — Claude hook fail-closed policy integration contract

## 1. Micro-task target

Nối SessionStart/UserPromptSubmit/PreToolUse vào các Core contract mới, bỏ mọi blanket allow và bảo đảm installed target mất/hỏng state vẫn deny có recovery.

## 2. Scope

### In scope

- Claude hook event mapping và protocol response.
- Core health/ownership/command/path/gate/blocked/handoff integration.
- Capability issue ở UserPromptSubmit.

### Out of scope

- Command parser implementation; thuộc B2b.
- Wrapper exact CLI detection; thuộc B4b.
- Installer layout; thuộc B4d.

## 3. Implementation checklist

- [ ] SessionStart load install manifest, recover pending transactions, migrate explicit rồi inspect health trước inject.
- [ ] UserPromptSubmit issue capability B1a cho đúng current question; không stamp answered length như delayed enforcement.
- [ ] PreToolUse canonicalize mọi target/cwd rồi gọi duy nhất Core policy snapshot; adapter không hardcode Design/docs allow.
- [ ] Installed + missing/corrupt state/plan/policy/manifest là deny ngoại trừ read-only diagnostics và exact recovery action.
- [ ] Direct mutation engine-state/policy/managed-output deny theo B2a ở mọi interview phase.
- [ ] Code action trước ready-to-execute deny; không có nhánh skip validation khi execution-state null.
- [ ] blocked remediation allow theo B1d, không deny-all và không mở-write-all.
- [ ] Shell payload đi qua B2b; unknown deny.
- [ ] Hook response có stable reason_code, message, next_command và không lộ token/path secret.
- [ ] Uninstalled target thật sự vẫn uninvolved, không cản project ngoài scope.
- [ ] Tách evaluatePreAction hiện đang phình lớn thành orchestrator dưới 200 dòng và các policy module B2; adapter không tái gom logic vào một file.

## 4. Interfaces / Files expected to change

- [MODIFY] src/adapters/claude/sessionStart.ts.
- [MODIFY] src/adapters/claude/userPromptSubmit.ts.
- [MODIFY] src/adapters/claude/preToolUse.ts — rút adapter xuống thin mapping.
- [MODIFY] src/adapters/claude/*.test.ts.
- [MODIFY] Design/Adapters/claude-code.md.

Interface đích:

- Hook handlers chỉ parse host input → build Core request → serialize Core decision.
- Không handler nào tự mutate state ngoài gọi transaction/recovery API Core.

## 5. Risks & mitigations

- Hook timeout do health/hash: bounded snapshot và manifest hashes; correctness vẫn ưu tiên fail-closed.
- Claude protocol version đổi: fixture protocol theo version và unknown field tolerant, required field strict.
- Message loop khi recovery: next_command lấy Core health, post-command recheck.

## 6. Verification plan

- Unit adapter mapping cho allow/deny/recovery/capability response.
- Regression direct Write progress/answers/policy/docs managed bị deny trong interview.
- Missing execution-state ở docs-emitted/ready-for-validation đều deny code.
- Validation repair path allow nhưng source code vẫn deny.
- Uninstalled temp project không manifest trả allow uninvolved.

## 7. Status

WAITING_FOR_APPROVAL
