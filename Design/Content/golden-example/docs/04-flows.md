## Tại sao cần file này
File này biến scope thành một lần dùng thật để kiểm tra xem sản phẩm có trơn hay chưa. Nếu một luồng điển hình còn gãy, nghĩa là scope hoặc data model vẫn chưa đủ thực dụng.

## Luồng Điển Hình
Người trả tiền trước mở app, ghi một khoản chi mới cho nhóm ở trọ, hệ thống chia số tiền cho từng thành viên, sau đó mỗi người vào xem mình còn nợ bao nhiêu.
<!-- anchor: id=04-flows/main-flow-summary  src=apps/mobile/src/features/flows/flows.ts::mainFlowSummary  rev=  status=planned -->

## Các Bước Chính
1. Người dùng chọn nhóm đang ở.
2. Tạo khoản chi mới, nhập tên khoản chi và số tiền.
3. Chọn những người cùng tham gia chia khoản đó.
4. Hệ thống tính phần chia cho từng người.
5. Người dùng lưu lại khoản chi.
6. Từng thành viên mở app để xem nghĩa vụ thanh toán của mình.
<!-- anchor: id=04-flows/main-flow-steps  src=apps/mobile/src/features/flows/flows.ts::mainFlowSteps  rev=  status=planned -->

## Điểm Dễ Vỡ Hoặc Cần Làm Rõ
Nếu một người không tham gia khoản chi cụ thể thì phải loại khỏi phép chia. Nếu ảnh hóa đơn chưa được tải lên hoặc mạng chậm, luồng ghi khoản chi vẫn phải hoàn tất được theo hướng online-first.
<!-- anchor: id=04-flows/flow-risks  src=apps/mobile/src/features/flows/flows.ts::flowRisks  rev=  status=planned -->
