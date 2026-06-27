# Contract — W3A Hook SessionStart

> **Tầng:** Adapter (Claude Code). Nguồn: [Week-03](../../../../RoadMap/Month1/Week-03.md) + [claude-code.md](../../../../Adapters/claude-code.md) §"GATE 1. SessionStart" + [state-schema.md](../../../../Core/Schemas/state-schema.md) §4.1.

## 1. Micro-task target
Hook `SessionStart` khởi tạo `progress.json` hợp lệ ở `S0` nếu chưa có; nếu có thì validate, không tự "chữa cháy".

## 2. Scope
**In scope** — `src/adapters/claude/sessionStart.ts`:
- Xác định path `progress.json` trong workspace.
- Thiếu file → tạo state mặc định: `phase='interview'`, `branch=null`, `current_step='S0'`, mảng rỗng, `last_user_turn_id=null`, `answered_len_at_last_turn=0`, `updated_at=now`. Dùng `saveProgress` (W2B).
- Có file → `loadProgress` validate; hợp lệ giữ nguyên; sai schema/version khác `0.1.0` → fail rõ field/version, KHÔNG tự sửa.
- Chỉ map event → gọi hàm lõi; không nhồi logic.

**Out of scope**
- Inject câu hỏi (W3D skill). Advance/gate (W3B/W3C).

## 3. Checklist
- [x] Thiếu file → tạo state S0 đúng mọi field (gồm `answered_len_at_last_turn=0`).
- [x] File hợp lệ → giữ nguyên.
- [x] File hỏng/sai version → fail rõ, không tự sửa.
- [x] Ca biên claude-code.md §SessionStart đều có test.

## 4. Interfaces / Files expected to change
```ts
export function onSessionStart(ctx: { workspaceRoot: string }): void;
```
- `[NEW]` `src/adapters/claude/sessionStart.ts` (+ test)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Tự sửa state hỏng | Cao | Chỉ tạo khi thiếu file; hỏng → fail rõ. |
| Sai path workspace | TB | Lấy từ `ctx.workspaceRoot`, không đoán. |

## 6. Verification plan
- Workspace sạch → tạo `progress.json` ở `S0` hợp lệ.
- `progress.json` hỏng → fail nêu field; version `0.0.9` → báo lệch version.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt hook `onSessionStart` tại **[sessionStart.ts](file:///e:/DesignEverything/src/adapters/claude/sessionStart.ts)**:
  - Tự động xác định đường dẫn `progress.json` từ `ctx.workspaceRoot`.
  - Nếu file chưa tồn tại, tự động sinh ra progress mặc định bắt đầu tại bước `S0` sử dụng loader `loadProgress` và lưu xuống đĩa bằng `saveProgress`.
  - Nếu file đã tồn tại, tiến hành nạp và xác thực cấu trúc schema Zod thông qua `loadProgress`. Đồng thời kiểm tra nghiêm ngặt phiên bản schema `version === '0.1.0'`. Trường hợp không hợp lệ hoặc sai lệch phiên bản, ném lỗi rõ ràng và tuyệt đối không tự "chữa cháy" sửa file.
- Viết bộ unit test chuyên dụng tại **[sessionStart.test.ts](file:///e:/DesignEverything/src/adapters/claude/sessionStart.test.ts)** để kiểm thử cả 4 kịch bản biên (file thiếu, file hợp lệ giữ nguyên, file hỏng Zod schema, file sai phiên bản SemVer 0.0.9).
- Kiểm thử vitest, typecheck, lint, build đều xanh hoàn toàn.
