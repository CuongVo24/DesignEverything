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

- [x] SessionStart load install manifest, recover pending transactions, migrate explicit rồi inspect health trước inject.
- [ ] UserPromptSubmit issue capability B1a cho đúng current question; không stamp answered length như delayed enforcement.
- [ ] PreToolUse canonicalize mọi target/cwd rồi gọi duy nhất Core policy snapshot; adapter không hardcode Design/docs allow.
- [ ] Installed + missing/corrupt state/plan/policy/manifest là deny ngoại trừ read-only diagnostics và exact recovery action.
- [ ] Direct mutation engine-state/policy/managed-output deny theo B2a ở mọi interview phase.
- [ ] Code action trước ready-to-execute deny; không có nhánh skip validation khi execution-state null.
- [ ] blocked remediation allow theo B1d, không deny-all và không mở-write-all.
- [ ] Shell payload đi qua B2b; unknown deny.
- [ ] Hook response có stable reason_code, message, next_command và không lộ token/path secret.
- [ ] Uninstalled target thật sự vẫn uninvolved, không cản project ngoài scope.
- [x] Tách evaluatePreAction hiện đang phình lớn thành orchestrator dưới 200 dòng và các policy module B2; adapter không tái gom logic vào một file.

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

Spec: APPROVED | Implementation: PARTIAL | Proof: SEAM_PARTIAL

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. X18 (test chưa chạy installer/wrapper/adversarial thật) nay đã CLOSED —
`hook-adversarial.test.ts`/`codex-pre-tool-use.test.ts` cài thật qua `install.mjs` trong `beforeAll`
rồi spawn hook target-local. X02 (hook allow ghi thẳng state/docs, pre-create managed docs) một
phần FIXED — direct write/edit vào progress.json/answers.json bị deny; pre-create doc tại catalog
path trước khi emit vẫn allow (finding-coverage-matrix.md X02 PARTIAL). R03/R04 vẫn OPEN.

Cập nhật 2026-08-05 (A1-P8, structural — không đổi hành vi): `evaluatePreAction.ts` (771 dòng) đã
tách thành orchestrator 115 dòng + `src/core/preAction/` (types, shared, guards, phaseInterview,
phaseInterviewGate, phaseBlocked, phasePlanValidating, phaseExecuting — mỗi file <200 dòng).
Orchestrator chỉ chạy guard phase-độc-lập (health, capability, canonical path, shell-operator scan,
load state/progress, CLI-shell authority, EXECUTION_STATE_REQUIRED gate) rồi dispatch đúng một phase
handler. Refactor behavior-preserving: 915/915 test xanh trước và sau, build + lint + typecheck sạch.
Checklist item "Tách evaluatePreAction... dưới 200 dòng" CLOSED.

Đối chiếu thêm SessionStart checklist item ("load install manifest, recover pending transactions,
migrate explicit rồi inspect health trước inject"): `onSessionStart` (`src/adapters/claude/
sessionStart.ts`) chạy đúng thứ tự `recoverEmit(tier1)` → `recoverEmit(tier2)` →
`migrateInterviewStore` → `inspectRuntimeHealth`, và `inspectRuntimeHealth` (`runtimeHealth.ts`'s
`checkInstallManifestIntegrity`) tự đọc + verify `install-manifest.json` (schema, runtime_version,
asset hash, hook wiring) như một phần của health check đó — không phải bước riêng nhưng thoả đúng thứ
tự "manifest trước inject" vì health luôn chạy trước khi `session-start.mjs` emit context. Checklist
item CLOSED. Các item còn lại của B4a (UserPromptSubmit stamp/PreToolUse mapping đầy đủ, hook response
secret-safety, uninstalled-uninvolved regression) chưa đánh giá lại có hệ thống trong lần A1-P8 này ⇒
B4a giữ PARTIAL.
