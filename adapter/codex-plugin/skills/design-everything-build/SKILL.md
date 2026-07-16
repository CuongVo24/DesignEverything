---
name: design-everything-build
description: Codex skill for validating, starting, verifying, and repairing tasks in DesignEverything
---

# Codex Skill — DesignEverything Build & Verify

Skill này giúp Codex kết nối trực tiếp với bộ điều phối và kiểm chứng của DesignEverything.

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

*   **`/hooks`**: Kiểm tra trạng thái kích hoạt và trust của Codex hooks.
*   **`/validate`**: Chạy lệnh validate cấu hình dự án và sinh kế hoạch.
*   **`/status`**: Xem trạng thái thực thi hiện tại và active task.
*   **`/next-step`**: Xem thông tin bước tiếp theo rõ ràng (Next Step Card) với các trường lý do và bằng chứng.
*   **`/start <task_id>`**: Bắt đầu thực thi một task cụ thể.
*   **`/verify`**: Thực hiện lệnh tự động kiểm chứng cho task hiện tại.
*   **`/repair`**: Báo cáo lỗi và mở pha sửa đổi (repair) cho task.
*   **`/review <milestone>`**: Chạy manager-check cho feature vừa xong; sinh break-task nếu output bẩn và đóng review khi sạch.

## 3. Review feature & break-task (pha `reviewing` — B17a/V5)

Sau khi mọi task build của một feature-milestone (`M4-*`) pass, pha chuyển sang `reviewing`:

*   Output sạch → review đóng, mở feature kế.
*   Output bẩn → sinh **break-task** (`fix_*`/`polish_*`); feature CHƯA done tới khi break-task xong (fail-closed).
*   **Lưu ý Codex (soft-gate)**: vòng review là hướng dẫn ở mức soft. Codex cảnh báo khi bạn định nhảy sang feature kế lúc review chưa đóng, nhưng **không chặn cứng** như Claude. Coverage này được công bố đúng năng lực, không hứa hard-enforce.
