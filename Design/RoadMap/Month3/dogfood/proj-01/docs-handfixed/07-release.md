## Tại sao cần file này
File này kéo việc phát hành mobile về đúng thực tế: còn bản thử, ký app, review store và chiến lược phân phối. Nếu không chốt sớm, người mới rất dễ nghĩ code xong là publish được ngay.

## Mục Tiêu Phát Hành Giai Đoạn Đầu
*   **Phát hành bản thử nghiệm nội bộ trước**: Mục tiêu là phân phối bản dựng tới nhóm tester gồm 10 người dùng đầu tiên để lấy feedback phản hồi nhanh và kiểm chứng SQLite sync.
<!-- anchor: id=07-release/release-goal  src=apps/mobile/src/features/release/release.ts::releaseGoal  rev=  status=planned -->

## Kênh Phân Phối Thử Hoặc Phát Hành
*   **iOS**: Sử dụng Expo Application Services (EAS) Build để tạo bản `.ipa` và phân phối qua TestFlight.
*   **Android**: Build tệp tin `.aab` (Android App Bundle) qua EAS và phân phối qua Google Play Console Closed Testing (Internal track).
<!-- anchor: id=07-release/distribution-strategy  src=apps/mobile/src/features/release/release.ts::distributionStrategy  rev=  status=planned -->

## Chuẩn Bị Cho Store
*   **App Signing**: EAS Build tự động quản lý credentials và keystore cho Android, cũng như provisioning profiles cho iOS.
*   **Review Readiness**: Chuẩn bị đầy đủ thông tin mô tả ứng dụng, screenshot màn hình thiết bị thật, đường link điều khoản bảo mật (Privacy Policy), và tài khoản demo đăng nhập sẵn cho các kiểm duyệt viên của Apple và Google review.
<!-- anchor: id=07-release/store-readiness  src=apps/mobile/src/features/release/release.ts::storeReadinessNotes  rev=  status=planned -->

## Kiếm Tiền Hoặc Chưa Kiếm Tiền
*   **Freemium**: Tải ứng dụng miễn phí, cho phép tạo tối đa 3 thói quen.
*   **In-App Purchase (IAP)**: Người dùng có thể mua gói Premium ($1.99/tháng hoặc mua đứt $9.99) thông qua thư viện `expo-in-app-purchases` kết hợp cổng thanh toán RevenueCat để tạo thói quen không giới hạn và xem các biểu đồ thống kê chuyên sâu.
<!-- anchor: id=07-release/monetization-strategy  src=apps/mobile/src/features/release/release.ts::monetizationStrategy  rev=  status=planned -->
