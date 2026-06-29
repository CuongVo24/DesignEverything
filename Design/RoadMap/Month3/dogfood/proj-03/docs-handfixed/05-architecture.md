## Tại sao cần file này
File này chốt các quyết định kỹ thuật đủ để build mà không biến kiến trúc thành sân chơi của trend. Mọi lựa chọn trong đây phải nối ngược về cách người dùng thật sự dùng sản phẩm.

## Hướng Triển Khai Tổng Quan
Offline-first. Sử dụng WatermelonDB để đồng bộ hóa hiệu năng cao với PostgreSQL database qua REST API.
<!-- anchor: id=05-architecture/overview  src=apps/mobile/src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
React Native native CLI (không dùng Expo) để dễ dàng tích hợp các thư viện native chuyên sâu cho bảo mật.
<!-- anchor: id=05-architecture/client-rendering  src=apps/mobile/src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
Cần FCM push notifications gửi ngay lập tức khi có task được giao hoặc có thay đổi khẩn cấp.
<!-- anchor: id=05-architecture/auth-access  src=apps/mobile/src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
Phát hành qua Apple Enterprise Program và Google Play Console Beta Testing để phục vụ nội bộ doanh nghiệp trước khi phát hành rộng rãi (mô hình thu phí B2B subscription).
<!-- anchor: id=05-architecture/realtime-sync  src=apps/mobile/src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
React Native native CLI (không dùng Expo) để dễ dàng tích hợp các thư viện native chuyên sâu cho bảo mật.
<!-- anchor: id=05-architecture/device-capabilities  src=apps/mobile/src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->
