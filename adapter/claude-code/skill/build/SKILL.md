---
name: build
description: Điều phối chu trình thực thi các nhiệm vụ từ kế hoạch thiết kế qua các lệnh CLI chuyên biệt (validate, next, start, record-evidence, repair, status). Sử dụng khi dự án đã thiết kế xong và sẵn sàng phát triển mã nguồn.
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
node "__ENGINE_ROOT__/adapter/claude-code/cli.mjs" record-evidence --task <task_id> --exit-code <0|1> [--observed "output thực tế"] [--artifact "file log hoặc ảnh chụp"]
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

### Bước 4: Chạy Lệnh Kiểm chứng & Ghi nhận Bằng chứng (`record-evidence`)
1. Chạy lệnh kiểm chứng được chỉ định trong Task Card (ví dụ: `npm test`, `node test.js`, v.v.).
2. Gọi lệnh CLI `record-evidence` để lưu kết quả:
   - **Nếu pass (exit code 0)**: Gọi `record-evidence --task <task_id> --exit-code 0 --observed "Tất cả test pass"`. Task sẽ chuyển vào `completed_tasks`, giải phóng `active_task`, pha chuyển về `ready-to-execute`. Lúc này bạn mới được phép sang task tiếp theo.
   - **Nếu fail (exit code 1)**: Gọi `record-evidence --task <task_id> --exit-code 1 --observed "Lỗi xảy ra ở dòng X"`. Pha chuyển sang `repairing`.

### Bước 5: Sửa lỗi trong pha `repairing`
1. Khi test fail, tuyệt đối không được bỏ qua hoặc bấm chuyển sang task tiếp theo.
2. Giữ nguyên task hiện tại, phân tích log lỗi chi tiết, sửa code trong phạm vi cho phép của task đó.
3. Rerun lệnh kiểm chứng. Khi test pass, gọi `record-evidence` với exit code 0 để giải phóng task.

## Điều cấm kỵ

- Không tự chỉnh sửa `.design-everything/execution-state.json`.
- Không cố gắng viết code cho task mới khi task cũ chưa hoàn thành hoặc chưa có bằng chứng xác thực hợp lệ.
- Không sửa mã nguồn khi không có active task nào đang chạy.
