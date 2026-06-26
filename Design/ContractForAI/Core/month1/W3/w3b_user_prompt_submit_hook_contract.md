# Contract — W3B Hook UserPromptSubmit (rate-limit + inject)

> **Tầng:** Adapter (Claude Code). Nguồn: [Week-03](../../../../RoadMap/Month1/Week-03.md) + [claude-code.md](../../../../Adapters/claude-code.md) §"GATE 2. UserPromptSubmit" + [state-schema.md](../../../../Core/Schemas/state-schema.md) §3–§4 (**mô hình hai lớp — đọc kỹ**).

## 1. Micro-task target
Hook `UserPromptSubmit` **chỉ giới hạn nhịp và inject** câu hiện tại. KHÔNG advance, KHÔNG đọc ý định, KHÔNG set `branch`. (Việc commit là của skill W3D.)

## 2. Scope
**In scope** — `src/adapters/claude/userPromptSubmit.ts`:
- Nạp state (`loadProgress`).
- `checkRate(progress, progress.answered.length)` (W2C): nếu fail → chặn lượt + message rõ "vi phạm một-bước-mỗi-lượt", không sửa state ngầm.
- `stampTurn` → cập nhật `answered_len_at_last_turn = answered.length`, lưu.
- Nếu `current_step != null` → trả context inject: `ask`, `default`, `translate_back`, `target_doc` của câu hiện tại + nhắc 4 quy tắc vàng + nhắc skill "chỉ commit sau khi user xác nhận dịch ngược, một bước".
- Nếu `current_step == null` → không inject câu hỏi.

**Out of scope**
- Append `answered` / set `branch` / tính bước kế (đó là skill W3D, gọi `commitStep`).
- Gate chặn tool (W3C).

## 3. Checklist
- [ ] KHÔNG gọi `commitStep`; chỉ `checkRate` + `stampTurn` + build inject.
- [ ] Chặn khi `answered` tăng > 1 so với `answered_len_at_last_turn`.
- [ ] Inject đúng field câu `current_step`.
- [ ] `current_step==null` → không hỏi tiếp.
- [ ] Test các ca claude-code.md §UserPromptSubmit.

## 4. Interfaces / Files expected to change
```ts
export function onUserPromptSubmit(ctx: { workspaceRoot: string; userTurnId: string }):
  { decision: 'allow' | 'block'; injectedContext?: string; message?: string };
```
- `[NEW]` `src/adapters/claude/userPromptSubmit.ts` (+ test)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Hook lỡ advance (lẫn lớp) | Cao | Tuyệt đối không gọi `commitStep`; chỉ rate-limit + inject. Test khẳng định `answered` không đổi sau hook. |
| Chặn nhầm lượt hợp lệ | TB | Chỉ chặn khi answered tăng > 1; lượt thường tăng 0/1. |

## 6. Verification plan
- Sau hook, `answered` KHÔNG đổi (chỉ `answered_len_at_last_turn` đổi).
- Fixture answered tăng 2 → `decision='block'`.
- `current_step='S3'` → inject chứa `ask`/`translate_back` của S3.

## 7. Status
`WAITING_FOR_APPROVAL`
