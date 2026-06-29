## Tại sao cần file này
File này giữ cho dữ liệu bám đúng những gì sản phẩm thật sự cần nhớ. Nếu không chốt sớm, dự án rất dễ bịa thêm entity không phục vụ tính năng nào nhưng vẫn làm kiến trúc nặng lên.

## Thực Thể Chính
- **User**: Người dùng (id, name, email, avatar).
- **Team**: Nhóm làm việc (id, name, owner_id).
- **Task**: Công việc (id, title, description, due_date, status, team_id).
- **TaskComment**: Bình luận công việc (id, task_id, author_id, text, created_at).
- **Assignment**: Phân công công việc (id, task_id, assignee_id, assigned_at).
<!-- anchor: id=03-data-model/core-entities  src=apps/mobile/src/features/data-model/dataModel.ts::coreEntities  rev=  status=planned -->

## Quan Hệ Giữa Các Thực Thể
- `Team` (1) - (N) `User` (Thông qua bảng liên kết thành viên).
- `Team` (1) - (N) `Task` (Một nhóm có nhiều công việc).
- `Task` (1) - (N) `TaskComment` (Một công việc có nhiều bình luận).
- `Task` (1) - (N) `Assignment` (Một công việc được giao cho nhiều người).
<!-- anchor: id=03-data-model/entity-relationships  src=apps/mobile/src/features/data-model/dataModel.ts::entityRelationships  rev=  status=planned -->

## Ghi Chú Về Phần Chưa Đưa Vào MVP
- Trì hoãn việc tích hợp hệ thống đo lường hiệu suất làm việc nhóm tự động và đồng bộ lịch Google Calendar.
<!-- anchor: id=03-data-model/deferred-data  src=apps/mobile/src/features/data-model/dataModel.ts::deferredDataNotes  rev=  status=planned -->
