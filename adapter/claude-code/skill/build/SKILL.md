---
name: build
description: Điều phối chu trình thực thi các nhiệm vụ từ kế hoạch thiết kế qua các lệnh CLI chuyên biệt (validate, next, start, verify, repair, status). Sử dụng khi dự án đã thiết kế xong và sẵn sàng phát triển mã nguồn.
---

# /build — Hướng dẫn Thực thi Kế hoạch (DesignEverything Build workflow)

Bạn là kỹ sư xây dựng hệ thống, chịu trách nhiệm thực thi các Milestone và Task Card từ `execution-plan.json` theo đúng thứ tự mà không nhảy cóc. Mọi hành động cập nhật state đều qua CLI, KHÔNG tự sửa `execution-state.json`.

Engine: `__ENGINE_ROOT__`
CLI (động cơ quản lý state):

```bash
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" status
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" validate
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" next
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" start --task <task_id> --milestone <milestone_id>
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" verify --task <task_id> --command <command_id>
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" repair
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" next-step [--calibrate deep|fast]
```

## Chu trình làm việc cốt lõi (Bắt buộc)

### Bắt đầu: Đọc Trạng thái & Xác thực
1. Chạy `next-step` để kiểm tra thẻ bước tiếp theo (Next Step Card).
2. Nếu pha là `plan-validating` hoặc trạng thái yêu cầu validate, chạy ngay lệnh `validate`.
   - Nếu `validate` thành công: Pha chuyển sang `ready-to-execute`. Tiếp tục bước tiếp theo.
   - Nếu `validate` thất bại: Hệ thống chuyển sang `blocked`. Hãy đọc kỹ `block_reason` hoặc danh sách `issues` được trả về, sửa lại các tệp tài liệu thiết kế bị lỗi và chạy lại `validate`. Bạn không thể viết code khi chưa sửa xong.

### Bước 1: Tìm Task khả thi tiếp theo
1. Chạy `next` để lấy thông tin task card tiếp theo có thể thực thi.
2. Tuyệt đối không tự ý thực hiện task có các preconditions chưa hoàn thành.

### Bước 2: Kích hoạt Task (`start`)
1. Chạy `start --task <task_id> --milestone <milestone_id>`. Lệnh này chuyển pha sang `executing` và gán `active_task`.
2. Trình bày tường minh trước khi bắt đầu code:
   - **Mục tiêu**: Ý định thực thi là gì.
   - **Tác động**: Các file được phép sửa đổi (`allowed_paths`).
   - **Điều kiện**: Các preconditions của task.
   - **Nghiệm thu**: Lệnh kiểm chứng và kết quả mong đợi.
   *(Nếu ở chế độ `deep` giải thích thêm lý do kỹ thuật chi tiết; chế độ `fast` đi thẳng vào vấn đề cùng các yêu cầu bằng chứng).*

### Bước 3: Phát triển mã nguồn trong phạm vi (`allows_paths`)
1. Thực hiện viết code/chỉnh sửa trong phạm vi cho phép của task.
2. **CẢNH BÁO**: Mọi hành động ghi/sửa tệp nằm ngoài `allows_paths` của task sẽ bị hook `PreToolUse` từ chối thẳng thừng (Bậc A). Đừng cố gắng chỉnh sửa các tệp không được chỉ định trong task card hiện tại.

### Bước 4: Kiểm chứng bằng máy (`verify`)
1. Với MỖI command trong Task Card, gọi `verify --task <task_id> --command <command_id>`. Engine TỰ chạy lệnh kiểm chứng đó và tự ghi nhận bằng chứng — bạn KHÔNG tự khai exit-code, không tự viết evidence.
   - **Nếu pass**: khi mọi command của task đã verify pass, task vào `completed_tasks`, giải phóng `active_task`, pha về `ready-to-execute`. Lúc này bạn mới được phép sang task tiếp theo.
   - **Nếu fail**: pha chuyển sang `repairing`.

### Bước 5: Sửa lỗi trong pha `repairing`
1. Khi verify fail, tuyệt đối không được bỏ qua hoặc bấm chuyển sang task tiếp theo.
2. Giữ nguyên task hiện tại, phân tích log lỗi chi tiết, sửa code trong phạm vi cho phép của task đó.
3. Gọi lại `verify --task <task_id> --command <command_id>`. Khi pass, task mới được giải phóng.

### Bước 6: Review feature & break-task (pha `reviewing` — B17a/V5)

Sau khi mọi task build của một feature-milestone (`M4-*`) đã pass, pha chuyển sang `reviewing` — **không** đi thẳng sang feature kế.

1. Chạy manager-check (lint/test/diff của feature vừa xong).
2. **Output sạch** → review đóng, feature vào `reviewed_milestones`, pha về `ready-to-execute` để mở feature kế.
3. **Output bẩn** → hệ thống sinh **break-task** (`fix_*` cho bug, `polish_*` cho nợ kỹ thuật). Feature **CHƯA được coi là done** (fail-closed): phải làm xong mọi break-task (verify pass) rồi mới đóng được review.
4. **Feature-done gate**: không được mở feature-milestone mới khi còn feature cũ đã xong task build nhưng chưa đóng review.

## Điều cấm kỵ

- Không tự chỉnh sửa `.design-everything/execution-state.json`.
- Không cố gắng viết code cho task mới khi task cũ chưa hoàn thành hoặc chưa có bằng chứng xác thực hợp lệ.
- Không sửa mã nguồn khi không có active task nào đang chạy.
- Không nhảy sang feature kế khi review của feature hiện tại chưa đóng (còn break-task chưa xong).
