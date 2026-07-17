## Tại sao cần file này
File này biến danh sách tính năng thành một lần dùng thật từ đầu tới cuối. Nếu flow không trơn, rất có thể scope hoặc data model vẫn chưa chốt đúng.

## Luồng Điển Hình
Mở ứng dụng -> Thêm thói quen (tên, tần suất) -> Mỗi ngày mở app tích chọn -> Xem màn hình thống kê tiến độ hình tròn.
<!-- anchor: id=04-flows/main-flow-summary  src=apps/mobile/src/features/flows/flows.ts::mainFlowSummary  rev=  status=planned -->

## Các Bước Chính
Mở ứng dụng -> Thêm thói quen (tên, tần suất) -> Mỗi ngày mở app tích chọn -> Xem màn hình thống kê tiến độ hình tròn.
<!-- anchor: id=04-flows/main-flow-steps  src=apps/mobile/src/features/flows/flows.ts::mainFlowSteps  rev=  status=planned -->

## Sơ Đồ Luồng Chính
```mermaid
graph LR
  S0["Mở ứng dụng"]
  S1["Thêm thói quen (tên, tần suất)"]
  S2["Mỗi ngày mở app tích chọn"]
  S3["Xem màn hình thống kê tiến độ hình tròn."]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

Đây là luồng chính — cũng chính là thứ phải chạy được end-to-end ở milestone M0 (xem `08-build-plan.md`). Mỗi lần xong một milestone, chạy lại đúng luồng này như một người dùng thật.
<!-- anchor: id=04-flows/diagram  src=apps/mobile/src/features/flows/flows.ts::flowDiagram  rev=  status=planned -->

## Điểm Dễ Vỡ Hoặc Cần Làm Rõ
Mở ứng dụng -> Thêm thói quen (tên, tần suất) -> Mỗi ngày mở app tích chọn -> Xem màn hình thống kê tiến độ hình tròn.
<!-- anchor: id=04-flows/flow-risks  src=apps/mobile/src/features/flows/flows.ts::flowRisks  rev=  status=planned -->
