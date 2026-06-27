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
- [x] Chặn `Write/Edit/Bash` khi thiếu `02-scope.md` (gate `scope-locked` đóng) + đúng `message`.
- [x] Cho phép viết trong `Design/`/`docs/` và `Bash` đọc-file.
- [x] Chặn `Bash` build/cài package khi gate đóng.
- [x] Không dùng `Stop` chặn nhầm lượt hỏi tiếp.
- [x] `gates_passed` append đúng khi đủ doc.

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
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt hook `onPreToolUse` tại **[preToolUse.ts](file:///e:/DesignEverything/src/adapters/claude/preToolUse.ts)**:
  - **Phân loại & cho phép sửa doc**: Tự động cho phép các tool `Write` / `Edit` nếu đường dẫn đích nằm trong thư mục `Design/` hoặc `docs/` (bằng cách chuẩn hóa đường dẫn tương đối qua `relative`).
  - **Phân loại Bash an toàn**: Phân tích câu lệnh CLI để cho phép các câu lệnh đọc và liệt kê an toàn (`cat`, `ls`, `git diff`, `rg`, v.v.) và không chứa ký tự chuyển hướng ghi đè file (`>`, `>>`).
  - **Chặn theo Gate Policy**: Quét thư mục `docs/` một cách đệ quy để thu thập danh sách `existingDocs`, đối chiếu với gate policy `gate-policy.yaml`. Nếu phát hiện bất kỳ gate nào đóng mà chặn tool hiện tại (như `scope-locked` chặn ghi mã nguồn ngoài doc khi thiếu `02-scope.md`), lập tức trả về `deny` cùng tin nhắn từ gate đó.
  - **Cập nhật gates_passed**: Khi phát hiện tài liệu đã đủ để mở một gate, tự động append gate ID vào `gates_passed` trong `progress.json` (append-only).
- Viết bộ unit test chuyên dụng tại **[preToolUse.test.ts](file:///e:/DesignEverything/src/adapters/claude/preToolUse.test.ts)** để kiểm thử tất cả các kịch bản chặn ghi code khi gate đóng, cho phép viết doc, cho phép Bash an toàn và tự động mở gate/cho phép ghi code khi đủ doc.
- Giải quyết triệt để xung đột race condition kiểm thử song song bằng cách thiết lập cấu trúc workspace cô lập hoàn toàn (`user-prompt-submit-workspace/` và `pre-tool-use-workspace/`) cho từng file test.
- Kiểm thử vitest, typecheck, lint, build đều xanh sạch 100%.
