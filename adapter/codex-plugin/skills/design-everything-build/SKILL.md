---
name: design-everything-build
description: Codex skill for validating, starting, verifying, and repairing tasks in DesignEverything
---

# Codex Skill — DesignEverything Build & Verify

Skill này giúp Codex kết nối trực tiếp với bộ điều phối và kiểm chứng của DesignEverything. Mọi hành động cập nhật state đều qua CLI, KHÔNG tự sửa `execution-state.json`.

Plugin Root: `${PLUGIN_ROOT}` hoặc `~/.codex/plugins/design-everything-plugin`

CLI (động cơ quản lý state):
```bash
node "<pluginRoot>/cli.mjs" status --json
node "<pluginRoot>/cli.mjs" validate --json
node "<pluginRoot>/cli.mjs" next --json
node "<pluginRoot>/cli.mjs" start --task <task_id> --json
node "<pluginRoot>/cli.mjs" verify --task <task_id> --command <command_id> --json
node "<pluginRoot>/cli.mjs" review --milestone <M4-...> --json
node "<pluginRoot>/cli.mjs" repair --json
```

## 1. Capability Card

### Supported Enforcement (Hard Coverage)
*   **Bash Tool**: Intercept và chặn các lệnh shell nguy hại hoặc không thuộc verification commands của active task.
*   **apply_patch (Write/Edit)**: Intercept và chặn sửa đổi tệp ngoài `allowed_paths` của active task.
*   **MCP Tools**: So khớp và chặn các MCP tool nằm ngoài scope của active task.

### Known Gaps (Soft/Unintercepted Paths)
*   **Direct File Read/Write**: Một số file stream nội bộ hoặc extension không đi qua PreToolUse hook của Codex.
*   **Network Calls**: Các cuộc gọi HTTP ngoài shell command.

---

## 2. Slash Commands Mapping & Control Flow

Khi người dùng gõ slash command, Codex dịch thành lệnh CLI tương ứng (chạy với cờ `--json`):

*   **`/status`**: Chạy `node "<pluginRoot>/cli.mjs" status --json`. Nếu exit code khác 0, dừng ngay và hiển thị `message` + `next_command`.
*   **`/validate`**: Chạy `node "<pluginRoot>/cli.mjs" validate --json`. Đọc kết quả `VALIDATION_PASSED` để chuyển sang `ready-to-execute`.
*   **`/next`**: Chạy `node "<pluginRoot>/cli.mjs" next --json` lấy task khả thi.
*   **`/start <task_id>`**: Chạy `node "<pluginRoot>/cli.mjs" start --task <task_id> --json`.
*   **`/verify <task_id> <command_id>`**: Chạy `node "<pluginRoot>/cli.mjs" verify --task <task_id> --command <command_id> --json`. Nếu có `requires_user_confirmation: true`, PHẢI hỏi người dùng thật trước, chỉ thêm `--confirm` khi người dùng đồng ý.
*   **`/repair`**: Chạy `node "<pluginRoot>/cli.mjs" repair --json`.
*   **`/review <milestone>`**: Chạy `node "<pluginRoot>/cli.mjs" review --milestone <milestone> --json`.

---

## 3. Quy tắc Handoff Truth & Non-zero Exit

1. Sau khi `emit` xong, nói rõ: "Docs `docs/` đã được sinh, **NHƯNG kế hoạch thi công CHƯA được validate.**" Tiếp theo gọi `/validate` hoặc `/build`, KHÔNG tự tiện cho phép code hay bảo "gate đã mở".
2. Khi CLI trả về exit code khác 0 hoặc `ok: false`: **DỪNG THỰC THI NGAY**, báo lỗi và đưa hướng dẫn `next_command` / `safe_next_command`. KHÔNG đoán state hay ép tiếp tục.
3. Cảnh báo mâu thuẫn (`consistency_warnings`) cần người dùng xác nhận / sửa đổi; model KHÔNG tự auto-ack.

---

## 4. Đào sâu thiết kế (tuỳ chọn — tầng 2)

Người dùng CÓ THỂ đào sâu 4 module dưới `docs/design/` (`glossary`, `feature-spec`, `adr`, `test-strategy`) khi Tier-1 ở trạng thái `ready-to-execute`.

```bash
node "<pluginRoot>/cli.mjs" deepen --json
node "<pluginRoot>/cli.mjs" deepen --module <id> --opt-in --json
node "<pluginRoot>/cli.mjs" deepen --module <id> --next --json
node "<pluginRoot>/cli.mjs" deepen --module <id> --commit --capability-token <TOKEN> --question <qid> [--subject <sid>] --answer "..." --json
node "<pluginRoot>/cli.mjs" deepen --module <id> --emit --json
```

Token đến từ hook/runtime context cho đúng câu hỏi hiện tại — KHÔNG tự bịa token, KHÔNG tái
dùng token đã commit. KHÔNG dùng `--turn <id>` — cờ này không còn được engine chấp nhận làm căn
cứ uỷ quyền.

Quy tắc: (1) chỉ đề xuất khi người dùng hỏi / opt-in và phase hợp lệ; (2) hỏi từng câu, dịch ngược
+ chờ xác nhận; (3) không tự auto-ack; (4) mỗi khối nội dung sinh vào `docs/design/` PHẢI cite
nguồn theo grammar SourceRef của `taxonomy-tier2.md` — trỏ về đúng answer hoặc doc tầng 1 đã tồn
tại; khối không truy được nguồn thật gắn cờ `> ⚠ unknown — cần hỏi người`, KHÔNG tự bịa.
