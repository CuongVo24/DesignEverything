---
name: design-everything-build
description: Codex skill for validating, starting, verifying, and repairing tasks in DesignEverything
---

# Codex Skill — DesignEverything Build & Verify

Skill này giúp Codex kết nối trực tiếp với bộ điều phối và kiểm chứng của DesignEverything. Mọi hành động cập nhật state đều qua CLI, KHÔNG tự sửa `execution-state.json`.

Plugin Root: `${PLUGIN_ROOT}` hoặc `~/.codex/plugins/design-everything-plugin`

CLI (động cơ quản lý state):
```bash
node "<pluginRoot>/cli.mjs" status
node "<pluginRoot>/cli.mjs" validate
node "<pluginRoot>/cli.mjs" next
node "<pluginRoot>/cli.mjs" start --task <task_id> --milestone <milestone_id>
node "<pluginRoot>/cli.mjs" verify --task <task_id> --command <command_id>
node "<pluginRoot>/cli.mjs" review --milestone <M4-...>
node "<pluginRoot>/cli.mjs" repair
node "<pluginRoot>/cli.mjs" next-step [--calibrate deep|fast]
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

## 2. Slash Commands Mapping

Khi người dùng gõ slash command, Codex dịch thành lệnh CLI tương ứng (chạy với `<pluginRoot>` phù hợp):

*   **`/hooks`**: Kiểm tra trạng thái kích hoạt và trust của Codex hooks.
*   **`/validate`**: Chạy lệnh validate cấu hình dự án và sinh kế hoạch.
    ```bash
    node "<pluginRoot>/cli.mjs" validate
    ```
*   **`/status`**: Xem trạng thái thực thi hiện tại và active task.
    ```bash
    node "<pluginRoot>/cli.mjs" status
    ```
*   **`/next-step`**: Xem thông tin bước tiếp theo rõ ràng (Next Step Card) với các trường lý do và bằng chứng.
    ```bash
    node "<pluginRoot>/cli.mjs" next-step
    ```
*   **`/start <task_id> <milestone_id>`**: Bắt đầu thực thi một task cụ thể.
    ```bash
    node "<pluginRoot>/cli.mjs" start --task <task_id> --milestone <milestone_id>
    ```
*   **`/verify <task_id> <command_id>`**: Thực hiện lệnh tự động kiểm chứng cho task hiện tại.
    ```bash
    node "<pluginRoot>/cli.mjs" verify --task <task_id> --command <command_id>
    ```
    Nếu command có `requires_user_confirmation: true`, phải hỏi người dùng thật trước; chỉ thêm `--confirm` sau khi họ đồng ý trong chat. Không bao giờ tự thêm cờ này.
*   **`/repair`**: Báo cáo lỗi và mở pha sửa đổi (repair) cho task.
    ```bash
    node "<pluginRoot>/cli.mjs" repair
    ```
*   **`/review <milestone>`**: Chạy manager-check cho feature vừa xong; sinh break-task nếu output bẩn và đóng review khi sạch.
    ```bash
    node "<pluginRoot>/cli.mjs" review --milestone <milestone>
    ```

---

## 3. Review feature & break-task (pha `reviewing` — B17a/V5)

Sau khi mọi task build của một feature-milestone (`M4-*`) pass, pha chuyển sang `reviewing`:

1. Chạy `/review <milestone>` (tương đương `node "<pluginRoot>/cli.mjs" review --milestone <milestone>`). Engine TỰ chạy lint/test của stack đã khóa trong `docs/conventions/`.
2. **Output sạch** → review đóng, mở feature kế.
3. **Output bẩn** → sinh **break-task** (`fix_*`/`polish_*`); feature CHƯA done tới khi break-task xong (fail-closed).
4. **Lưu ý Codex (soft-gate)**: vòng review là hướng dẫn ở mức soft. Codex cảnh báo khi bạn định nhảy sang feature kế lúc review chưa đóng, nhưng **không chặn cứng** như Claude. Coverage này được công bố đúng năng lực, không hứa hard-enforce.

---

## 4. Đào sâu thiết kế (tuỳ chọn — tầng 2)

Người dùng CÓ THỂ đào sâu 4 module dưới `docs/design/` (`glossary`, `feature-spec`, `adr`,
`test-strategy`) — **kênh riêng, tuỳ chọn**, không đụng luồng tầng 1.

```bash
node "<pluginRoot>/cli.mjs" deepen                                  # trạng thái 4 module
node "<pluginRoot>/cli.mjs" deepen --module <id> --opt-in [--activation explicit|condition]
node "<pluginRoot>/cli.mjs" deepen --module <id> --next             # câu DS kế tiếp
node "<pluginRoot>/cli.mjs" deepen --module <id> --commit --turn <TURN_ID> --question <qid> [--subject <sid>] --answer "..."
node "<pluginRoot>/cli.mjs" deepen --module <id> --emit             # sinh docs/design/ khi đủ câu
```

Quy tắc: (1) **chỉ chào mời khi người dùng hỏi** hoặc điều kiện §3 taxonomy-decision xuất hiện
trong answers — KHÔNG tự opt-in hộ; (2) hỏi từng câu, **dịch ngược + chờ xác nhận** rồi mới
commit; (3) `--emit` fail-closed: thiếu câu/consistency error → exit ≠ 0; (4) mỗi khối cite
nguồn theo grammar SourceRef, khối không truy được nguồn mang cờ `⚠ unknown — cần hỏi người`.
