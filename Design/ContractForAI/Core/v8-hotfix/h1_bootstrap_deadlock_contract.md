# Contract — H1 mở bế tắc bootstrap: `init` bị chặn bởi đúng lỗi nó phải sửa

> Tầng: Lõi.
> Nguồn: phiên test thật đầu tiên của lane 8.1 (interactive cards) — cài mới, `init` chết ngay ở
> bước đầu tiên. Phụ thuộc: không.

## 1. Micro-task target

Cho bốn subcommand CLI vốn tồn tại để chẩn đoán/khôi phục store (`init`, `repair`, `status`,
`help`) đi tới được `classifyCliSubcommand` — thẩm quyền allow/deny thật của chúng — thay vì bị
`loadProgressGuard` chặn từ trước với `progress-missing` chỉ vì chưa có canonical interview store.

## 2. Scope

**In scope**

- `evaluatePreAction` ([evaluatePreAction.ts](../../../../src/core/evaluatePreAction.ts)) — trước
  khi trả deny của `loadProgressGuard`, nếu request là shell và subcommand thuộc tập bootstrap →
  vẫn thử load progress (để phase dispatch phía sau có dữ liệu thật khi store *đã* tồn tại), nhưng
  KHÔNG deny khi load thất bại — để `progress = null`, đi tiếp tới bước 6 (CLI-shell authority).
- `isBootstrapCliInvocation(argv)` mới trong
  [preAction/shared.ts](../../../../src/core/preAction/shared.ts) — tập
  `{init, repair, status, help, --help, -h}`.
- Subcommand phụ thuộc pha thật (`commit`, `deepen`, …) giữ nguyên hành vi deny hôm nay khi store
  thiếu — đây không phải bypass toàn cục.

**Out of scope**

- Không đổi thứ tự các guard khác trong `evaluatePreActionInner`.
- Không wire `authorizeRecovery` ([runtimeHealth.ts](../../../../src/core/runtimeHealth.ts)) — đây
  là code chết không có caller sản phẩm, xoá hay wire là việc khác, không nhét vào hotfix này.
- Không đổi `classifyCliSubcommand` — bảng allow/deny theo subcommand+phase của nó là thẩm quyền
  cuối, không cần sửa để đạt mục tiêu này.

## 3. Checklist

- [x] Workspace chỉ có `install-manifest.json` (không có canonical store) → `init --json` → allow,
      `reason_code: 'cli-allowed'`.
- [x] Cùng workspace → `status`, `repair` → allow.
- [x] Cùng workspace → `commit` → vẫn deny `progress-missing` (không bị bypass lây).
- [x] Workspace có store thật, khoẻ mạnh, đang giữa phỏng vấn → `status` vẫn trả quyết định dựa
      trên progress thật (không phải bypass mù) — chứng minh gián tiếp: một write ngoài phạm vi vẫn
      bị gate như bình thường trong cùng workspace đó.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/preAction/shared.ts` — thêm `BOOTSTRAP_CLI_SUBCOMMANDS` (Set) +
  `export function isBootstrapCliInvocation(argv: string[] | undefined): boolean`, ~19 dòng.
- [MODIFY] `src/core/evaluatePreAction.ts` — nhánh rẽ trước bước 5 (load progress): bootstrap →
  best-effort load, không deny khi fail; còn lại → giữ nguyên `loadProgressGuard` fail-closed,
  ~21 dòng.
- [MODIFY] `src/core/evaluatePreAction.test.ts` — 3 test case (`H1 — bootstrap CLI subcommands
  bypass the missing-store deadlock`), ~118 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Bootstrap exemption rò rỉ thành bypass ghi chung | TB | Test case thứ ba xác nhận một write engine-state (`interview-state.json`) vẫn bị deny ngay trong cùng workspace vừa qua `status` bootstrap-exempt. |
| `commit`/`deepen` vô tình lọt vào tập bootstrap | Cao nếu xảy ra | Tập `BOOTSTRAP_CLI_SUBCOMMANDS` liệt kê tường minh 4+2 alias, không suy luận; test case thứ hai khẳng định `commit` vẫn deny trên đúng workspace mà `init`/`status`/`repair` được allow. |

## 6. Verification plan

```bash
npx vitest run src/core/evaluatePreAction.test.ts
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/evaluatePreAction.test.ts` = 39/39 pass (gồm 3 case H1 mới, cộng toàn bộ
suite cũ không hồi quy). `npm run typecheck` xanh. `npx vitest run` toàn repo = 135 test file /
1040 test pass, 2 skip (không liên quan lane này).
