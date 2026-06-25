## Tại sao cần file này
File này chốt các quyết định kỹ thuật vừa đủ để build bản đầu mà không biến kiến trúc thành nơi chạy theo trend. Mọi lựa chọn trong đây đều phải nối ngược về cách nhóm ở trọ thật sự sẽ dùng app.

## Hướng Triển Khai Tổng Quan
Sản phẩm được ưu tiên theo hướng mobile, phục vụ cả iPhone lẫn Android, nên kiến trúc MVP chọn cách tiếp cận cross-platform để giảm thời gian dựng hai app riêng.
<!-- anchor: id=05-architecture/overview  src=apps/mobile/src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
Ứng dụng ưu tiên trải nghiệm di động trước, tối ưu cho thao tác ghi khoản chi và xem số nợ nhanh trên điện thoại. Không cần các quyết định rendering kiểu SEO của web vì đây là app đóng cho người đã tham gia nhóm.
<!-- anchor: id=05-architecture/client-rendering  src=apps/mobile/src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
Người dùng cần xác thực để chỉ nhìn thấy đúng dữ liệu nhóm mình. Đăng nhập Google là hướng nên có ngay sau phần lõi Must, kèm phương án email/password làm fallback khi cần.
<!-- anchor: id=05-architecture/auth-access  src=apps/mobile/src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
MVP đi theo hướng online-first. Chưa cần realtime hoàn toàn và chưa cần offline-first đầy đủ vì điều đó sẽ làm sync và conflict phức tạp hơn nhiều. Push notification chỉ nên thêm cho luồng nhắc thanh toán sau khi phần ghi và chia tiền đã chạy ổn.
<!-- anchor: id=05-architecture/realtime-sync  src=apps/mobile/src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
Quyền thiết bị cần cho MVP chỉ gồm camera hoặc thư viện ảnh để đính kèm hóa đơn. Chưa cần GPS, danh bạ hoặc micro vì không phục vụ trực tiếp cho luồng Must.
<!-- anchor: id=05-architecture/device-capabilities  src=apps/mobile/src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->
