# B2c — Canonical workspace path matcher contract

## 1. Micro-task target

Thay glob regex tự chế bằng một matcher dùng chung, segment-aware và chống traversal/symlink escape cho gates, allowed_paths, ownership và manifests.

## 2. Scope

### In scope

- Canonical hóa path Windows/POSIX.
- Workspace containment, case policy, symlink/junction handling.
- Semantics cho literal, single-star và double-star.

### Out of scope

- Gate evidence semantics; thuộc B2d.
- Command parsing; thuộc B2b.

## 3. Implementation checklist

- [x] Chuẩn nội bộ là workspace-relative path dùng slash; reject absolute path ngoài root, UNC/device path không được phép và traversal còn dư.
- [x] Resolve real parent/target khi tồn tại để chặn symlink/junction escape; path mới kiểm parent realpath.
- [x] Chốt case sensitivity theo filesystem/platform, không lowercase vô điều kiện.
- [x] Literal dấu chấm, ngoặc, cộng, caret và metachar không được biến thành regex.
- [x] Single-star match trong một segment; double-star match zero-or-more segments; không thay chuỗi bằng regex ad hoc.
- [x] Directory rule phải explicit; docs/foo không tự match docs/foobar.
- [x] Cùng module được dùng bởi evaluatePreAction, evaluateGate, artifact ownership, slots containment và emit manifest.
- [x] API trả canonical path hoặc typed rejection; caller không tự normalize lại.
- [x] Không thêm dependency runtime mới nếu chưa cập nhật dependency contract/version/integrity.

## 4. Interfaces / Files expected to change

- [NEW] src/core/pathPolicy.ts — khoảng 130–190 dòng.
- [MODIFY] src/core/evaluatePreAction.ts — bỏ homegrown glob matcher.
- [MODIFY] src/core/evaluateGate.ts.
- [MODIFY] các loader slots/manifest liên quan.
- [NEW] src/core/pathPolicy.test.ts.

Interface đích:

- canonicalizeWorkspacePath(root, input, mode) → canonical | rejection
- matchesPathPattern(canonicalPath, validatedPattern) → boolean
- isContainedRealPath(root, target) → boolean

## 5. Risks & mitigations

- Path chưa tồn tại không realpath được: resolve nearest existing parent rồi append validated segments.
- Windows separator/case khác CI Linux: fixture cross-platform và test Windows bắt buộc.
- Double-star semantics đổi allowed_paths cũ: migrator/linter report trước khi activate.

## 6. Verification plan

- Tests cho dấu chấm/metachar, zero/many segments, sibling prefix, slash ngược, drive letter, UNC, dot-dot.
- Symlink/junction fixtures thoát workspace phải deny.
- Differential tests cùng một path/pattern cho gate, pre-action và ownership cho cùng kết quả.
- Regression cho pattern đang dùng trong execution-plan/gate-policy.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. X07 (glob matcher sai dấu chấm/metachar/double-star) trong
finding-coverage-matrix.md nay đã FIXED (`pathPolicy.ts` `escapeRegExpExceptStar`) và UNC/device
path deny đã thêm (14d380a). R06 (sibling-prefix qua `startsWith`) vẫn OPEN.

Cập nhật 2026-08-06 (A1-P7 continuation, đối chiếu lại checklist §3 với code thật):

- **R06 note lỗi thời** — R06 thực ra đã FIXED từ A1-P4 (2026-08-03, `isWithinRootBoundary` dùng
  segment-boundary check thay `startsWith` trần — xem `finding-coverage-matrix.md` R06); ghi chú "vẫn
  OPEN" ở trên chỉ chưa được cập nhật theo commit đó.
- **Item 7 (cùng module dùng chung)** — đối chiếu thật: `preAction/guards.ts`, `gateSnapshot.ts`,
  `loadSlotsFile.ts`, `loadQuestionSlots.ts`, `commandPolicies/gitReadOnly.ts` đều import
  `canonicalizeWorkspacePath`/`isContainedRealPath` từ `pathPolicy.ts` — đúng thiết kế. Phát hiện 1 gap
  thật: `artifactOwnership.ts` có một hàm `normalizePath` **trùng y hệt** `pathPolicy.ts`'s
  `normalizeDrive` (copy-paste, không import) — đã hợp nhất: `artifactOwnership.ts` giờ
  `export const normalizePath = normalizeDrive` (re-export, không đổi call site nào khác trong hay
  ngoài file). `emitTransactionStage.ts` cũng có một hàm tên `normalizePath` nhưng semantics khác hẳn
  (prefix bare doc name bằng `docs/`, không phải path-security canonicalization) — không phải trùng
  lặp thật, không đổi.
- Các mục còn lại (traversal/UNC/device reject, symlink/junction realpath, case sensitivity không
  lowercase vô điều kiện, metachar escape, single/double-star semantics, directory-rule explicit
  không prefix-match, typed rejection API, không thêm dependency) đối chiếu đúng với
  `pathPolicy.ts`/`pathPolicy.test.ts` (17 test, gồm sibling-prefix escape và double-star zero-segment
  case theo R06) — đã đúng từ trước, chỉ chưa tick.

Checklist §3 đủ 9/9. Implementation → `IMPLEMENTED`.
