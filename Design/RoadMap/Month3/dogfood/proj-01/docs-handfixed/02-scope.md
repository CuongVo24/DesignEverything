## Tại sao cần file này
File này là cái phanh của dự án. Nó buộc cả người làm lẫn agent phải phân biệt phần bắt buộc để sản phẩm có ích ngay với phần nên để sau, thay vì gọi mọi thứ là “cần”.

## Must Have
Các tính năng bắt buộc phải có cho MVP:
*   **Đăng nhập tài khoản**: Đăng nhập qua Firebase Auth / Supabase Auth.
*   **Tạo thói quen**: Nhập tên thói quen, chọn tần suất và thời gian nhắc nhở.
*   **Tích chọn hoàn thành**: Giao diện check-off nhanh thói quen trong ngày.
*   **Xem thống kê tuần**: Xem tiến độ hoàn thành thói quen trong 7 ngày gần nhất.
<!-- anchor: id=02-scope/must-have  src=apps/mobile/src/features/scope/scope.ts::mustHaveScope  rev=  status=planned -->

## Should Have
Nên có nhưng không chặn phát hành ban đầu:
*   **Đồng bộ dữ liệu cục bộ**: Hỗ trợ lưu SQLite tạm thời khi mất mạng và đồng bộ sau.
*   **Thông báo đẩy nhắc nhở**: Nhắc Nam làm thói quen lúc 8 giờ sáng hàng ngày.
<!-- anchor: id=02-scope/should-have  src=apps/mobile/src/features/scope/scope.ts::shouldHaveScope  rev=  status=planned -->

## Could Have
Có thể làm nếu dư dả thời gian:
*   **Chia sẻ tiến độ**: Cho phép tạo link kết nối nhanh để chia sẻ bảng thành tích cho An.
<!-- anchor: id=02-scope/could-have  src=apps/mobile/src/features/scope/scope.ts::couldHaveScope  rev=  status=planned -->

## Won't For MVP
Quyết định để lại sau:
*   **Mạng xã hội thói quen**: Newsfeed, bảng xếp hạng toàn cầu, bình luận và thả tim tiến độ.
<!-- anchor: id=02-scope/wont-for-mvp  src=apps/mobile/src/features/scope/scope.ts::wontForMvpScope  rev=  status=planned -->
