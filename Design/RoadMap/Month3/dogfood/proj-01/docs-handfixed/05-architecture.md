## Tại sao cần file này
File này chốt các quyết định kỹ thuật đủ để build mà không biến kiến trúc thành sân chơi của trend. Mọi lựa chọn trong đây phải nối ngược về cách người dùng thật sự dùng sản phẩm.

## Hướng Triển Khai Tổng Quan
Ứng dụng sử dụng React Native kết hợp Expo để tối ưu phát triển cross-platform nhanh chóng cho cả iOS và Android. Hệ thống sử dụng mô hình Offline-first để đảm bảo Nam có thể tích chọn hoàn thành thói quen ngay lập tức kể cả khi mạng chập chờn.
<!-- anchor: id=05-architecture/overview  src=apps/mobile/src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
*   **React Native (Expo)**: Sử dụng mô hình Client-Side Rendering (CSR) trên thiết bị di động, render các native components thông qua JS bridge/New Architecture. Tận dụng Expo Router để cấu hình điều hướng dạng file-system routing.
<!-- anchor: id=05-architecture/client-rendering  src=apps/mobile/src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
*   **Supabase Auth**: Sử dụng email/password hoặc đăng nhập một chạm Apple Sign-In/Google Sign-In. Token được lưu trữ cục bộ an toàn bằng thư viện SecureStore của Expo.
<!-- anchor: id=05-architecture/auth-access  src=apps/mobile/src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
*   **Offline-first với SQLite**: Dữ liệu thói quen và logs hoàn thành được ghi trực tiếp vào SQLite trên thiết bị thông qua thư viện `expo-sqlite`.
*   **Supabase Realtime Sync**: Khi thiết bị có kết nối mạng, một background sync worker sẽ tự động đẩy các bản ghi thói quen chưa được đồng bộ (pending logs) lên bảng database Supabase PostgreSQL từ xa.
<!-- anchor: id=05-architecture/realtime-sync  src=apps/mobile/src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
*   **Notification Permission**: Ứng dụng xin quyền thông báo đẩy của hệ điều hành. Sử dụng Expo Notification Service (hoặc FCM/APNs) để kích hoạt thông báo đẩy lúc 8h sáng hàng ngày nhắc Nam làm thói quen và thông báo chéo sang điện thoại của An.
*   **Camera Permission**: Ứng dụng xin quyền truy cập Camera và Photo Library khi Nam muốn chụp ảnh minh chứng thói quen đã hoàn thành.
<!-- anchor: id=05-architecture/device-capabilities  src=apps/mobile/src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->
