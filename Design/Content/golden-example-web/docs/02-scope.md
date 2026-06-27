## Tại sao cần file này
Tài liệu này xác định rõ ranh giới của những gì sẽ làm và chưa làm trong phiên bản MVP đầu tiên. Phân nhóm rõ ràng theo phương pháp MoSCoW giúp dự án không bị phình to phạm vi (scope creep) và kịp tiến độ ra mắt trong 3 tuần.

## Yêu Cầu Bắt Buộc (Must-Have)
*   **Đăng nhập hệ thống**: Cần thiết để nhận diện người dùng và lưu trữ danh sách mua sắm riêng tư.
*   **Xem danh sách công thức**: Trang chủ hiển thị danh sách các món ăn đã đăng để mọi người lựa chọn.
*   **Tạo công thức nấu ăn mới**: My có thể nhập tên món, nguyên liệu, định lượng và các bước thực hiện.
*   **Tìm kiếm công thức**: Tìm kiếm nhanh công thức theo tên món ăn trên thanh tìm kiếm.
*   **Chia sẻ link công thức**: Người ngoài nhóm có thể vào xem công thức qua link công khai mà không bắt buộc đăng nhập (giải quyết bài toán SEO).
<!-- anchor: id=02-scope/must-have  src=src/features/scope/scope.ts::mustHaveScope  rev=  status=planned -->

## Yêu Cầu Nên Có (Should-Have)
*   **Đăng nhập bằng Google**: Giúp người dùng đăng nhập nhanh trên điện thoại mà không cần nhớ mật khẩu.
*   **Gom danh sách đi chợ (Shopping List)**: Bấm chọn công thức, hệ thống tự động trích xuất và gom các nguyên liệu cần mua vào một danh sách đi chợ tổng hợp.
*   **Đánh dấu đã mua**: Huy có thể tích chọn gạch bỏ các nguyên liệu đã nhặt vào giỏ hàng tại siêu thị.
<!-- anchor: id=02-scope/should-have  src=src/features/scope/scope.ts::shouldHaveScope  rev=  status=planned -->

## Yêu Cầu Có Thể Có (Could-Have)
*   **Sửa/Xóa công thức**: Cho phép tác giả tự chỉnh sửa hoặc xóa công thức của mình để sửa các lỗi chính tả hoặc cập nhật công thức tốt hơn.
<!-- anchor: id=02-scope/could-have  src=src/features/scope/scope.ts::couldHaveScope  rev=  status=planned -->

## Yêu Cầu Để Lại Sau (Won't-Have)
*   **Bình luận và đánh giá**: Sẽ triển khai ở phiên bản sau khi nhóm có nhu cầu tương tác sâu hơn.
*   **Tự động import công thức từ link ngoài**: Tính năng phức tạp, chưa cần thiết cho nhu cầu nội bộ.
<!-- anchor: id=02-scope/wont-for-mvp  src=src/features/scope/scope.ts::wontForMvpScope  rev=  status=planned -->
