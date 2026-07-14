# Semantics of PreActionGate & Capability Legend

`PreActionGate` là hệ thống gác cổng trung lập runtime (Claude/Codex/MCP) giúp tập trung hóa toàn bộ logic kiểm tra an toàn trước khi hành động được thực hiện.

## 1. Request Schema (PreActionRequest)

Mỗi adapter (Claude, Codex, v.v.) chuẩn hóa thông tin hành vi thành cấu trúc chung:

- `runtime`: `'claude' | 'codex' | 'mcp' | 'generic'`
- `tool_name`: Tên của tool được harness gọi (ví dụ: `Write`, `edit_file`, `Bash`).
- `action_kind`: Nhóm hành động ngữ nghĩa:
  - `read`: Đọc tệp tin.
  - `write`: Ghi/Sửa đổi tệp tin.
  - `shell`: Thực thi lệnh trên hệ điều hành.
  - `mcp`: Gọi MCP server tool.
  - `external`: Hành động bên ngoài khác (ví dụ: gọi API mạng).
- `target_paths`: Mảng các đường dẫn tệp tin chịu ảnh hưởng.
- `command_argv`: Mảng các đối số lệnh thực thi (nếu là `shell`).
- `workspace`: Thư mục làm việc hiện tại (đường dẫn tuyệt đối).
- `session_id`: Định danh phiên làm việc.

## 2. Decision Schema (PreActionDecision)

Trả về quyết định đồng bộ:

- `decision`: `'allow' | 'deny' | 'requires-user-confirmation'`
- `reason_code`: Mã lỗi chuẩn hóa phục vụ kiểm thử và tracing.
- `user_message`: Thông điệp hiển thị cho người dùng.
- `enforcement`:
  - `hard`: Chặn cứng và từ chối hành động.
  - `soft`: Cảnh báo nhưng cho phép nếu người dùng xác nhận.
  - `unsupported`: Adapter không hỗ trợ chặn tool này.
- `matched_task_id`: ID của task đang chạy (nếu có).

## 3. Reason Codes Legend

| Reason Code | Mô tả |
|---|---|
| `read-only-allowed` | Cho phép đọc tệp hoặc chạy các lệnh shell đọc thông tin. |
| `interview-doc-write-allowed` | Cho phép ghi tệp docs/Design trong pha phỏng vấn. |
| `interview-source-write-blocked` | Chặn ghi tệp nguồn trong pha phỏng vấn. |
| `interview-shell-blocked` | Chặn chạy Bash không an toàn trong pha phỏng vấn. |
| `plan-validating-write-allowed` | Cho phép ghi tệp docs/Design trong pha validate. |
| `plan-validating-write-blocked` | Chặn ghi tệp nguồn trong pha validate. |
| `plan-validating-shell-blocked` | Chặn chạy Bash không whitelisted trong pha validate. |
| `stale-digest` | Xác thực snapshot thất bại hoặc stale. |
| `task-inactive` | Không có task nào đang chạy (active_task là null). |
| `path-outside-scope` | Đường dẫn không nằm trong allowed_paths của active task. |
| `command-allowed` | Cho phép lệnh kiểm chứng chính xác của task. |
| `command-not-registered` | Chặn lệnh không đăng ký trong task. |
| `traversal-attempt` | Chặn đứng hành vi path traversal hoặc ghi ngoài workspace. |
| `git-mutation-blocked` | Chặn các lệnh thay đổi git. |
| `shell-operators-blocked` | Chặn shell operators (redirect, pipe, v.v.). |
| `unsupported-tool` | Tool không được hỗ trợ bởi adapter capability. |
