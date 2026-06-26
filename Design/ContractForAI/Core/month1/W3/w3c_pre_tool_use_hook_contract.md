# Contract — W3C Hook PreToolUse (gate cứng)

> **Tầng:** Adapter (Claude Code). Nguồn: [Week-03](../../../../RoadMap/Month1/Week-03.md) + [claude-code.md](../../../../Adapters/claude-code.md) §"GATE 3. PreToolUse" + [gate-policy.yaml](../../../../Content/interview-script/gate-policy.yaml).

## 1. Micro-task target
Hook `PreToolUse` ép cứng "chưa đủ doc thì chưa code": đọc gate-policy, đối chiếu artifact thật, chặn `Write/Edit/Bash` đúng `blocks` với `message` của gate. Tránh `Stop` chặn nhầm.

## 2. Scope
**In scope** — `src/adapters/claude/preToolUse.ts`:
- Liệt kê doc đang tồn tại trong cây `docs/` (đọc FS — adapter mới chạm FS, engine thuần).
- Với mỗi gate: `evaluateGate`/`isBlocked` (W2D). Nếu tool bị chặn → trả `deny` + `gate.message`.
- **Phân loại hành động:** CHO PHÉP sửa file trong `Design/` hoặc cây `docs/`, và `Bash` chỉ đọc/liệt kê/kiểm tra. CHẶN tạo/sửa mã nguồn ngoài vùng doc, và `Bash` build/scaffold/cài package/chạy generator.
- Heuristic Bash tối thiểu theo claude-code.md §"Heuristic tối thiểu cho Bash"; không chắc → chọn chặn + message rõ.
- Sau kiểm: append gate đã mở vào `gates_passed` (append-only).
- **Stop:** không dùng `Stop` làm gate chính (chỉ nhắc nhẹ nếu định kết thúc khi state chưa đủ).

**Out of scope**
- Inject/commit (W3B/W3D). Đánh giá ngữ nghĩa câu trả lời.

## 3. Checklist
- [ ] Chặn `Write/Edit/Bash` khi thiếu `02-scope.md` (gate `scope-locked` đóng) + đúng `message`.
- [ ] Cho phép viết trong `Design/`/`docs/` và `Bash` đọc-file.
- [ ] Chặn `Bash` build/cài package khi gate đóng.
- [ ] Không dùng `Stop` chặn nhầm lượt hỏi tiếp.
- [ ] `gates_passed` append đúng khi đủ doc.

## 4. Interfaces / Files expected to change
```ts
export function onPreToolUse(ctx: {
  workspaceRoot: string; tool: 'Write'|'Edit'|'Bash'; toolInput: unknown;
}): { decision: 'allow' | 'deny'; message?: string };
```
- `[NEW]` `src/adapters/claude/preToolUse.ts` (+ test)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Heuristic Bash quá thô (chặn lệnh đọc / lọt lệnh build) | Cao | Bám danh sách claude-code.md; không chắc → chặn + message; test cả hai phía. |
| Chặn nhầm viết doc | Cao | Allowlist vùng `Design/`+`docs/` trước khi xét gate. |
| Lạm dụng `Stop` | TB | `Stop` không phải block hợp lệ (gate-policy §`Stop`). |

## 6. Verification plan
- Thiếu `02-scope.md` + `Write src/x.ts` → `deny` + message gate.
- Đủ 3 doc + `Write src/x.ts` → `allow`.
- `Write docs/02-scope.md` khi gate đóng → `allow` (vùng doc).
- `Bash "npm install"` khi gate đóng → `deny`; `Bash "ls docs"` → `allow`.

## 7. Status
`WAITING_FOR_APPROVAL`
