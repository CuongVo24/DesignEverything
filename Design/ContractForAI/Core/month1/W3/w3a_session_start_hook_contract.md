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
- [ ] Thiếu file → tạo state S0 đúng mọi field (gồm `answered_len_at_last_turn=0`).
- [ ] File hợp lệ → giữ nguyên.
- [ ] File hỏng/sai version → fail rõ, không tự sửa.
- [ ] Ca biên claude-code.md §SessionStart đều có test.

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
`WAITING_FOR_APPROVAL`
