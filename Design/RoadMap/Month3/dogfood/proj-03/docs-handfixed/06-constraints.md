## Tại sao cần file này
File này giữ dự án đứng trên mặt đất. Nó nhắc mọi người rằng thời gian, nhân lực và ngân sách không phải phần phụ, mà là thứ quyết định MVP thực tế lớn hay nhỏ đến đâu.

## Nhân Lực Và Cách Làm
- Nhóm phát triển gồm 3 lập trình viên làm việc cùng nhau (PM/Lead, Backend Dev, Mobile Dev).
<!-- anchor: id=06-constraints/team-ownership  src=apps/mobile/src/features/constraints/constraints.ts::teamAndOwnershipConstraints  rev=  status=planned -->

## Deadline Và Mức Gấp
- Thời gian phát triển tối đa 6 tuần để kịp ra mắt bản chạy thử nội bộ doanh nghiệp.
<!-- anchor: id=06-constraints/timeline  src=apps/mobile/src/features/constraints/constraints.ts::timelineConstraints  rev=  status=planned -->

## Ngân Sách Và Giới Hạn Công Cụ
- Sử dụng hạ tầng tự có (Self-hosted Postgres, Firebase Cloud Messaging free-tier) và máy chủ của doanh nghiệp.
<!-- anchor: id=06-constraints/budget  src=apps/mobile/src/features/constraints/constraints.ts::budgetConstraints  rev=  status=planned -->

## Ảnh Hưởng Lên Scope
- Đẩy toàn bộ phần dashboard thống kê hiệu suất Gantt phức tạp sang giai đoạn sau. Chỉ làm offline-first task sync và push notifications ở MVP.
<!-- anchor: id=06-constraints/scope-impact  src=apps/mobile/src/features/constraints/constraints.ts::constraintImpactOnScope  rev=  status=planned -->
