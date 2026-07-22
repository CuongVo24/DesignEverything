# Đặc Tả Tính Năng: Tạo công thức

## Tại sao cần file này
Tài liệu này đặc tả chi tiết về một tính năng quan trọng (Must-have), mô tả mục tiêu, luồng đi điển hình, các ca biên, lỗi hệ thống, và tiêu chí nghiệm thu. File đặc tả này giúp lập trình viên hiện thực hóa chính xác các yêu cầu nghiệp vụ và là căn cứ để viết các ca kiểm thử.

---

## 1. Mục Tiêu & Mô Tả (Goal & Description)
Cho phép người dùng tạo mới một công thức nấu ăn bằng cách nhập tiêu đề, danh sách nguyên liệu và các bước thực hiện chi tiết.
<!-- anchor: id=design-feature-spec/goal/t-o-c-ng-th-c  src=src/features/t-o-c-ng-th-c/spec.ts::featureGoal  rev=  status=planned -->
> Nguồn: doc:docs/02-scope.md#02-scope/must-have

## 2. Luồng Nghiệp Vụ Điển Hình (Typical Flow)
Người dùng chọn nút Tạo công thức -> điền thông tin vào form -> nhấp Lưu -> Hệ thống lưu dữ liệu và chuyển hướng người dùng về trang chi tiết công thức vừa tạo.
<!-- anchor: id=design-feature-spec/flow/t-o-c-ng-th-c  src=src/features/t-o-c-ng-th-c/flow.ts::typicalFlow  rev=  status=planned -->
> Nguồn: doc:docs/04-flows.md#04-flows/main-flow-steps

## 3. Các Ca Biên & Lỗi (Edge Cases & Error States)
Trường hợp người dùng bỏ trống các trường bắt buộc hoặc nhập danh sách nguyên liệu không đúng định dạng.
<!-- anchor: id=design-feature-spec/edge-cases/t-o-c-ng-th-c  src=src/features/t-o-c-ng-th-c/edge.ts::edgeCases  rev=  status=planned -->
> Nguồn: answers:DS2@t-o-c-ng-th-c

## 4. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
Lưu trữ công thức mới vào cơ sở dữ liệu và hiển thị thông báo lưu thành công; hiển thị lỗi validate chi tiết ngay tại từng ô nhập liệu bị lỗi.
<!-- anchor: id=design-feature-spec/acceptance/t-o-c-ng-th-c  src=src/features/t-o-c-ng-th-c/acceptance.ts::acceptanceCriteria  rev=  status=planned -->
> Nguồn: answers:DS2@t-o-c-ng-th-c
