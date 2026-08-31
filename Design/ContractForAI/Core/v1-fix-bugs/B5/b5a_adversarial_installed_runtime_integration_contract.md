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

- [x] Harness build package once, install vào temp path có space/unicode và không dùng source cwd sau install.
- [x] Feed SessionStart/UserPromptSubmit/PreToolUse payload đúng protocol rồi spawn CLI target-local.
- [x] Case TURN token forged/replay/concurrent/wrong-session/wrong-question.
- [x] Case direct write/delete/rename progress, answers, policy, script, manifests và managed docs.
- [x] Case command bypass: git clean/restore/branch -D, find -delete/-exec, chaining, redirection, nested PowerShell/cmd và string chứa cli.mjs.
- [x] Case missing/corrupt state/plan/profile/policy/install manifest asset; installed target phải fail closed.
- [x] Case docs/archive duplicate basename, empty/symlink/digest-stale artifact và gate revocation.
- [x] Case docs-emitted/ready-for-validation/plan-validating đều deny code; ready-to-execute + exact active path mới allow.
- [x] Case blocked kind transitions và remediation scope.
- [x] Case slots outside workspace/unknown key/overwrite raw answer.
- [x] Case deepen asset, phase, capability và Claude/Codex parity.
- [x] Test teardown chỉ xóa exact temp root đã validate.

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
- Coverage report liệt kê U01–U08, X01–X24 và R01–R20; finding thuộc release 7.0.0 không có test id làm suite fail. R21 thuộc B14b/v4-expansion và chỉ được theo dõi như dependency ngoài lane, không dùng để che thiếu coverage của B1–B5.
- Existing unit/e2e suite vẫn xanh sau installed-runtime suite.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

**Nâng đáng kể 2026-08-10, chưa VERIFIED — còn 2 gap thật, không phải overclaim.** §7 bản 2026-07-25
phía trên đã lỗi thời — hai lý do nó nêu để chặn đã hết:
(1) "test spawn từ REPO_ROOT" — sai với thực tế hiện tại: mọi file dưới
`test/integration/installed-runtime/` install vào `os.tmpdir()` qua `install.mjs` thật rồi spawn
`hooks/*.mjs`/`cli.mjs` **target-local** (xác nhận bằng đọc trực tiếp code, không tin lại văn bản cũ);
(2) "9 test ID MISMAPPED" — matrix header (2026-07-30) đã ghi nhận xử lý xong, và
`node scripts/check-matrix.mjs` (lint tự động cấm `MISMAPPED` còn sót) chạy sạch tại thời điểm đóng.

**Bằng chứng đóng (chạy lại 2026-08-10, không tin nguyên văn):**
```
npx vitest run test/integration/installed-runtime
→ 15 file, 76 test, tất cả pass — cài thật, spawn tiến trình thật, đủ SessionStart/UserPromptSubmit/
  PreToolUse/CLI, đủ case forged/replay/corrupt-state/command-bypass/docs-archive/deepen-parity đã liệt
  kê ở checklist §3
```
Bổ sung 1 file mới trong đợt đóng này: `phase-authorization-matrix.test.ts` (U04/R04) — khoả lấp đúng
lỗ hổng "test tên docs-emitted lại seed phase: interview" mà `finding-coverage-matrix.md` từng ghi.

**Coverage report (§6):** `finding-coverage-matrix.md` + `check-matrix.mjs` đóng vai trò coverage
report cơ giới — mọi ID U01–U08/X01–X24/R01–R20 xuất hiện đúng một lần, không ID nào rỗng Status/Test
ID/Evidence, không path evidence nào trỏ file không tồn tại; R21 loại khỏi mẫu số đúng như §6 yêu cầu.
Positive control (§6 "≥1 positive control mỗi allowed action"): xác nhận có ở `hook-adversarial.test.ts`
("Execution gate — should ALLOW..."), `phase-authorization-matrix.test.ts` (3 positive control), và các
file cài-thật khác đã có case allow tương ứng case deny.

**2 gap thật còn lại trước khi nói VERIFIED (không phải INVALID_FOR_CLAIM nữa — bằng chứng thật đã đủ
lớn, chỉ chưa trọn), ghi rõ để không lẫn với "đã xong":**

1. **X09 exit-class chưa đủ.** `cli-health.test.ts` chỉ spawn `validate` để đo exit code; 4 lớp còn lại
   trong bảng exit-class §6 của B4c (usage/health/conflict/internal) chưa có case spawn riêng. Xem
   `finding-coverage-matrix.md` dòng X09, vẫn `SEAM_PARTIAL`.
2. **X23 ack-capability chưa có coverage installed.** `ackCapability.ts` (mới, Wave A1 2026-08-09) —
   single-use qua tạo file độc quyền — mới có `UNIT_ONLY`, chưa test nào phát/tiêu token qua hai tiến
   trình cài thật khác nhau.
3. **Codex package target không chạy lại toàn bộ ma trận adversarial** (command bypass, corrupt state)
   — chỉ có `codex-parity`/`codex-pre-tool-use`/`codex-post-tool-use`. Rủi ro thấp vì Core dùng chung
   với Claude, nhưng ghi nhận thay vì im lặng.

**Vì sao vẫn không hạ về `INVALID_FOR_CLAIM`:** nhãn đó nghĩa là "evidence sai seam hoặc không map
đúng finding" — không còn đúng cho phần lớn của bộ test này nữa (76/76 test pass trên installed target
thật, ID map đúng, không MISMAPPED). `SEAM_PARTIAL` mô tả đúng thực tế: bằng chứng thật, chưa trọn vẹn.
Đóng nốt lên `VERIFIED` là việc còn lại của B5a, không phải việc mới — 2 mục trên là toàn bộ phạm vi
còn thiếu.
