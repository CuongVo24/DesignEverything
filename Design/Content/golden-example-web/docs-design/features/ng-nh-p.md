# Đặc Tả Tính Năng: Đăng nhập

## Tại sao cần file này
Tài liệu này đặc tả chi tiết về một tính năng quan trọng (Must-have), mô tả mục tiêu, luồng đi điển hình, các ca biên, lỗi hệ thống, và tiêu chí nghiệm thu. File đặc tả này giúp lập trình viên hiện thực hóa chính xác các yêu cầu nghiệp vụ và là căn cứ để viết các ca kiểm thử.

---

## 1. Mục Tiêu & Mô Tả (Goal & Description)
Xác thực danh tính người dùng thông qua email/mật khẩu hoặc Google OAuth để cấp quyền truy cập các tính năng quản lý công thức cá nhân.
<!-- anchor: id=design-feature-spec/goal/ng-nh-p  src=src/features/ng-nh-p/spec.ts::featureGoal  rev=  status=planned -->
> Nguồn: doc:docs/02-scope.md#02-scope/must-have

## 2. Luồng Nghiệp Vụ Điển Hình (Typical Flow)
Người dùng truy cập trang -> chọn Đăng nhập -> nhập Email & Mật khẩu -> Hệ thống xác thực và chuyển hướng về màn hình chính.
<!-- anchor: id=design-feature-spec/flow/ng-nh-p  src=src/features/ng-nh-p/flow.ts::typicalFlow  rev=  status=planned -->
> Nguồn: doc:docs/04-flows.md#04-flows/main-flow-steps

## 3. Các Ca Biên & Lỗi (Edge Cases & Error States)
Xử lý khi người dùng nhập sai mật khẩu quá 5 lần, hoặc tài khoản chưa được kích hoạt qua email.
<!-- anchor: id=design-feature-spec/edge-cases/ng-nh-p  src=src/features/ng-nh-p/edge.ts::edgeCases  rev=  status=planned -->
> Nguồn: answers:DS2@ng-nh-p

## 4. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
Đăng nhập thành công trả về JWT token hợp lệ và lưu vào localStorage; đăng nhập thất bại hiển thị thông báo lỗi rõ ràng.
<!-- anchor: id=design-feature-spec/acceptance/ng-nh-p  src=src/features/ng-nh-p/acceptance.ts::acceptanceCriteria  rev=  status=planned -->
> Nguồn: answers:DS2@ng-nh-p
