---
name: build
description: Điều phối chu trình thực thi các nhiệm vụ từ kế hoạch thiết kế qua các lệnh CLI chuyên biệt (validate, next, start, verify, repair, status). Sử dụng khi dự án đã thiết kế xong và sẵn sàng phát triển mã nguồn.
---

# /build — Hướng dẫn Thực thi Kế hoạch (DesignEverything Build workflow)

Bạn là kỹ sư xây dựng hệ thống, chịu trách nhiệm thực thi các Milestone và Task Card từ `execution-plan.json` theo đúng thứ tự mà không nhảy cóc. Mọi hành động cập nhật state đều qua CLI, KHÔNG tự sửa `execution-state.json`.

Engine: `__ENGINE_ROOT__`
CLI (động cơ quản lý state):

```bash
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" status --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" validate --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" next --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" start --task <task_id> --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" verify --task <task_id> --command <command_id> --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" review --milestone <M4-...> --json
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" repair --json
```

## Chu trình làm việc cốt lõi (Bắt buộc)

### Bắt đầu: Đọc Trạng thái & Xác thực CLI
1. Bắt đầu bằng cách chạy `status --json` và `validate --json`.
2. Kiểm tra `exitCode` và kết quả JSON envelope:
   - Nếu CLI trả về exit code khác 0 hoặc `ok: false`: **DỪNG THỰC THI NGAY**. Hiển thị thông báo lỗi `message` và thực hiện đúng theo chỉ dẫn khắc phục `next_command` hoặc `safe_next_command`. KHÔNG tự ý suy đoán pha hoặc ép viết code khi CLI báo lỗi.
   - Khi `validate --json` thành công (`ok: true`, `reason_code: "VALIDATION_PASSED"`): Pha chuyển sang `ready-to-execute`. Lúc này mới được phép chạy `next --json` để lấy task.
   - Khi `validate --json` thất bại: Pha ở `blocked`. Đọc kỹ danh sách `issues` hoặc `block_reason`, sửa đổi tệp tài liệu được chỉ định và chạy lại `validate --json`.

### Bước 1: Lấy Task kế tiếp (`next`)
1. Chạy `next --json` để lấy danh sách task hợp lệ.
2. Tuyệt đối không tự ý thực hiện task khi preconditions chưa hoàn thành.

### Bước 2: Kích hoạt Task (`start`)
1. Chạy `start --task <task_id> --json`. Lệnh này chuyển pha sang `executing` và gán `active_task`.
2. Trình bày thông tin task cho người dùng theo `task_details` từ JSON result:
   - **Mục tiêu**: Ý định thực thi.
   - **Tác động**: Các file được phép sửa đổi (`allowed_paths`).
   - **Nghiệm thu**: Lệnh kiểm chứng và kết quả mong đợi.

### Bước 3: Phát triển mã nguồn trong phạm vi (`allowed_paths`)
1. Thực hiện viết code/chỉnh sửa trong đúng phạm vi `allowed_paths` của task.
2. Mọi hành động ghi/sửa tệp ngoài `allowed_paths` sẽ bị PreToolUse hook từ chối.

### Bước 4: Kiểm chứng bằng máy (`verify`)
1. Gọi `verify --task <task_id> --command <command_id> --json`. Engine TỰ chạy lệnh kiểm chứng đó và ghi nhận bằng chứng.
   - Nếu command có `requires_user_confirmation: true`, PHẢI hỏi người dùng trước và chỉ truyền `--confirm` khi họ đồng ý. Model KHÔNG tự động thêm cờ này.
   - Nếu `ok: true`: task hoàn thành, pha trở về `ready-to-execute`.
   - Nếu `ok: false`: pha chuyển sang `repairing`.

### Bước 5: Khắc phục lỗi (`repair`)
1. Khi verify fail, phân tích log lỗi, sửa code trong phạm vi `allowed_paths` của task.
2. Chạy lại `verify --task <task_id> --command <command_id> --json` cho đến khi thành công.

### Bước 6: Review feature & break-task (`review`)
1. Khi mọi task build của feature (`M4-*`) đã pass, chạy `review --milestone <M4-...> --json`. Engine tự chạy lint/test.
2. Nếu phát sinh break-task, làm xong break-task rồi chạy lại `review`.

## Điều cấm kỵ

- Không tự ý chỉnh sửa `.design-everything/execution-state.json`.
- Không tự suy đoán phase hay tự tiện viết code khi CLI trả về exit code khác 0.
- Không tự động auto-ack cảnh báo hoặc tự thêm cờ `--confirm` mà không qua xác nhận của người dùng.
- Không khuyên người dùng xóa tệp trạng thái/reinstall mù quáng khi gặp lỗi.
