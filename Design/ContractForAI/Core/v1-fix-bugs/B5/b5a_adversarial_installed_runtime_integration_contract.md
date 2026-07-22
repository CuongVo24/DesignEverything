# B5a — Adversarial installed-runtime integration contract

## 1. Micro-task target

Chứng minh các seam installer → wrapper → hook → CLI → Core trên target cài thật, bao gồm toàn bộ bypass/fail-open đã phát hiện.

## 2. Scope

### In scope

- Temporary installed targets cho Claude và package target cho Codex.
- Spawn process thật, hook stdin/stdout thật và filesystem assertions.
- Adversarial command/path/state/capability cases.

### Out of scope

- Fault injection sâu transaction; thuộc B5b.
- Subjective doc scoring; thuộc B5c.

## 3. Implementation checklist

- [ ] Harness build package once, install vào temp path có space/unicode và không dùng source cwd sau install.
- [ ] Feed SessionStart/UserPromptSubmit/PreToolUse payload đúng protocol rồi spawn CLI target-local.
- [ ] Case TURN token forged/replay/concurrent/wrong-session/wrong-question.
- [ ] Case direct write/delete/rename progress, answers, policy, script, manifests và managed docs.
- [ ] Case command bypass: git clean/restore/branch -D, find -delete/-exec, chaining, redirection, nested PowerShell/cmd và string chứa cli.mjs.
- [ ] Case missing/corrupt state/plan/profile/policy/install manifest asset; installed target phải fail closed.
- [ ] Case docs/archive duplicate basename, empty/symlink/digest-stale artifact và gate revocation.
- [ ] Case docs-emitted/ready-for-validation/plan-validating đều deny code; ready-to-execute + exact active path mới allow.
- [ ] Case blocked kind transitions và remediation scope.
- [ ] Case slots outside workspace/unknown key/overwrite raw answer.
- [ ] Case deepen asset, phase, capability và Claude/Codex parity.
- [ ] Test teardown chỉ xóa exact temp root đã validate.

## 4. Interfaces / Files expected to change

- [NEW] test/integration/installed-runtime/claude-install-flow.test.ts.
- [NEW] test/integration/installed-runtime/hook-adversarial.test.ts.
- [NEW] test/integration/installed-runtime/cli-health.test.ts.
- [NEW] test/integration/installed-runtime/codex-parity.test.ts.
- [NEW] test/fixtures/hook-protocol/ và adversarial command corpus.
- [MODIFY] Design/Conventions/TestStrategy.md.

Expected commands:

- npm run build
- npx vitest run test/integration/installed-runtime
- npm test

## 5. Risks & mitigations

- Test vô tình dùng repo runtime: đổi/ẩn source path sau install và assert process argv target-local.
- Platform flake: deterministic temp fixtures, no network, Windows CI bắt buộc và Linux parity lane.
- Security corpus regression bị xóa: map mỗi test id về finding matrix.

## 6. Verification plan

- Tất cả adversarial cases phải assert decision, reason_code, exit code, state revision và filesystem không đổi.
- Ít nhất một positive control cho mỗi allowed recovery/read-only/active-task action.
- Coverage report liệt kê U01–U04, X01–X24; finding security không có test id làm suite fail.
- Existing unit/e2e suite vẫn xanh sau installed-runtime suite.

## 7. Status

WAITING_FOR_APPROVAL
