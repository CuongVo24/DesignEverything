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

- [ ] Chuẩn nội bộ là workspace-relative path dùng slash; reject absolute path ngoài root, UNC/device path không được phép và traversal còn dư.
- [ ] Resolve real parent/target khi tồn tại để chặn symlink/junction escape; path mới kiểm parent realpath.
- [ ] Chốt case sensitivity theo filesystem/platform, không lowercase vô điều kiện.
- [ ] Literal dấu chấm, ngoặc, cộng, caret và metachar không được biến thành regex.
- [ ] Single-star match trong một segment; double-star match zero-or-more segments; không thay chuỗi bằng regex ad hoc.
- [ ] Directory rule phải explicit; docs/foo không tự match docs/foobar.
- [ ] Cùng module được dùng bởi evaluatePreAction, evaluateGate, artifact ownership, slots containment và emit manifest.
- [ ] API trả canonical path hoặc typed rejection; caller không tự normalize lại.
- [ ] Không thêm dependency runtime mới nếu chưa cập nhật dependency contract/version/integrity.

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

WAITING_FOR_APPROVAL
