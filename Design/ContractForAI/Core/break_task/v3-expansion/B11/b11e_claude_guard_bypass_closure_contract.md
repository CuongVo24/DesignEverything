# Contract — B11e Claude guard bypass closure

> Tầng: Adapter. Nguồn: V3 Post-implementation Review F11-03, D36. Phụ thuộc: B11b, B11c, B11d.

## 1. Micro-task target

Sửa Claude Code PreToolUse để mọi write/Bash đang execution đều đi qua core gate fail-closed và không thể vòng scope bằng shell, docs path hay state bị hỏng.

## 2. Scope

**In scope**

- Hook gọi strict core state/snapshot/gate API; missing, invalid hoặc stale state trả deny cho Write/Edit/Bash thay vì skip V3 checks.
- Bỏ allow vô điều kiện `Design/`/`docs/`: write vào planning docs chỉ cho phép khi phase/command contract cho phép; thay đổi docs đã validate sẽ invalidate snapshot.
- Khi active task, Bash chỉ allow command verification exact của B11b hoặc read-only command parser whitelist; reject separator, redirect, substitution, inline interpreter, `git` write operation và mọi command không có task command id.
- Write/Edit chỉ allow path canonical thuộc active task; hook resolve path traversal và Windows separator trước gate.
- Hook message cho newbie nêu active task, path/command bị chặn và next action (`status`, `verify`, `repair` hoặc `validate`), không lộ raw stack trace.

**Out of scope**

- Không biến Claude hook thành universal OS sandbox hoặc phân tích đầy đủ mọi shell grammar.
- Không thêm Codex adapter; B12b làm trên capability của Codex.

## 3. Checklist

- [ ] Corrupt/delete state, stale digest và plan-validating đều deny Write/Edit/Bash through PreToolUse.
- [ ] Bash `node -e`, redirection, `&&`, `;`, pipe, command substitution và `git apply/checkout/reset` bị deny trong execution; exact runner verification command được allow.
- [ ] `docs/` và `Design/` không còn bypass active-task/snapshot rule.
- [ ] Path traversal (`..`, absolute/drive path, mixed separator) ngoài allows_paths bị deny trên Windows fixture.
- [ ] Build E2E chạy `emit → validate → start → allowed edit → verify → next`; mỗi bypass attempt fail bằng reason code có remediation.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/adapters/claude/preToolUse.ts`, ≤200 dòng: strict state loader, command classification và core decision mapping.
- [MODIFY] `src/core/evaluateGate.ts`, ≤140 dòng: action kind/path/verification command decision input, không tự allow Bash.
- [MODIFY] `adapter/claude-code/hooks/pre-tool-use.mjs` và `_shared.mjs`, ≤120 dòng: pass full normalized tool input/reason code.
- [MODIFY] `src/adapters/claude/preToolUse.test.ts`, `buildWorkflow.test.ts`, ≤200 dòng/file: bypass/missing-state/Windows cases.
- [MODIFY] `test/e2e/execution-flow.test.ts`, ≤200 dòng: actual CLI state + emitted plan, không set phase tay để bỏ validation.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Heuristic shell parser bỏ sót cú pháp mới | Cao | Default deny trong active task; chỉ exact argv runner hoặc list read-only nhỏ được allow. |
| Chặn read command làm agent kẹt | TB | Whitelist nhỏ fixture-backed, message chỉ next action; không whitelist `git` rộng. |
| Hook và CLI lệch logic | Cao | Core returns reason code; adapter không tự implement state/business rule. |

## 6. Verification plan

- `npx vitest run preToolUse buildWorkflow execution-flow`
- `npm run typecheck && npm run lint && npm run build && npm test`
- Regression matrix: state missing/corrupt, stale docs, Bash mutation variants, docs write, out-of-scope edit, task start during repair, exact verify command; expected deny/allow asserted end-to-end.

## 7. Status

WAITING_FOR_APPROVAL
