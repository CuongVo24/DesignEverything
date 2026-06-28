## Tại sao cần file này
File này chốt các quyết định kỹ thuật đủ để build mà không biến kiến trúc thành sân chơi của trend. Mọi lựa chọn trong đây phải nối ngược về cách người dùng thật sự dùng sản phẩm.

## Hướng Triển Khai Tổng Quan
Offline-first. Cần lưu trữ logs hoàn thành thói quen cục bộ bằng SQLite; đồng bộ lên Supabase PostgreSQL khi có mạng.
<!-- anchor: id=05-architecture/overview  src=apps/mobile/src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
React Native + Expo để build cross-platform nhanh chóng và dễ test trên thiết bị thật qua Expo Go.
<!-- anchor: id=05-architecture/client-rendering  src=apps/mobile/src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
Cần thông báo nhắc nhở (push notifications) hàng ngày qua Expo Notification Service (hoặc FCM) lúc 8 giờ sáng để nhắc nhở người dùng thực hiện thói quen.
<!-- anchor: id=05-architecture/auth-access  src=apps/mobile/src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
Phát hành bản thử nghiệm qua Expo Application Services (EAS) Internal Testing trước, sau đó phát hành lên Apple App Store và Google Play Store (áp dụng mô hình miễn phí kèm gói Premium mua qua In-App Purchase).
<!-- anchor: id=05-architecture/realtime-sync  src=apps/mobile/src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
React Native + Expo để build cross-platform nhanh chóng và dễ test trên thiết bị thật qua Expo Go.
<!-- anchor: id=05-architecture/device-capabilities  src=apps/mobile/src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->
