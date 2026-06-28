## Tại sao cần file này
File này giữ cho dữ liệu bám đúng những gì sản phẩm thật sự cần nhớ. Nếu không chốt sớm, dự án rất dễ bịa thêm entity không phục vụ tính năng nào nhưng vẫn làm kiến trúc nặng lên.

## Thực Thể Chính
Các thực thể dữ liệu cần quản lý trong database SQLite cục bộ và Supabase:

### 1. User
*   `id`: String (Primary Key)
*   `email`: String (Unique)
*   `name`: String
*   `createdAt`: DateTime

### 2. Habit
*   `id`: String (Primary Key)
*   `userId`: String (Foreign Key trỏ tới User)
*   `name`: String (Tên thói quen, vd "Chạy bộ")
*   `frequency`: String (Hàng ngày / các ngày cụ thể)
*   `reminderTime`: String (Giờ nhắc nhở)
*   `createdAt`: DateTime

### 3. HabitLog
*   `id`: String (Primary Key)
*   `habitId`: String (Foreign Key trỏ tới Habit)
*   `completedAt`: Date (Ngày hoàn thành)
*   `proofImageUrl`: String (Ảnh minh chứng - optional)

### 4. PartnerConnection
*   `id`: String (Primary Key)
*   `builderId`: String (Trỏ tới User tạo thói quen - Nam)
*   `partnerId`: String (Trỏ tới User theo dõi - An)
*   `status`: String (Đang chờ / Đã kết nối)
<!-- anchor: id=03-data-model/core-entities  src=apps/mobile/src/features/data-model/dataModel.ts::coreEntities  rev=  status=planned -->

## Quan Hệ Giữa Các Thực Thể
*   Một `User` có thể tạo ra nhiều `Habit` (Quan hệ 1 - Nhiều).
*   Một `Habit` có thể có nhiều bản ghi hoàn thành `HabitLog` theo ngày (Quan hệ 1 - Nhiều).
*   Hai `User` kết nối chéo với nhau qua bảng trung gian `PartnerConnection` (Quan hệ Nhiều - Nhiều).
<!-- anchor: id=03-data-model/entity-relationships  src=apps/mobile/src/features/data-model/dataModel.ts::entityRelationships  rev=  status=planned -->

## Ghi Chú Về Phần Chưa Đưa Vào MVP
*   Các bảng lưu tin nhắn chat thảo luận, bảng xếp hạng điểm thành tích toàn cầu sẽ hoãn lại và chưa thiết kế schema cho MVP.
<!-- anchor: id=03-data-model/deferred-data  src=apps/mobile/src/features/data-model/dataModel.ts::deferredDataNotes  rev=  status=planned -->
