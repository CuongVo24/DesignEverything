## Tại sao cần file này
Tài liệu này ghi nhận các ràng buộc thực tế về tài nguyên, thời gian, ngân sách và nhân sự của dự án. Nhận diện các ràng buộc này giúp kiểm soát phạm vi phát triển của MVP, đưa ra các quyết định kỹ thuật thực tế và không sa đà vào các thiết kế quá quy mô so với khả năng.

## Nhân Lực Và Cách Làm
*   **Solo Developer**: Dự án chỉ do một lập trình viên duy nhất thực hiện toàn bộ từ thiết kế UI, frontend, backend đến cấu hình deployment. Do đó, các công nghệ được lựa chọn phải có độ tích hợp cao (Next.js) và giảm thiểu boilerplate.
<!-- anchor: id=06-constraints/team-ownership  src=src/features/constraints/constraints.ts::teamAndOwnershipConstraints  rev=  status=planned -->

## Deadline Và Mức Gấp
*   **Deadline 3 tuần**: Tiến độ cực kỳ gấp để kịp dịp sinh nhật nhóm bạn.
    *   **Tuần 1**: Hoàn thành cấu hình hạ tầng, spec tài liệu và thiết kế database.
    *   **Tuần 2**: Triển khai luồng nấu ăn chính (tạo công thức, tìm kiếm, đăng nhập).
    *   **Tuần 3**: Hoàn thiện luồng đi chợ (ShoppingList), kiểm thử và deploy chính thức.
<!-- anchor: id=06-constraints/timeline  src=src/features/constraints/constraints.ts::timelineConstraints  rev=  status=planned -->

## Ngân Sách Và Giới Hạn Công Cụ
*   **Ngân sách bằng 0 (Zero Budget)**: Không có chi phí để duy trì server hay cơ sở dữ liệu trả phí.
    *   **Hosting**: Sử dụng Vercel free-tier.
    *   **Database**: Sử dụng PostgreSQL free-tier trên Supabase hoặc Neon.
    *   **Authentication**: Dùng Google Client ID miễn phí.
<!-- anchor: id=06-constraints/budget  src=src/features/constraints/constraints.ts::budgetConstraints  rev=  status=planned -->

## Ảnh Hưởng Lên Scope
*   **Môi trường Web & Cắt giảm Scope**: Chạy trên mọi trình duyệt hiện đại. Không yêu cầu cài đặt ứng dụng qua các kho ứng dụng (App Store, Google Play Store), giúp người dùng dễ dàng truy cập ngay lập tức bằng cách click vào link chia sẻ. Mọi tính năng phức tạp như notification thời gian thực, offline sync nâng cao đều được cắt giảm để đảm bảo tiến độ 3 tuần của 1 dev.
<!-- anchor: id=06-constraints/scope-impact  src=src/features/constraints/constraints.ts::constraintImpactOnScope  rev=  status=planned -->
