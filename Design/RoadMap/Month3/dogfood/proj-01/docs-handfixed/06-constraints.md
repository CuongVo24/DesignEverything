## Tại sao cần file này
File này giữ dự án đứng trên mặt đất. Nó nhắc mọi người rằng thời gian, nhân lực và ngân sách không phải phần phụ, mà là thứ quyết định MVP thực tế lớn hay nhỏ đến đâu.

## Nhân Lực Và Cách Làm
*   **Đội ngũ 2 Lập trình viên**: Phân chia công việc song song (1 dev lo UI & client Expo, 1 dev lo cấu hình database Supabase và sync sync worker).
<!-- anchor: id=06-constraints/team-ownership  src=apps/mobile/src/features/constraints/constraints.ts::teamAndOwnershipConstraints  rev=  status=planned -->

## Deadline Và Mức Gấp
*   **Tiến độ 4 tuần**: Tiến độ gấp rút để kiểm thử nhanh giả thuyết của ứng dụng.
    *   **Tuần 1-2**: Hoàn thành UI thói quen, SQLite storage cục bộ.
    *   **Tuần 3**: Hoàn thiện Sync logic và Firebase Push notifications.
    *   **Tuần 4**: Build EAS, test nội bộ qua TestFlight và deploy lên Play Store / App Store.
<!-- anchor: id=06-constraints/timeline  src=apps/mobile/src/features/constraints/constraints.ts::timelineConstraints  rev=  status=planned -->

## Ngân Sách Và Giới Hạn Công Cụ
*   **Ngân sách nhỏ (~$100)**: Chỉ dùng cho phí đăng ký tài khoản Apple Developer ($99/năm). Phí Google Play Developer ($25 một lần) sẽ mượn tài khoản có sẵn hoặc hoãn lại. Sử dụng các dịch vụ đám mây miễn phí (Supabase free-tier).
<!-- anchor: id=06-constraints/budget  src=apps/mobile/src/features/constraints/constraints.ts::budgetConstraints  rev=  status=planned -->

## Ảnh Hưởng Lên Scope
*   **Tối giản hóa tính năng**: Để kịp ra mắt trong 4 tuần bởi 2 dev, ứng dụng cắt giảm hoàn toàn các tính năng chat thời gian thực phức tạp hay bảng tin xã hội; tập trung vào độ ổn định của SQLite offline sync và push notification nhắc nhở đúng giờ.
<!-- anchor: id=06-constraints/scope-impact  src=apps/mobile/src/features/constraints/constraints.ts::constraintImpactOnScope  rev=  status=planned -->
