## Tại sao cần file này
File này giữ phần dữ liệu bám đúng phần giá trị cốt lõi. Nó giúp tránh bịa thêm entity “để sau này có thể cần” nhưng không phục vụ bất kỳ tính năng Must nào.

## Thực Thể Chính
- `User`: thành viên có thể tham gia một hoặc nhiều nhóm.
- `Group`: đại diện cho một phòng trọ hoặc một nhóm chia tiền.
- `Expense`: một khoản chi chung phát sinh trong nhóm.
- `Settlement`: thông tin ai đã trả, ai còn nợ, số tiền tương ứng.
- `ReceiptImage`: ảnh hóa đơn gắn với một `Expense` khi người dùng có đính kèm.
<!-- anchor: id=03-data-model/core-entities  src=apps/mobile/src/features/data-model/dataModel.ts::coreEntities  rev=  status=planned -->

## Quan Hệ Giữa Các Thực Thể
`Group` có nhiều `User` và nhiều `Expense`. Mỗi `Expense` thuộc đúng một `Group`. `Settlement` nối một `Expense` với từng `User` để thể hiện nghĩa vụ thanh toán. `ReceiptImage` là phần mở rộng tùy chọn của `Expense`.
<!-- anchor: id=03-data-model/entity-relationships  src=apps/mobile/src/features/data-model/dataModel.ts::entityRelationships  rev=  status=planned -->

## Ghi Chú Về Phần Chưa Đưa Vào MVP
Chưa cần ví điện tử, lịch sử chỉnh sửa chi tiết, hay phân quyền quản trị nhiều tầng vì các phần đó chưa phục vụ luồng Must đầu tiên.
<!-- anchor: id=03-data-model/deferred-data  src=apps/mobile/src/features/data-model/dataModel.ts::deferredDataNotes  rev=  status=planned -->
