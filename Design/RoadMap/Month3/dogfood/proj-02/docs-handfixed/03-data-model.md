## Tại sao cần file này
File này giữ cho dữ liệu bám đúng những gì sản phẩm thật sự cần nhớ. Nếu không chốt sớm, dự án rất dễ bịa thêm entity không phục vụ tính năng nào nhưng vẫn làm kiến trúc nặng lên.

## Thực Thể Chính
- **User**: Lưu thông tin tài khoản (id, email, name, role).
- **Book**: Lưu thông tin sách (id, title, author, isbn, owner_id).
- **ReadingLog**: Nhật ký đọc sách (id, book_id, page_number, note, read_at).
- **BorrowRequest**: Yêu cầu mượn sách (id, book_id, borrower_id, status, requested_at).
<!-- anchor: id=03-data-model/core-entities  src=src/features/data-model/dataModel.ts::coreEntities  rev=  status=planned -->

## Quan Hệ Giữa Các Thực Thể
- `User` (1) - (N) `Book` (Một người dùng sở hữu nhiều sách).
- `Book` (1) - (N) `ReadingLog` (Một quyển sách có nhiều nhật ký đọc).
- `Book` (1) - (N) `BorrowRequest` (Một quyển sách có nhiều lượt yêu cầu mượn).
<!-- anchor: id=03-data-model/entity-relationships  src=src/features/data-model/dataModel.ts::entityRelationships  rev=  status=planned -->

## Ghi Chú Về Phần Chưa Đưa Vào MVP
- Trì hoãn việc lưu trữ đánh giá sách chi tiết (Book Reviews) và hệ thống gợi ý sách tự động (Recommendation Engine) sang các phiên bản sau.
<!-- anchor: id=03-data-model/deferred-data  src=src/features/data-model/dataModel.ts::deferredDataNotes  rev=  status=planned -->
