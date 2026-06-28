## Tại sao cần file này
File này biến danh sách tính năng thành một lần dùng thật từ đầu tới cuối. Nếu flow không trơn, rất có thể scope hoặc data model vẫn chưa chốt đúng.

## Luồng Điển Hình
Nam mở ứng dụng HabitBuilder, nhanh chóng click vào nút dấu cộng để thêm thói quen "Đọc sách 30 phút" mỗi ngày vào lúc 21h00. Mỗi ngày, ứng dụng gửi thông báo đẩy để nhắc nhở, Nam mở ứng dụng và tích chọn để đánh dấu hoàn thành, sau đó xem biểu đồ tiến trình dạng hình tròn cập nhật trực quan.
<!-- anchor: id=04-flows/main-flow-summary  src=apps/mobile/src/features/flows/flows.ts::mainFlowSummary  rev=  status=planned -->

## Các Bước Chính
*   **Bước 1: Khởi tạo thói quen**: Nam mở app, nhập tên thói quen, cấu hình tần suất hàng ngày và giờ nhắc nhở. Hệ thống lưu vào database cục bộ và sync lên server.
*   **Bước 2: Nhắc nhở hàng ngày**: Hệ thống tự động kích hoạt thông báo đẩy nhắc Nam thực hiện khi đến giờ.
*   **Bước 3: Tích chọn hoàn thành**: Nam click hoàn thành trên giao diện. Trạng thái thói quen đổi sang checked. Hệ thống ghi một bản ghi hoàn thành mới (`HabitLog`) lưu lại thời gian cụ thể.
*   **Bước 4: Đối tác nhận thông báo**: Hệ thống tự động gửi thông báo đẩy đến điện thoại của An để thông báo Nam đã hoàn thành thói quen.
<!-- anchor: id=04-flows/main-flow-steps  src=apps/mobile/src/features/flows/flows.ts::mainFlowSteps  rev=  status=planned -->

## Điểm Dễ Vỡ Hoặc Cần Làm Rõ
*   **Xử lý offline**: Nam tích chọn hoàn thành khi đang đi máy bay hoặc ngoài vùng phủ sóng. Trạng thái completed được lưu cục bộ trong SQLite và cần đánh dấu cờ chờ sync (`pendingSync`). Khi có mạng trở lại, ứng dụng phải tự động đẩy logs này lên Supabase và trigger thông báo đẩy muộn cho An mà không gây trùng lặp dữ liệu.
<!-- anchor: id=04-flows/flow-risks  src=apps/mobile/src/features/flows/flows.ts::flowRisks  rev=  status=planned -->
