## Tại sao cần file này
File này giữ dự án nằm trên mặt đất. Nó nhắc rằng phạm vi MVP không chỉ do ý tưởng quyết định, mà còn do số người làm, thời gian và ngân sách thật.

## Nhân Lực Và Cách Làm
Dự án được thực hiện bởi một người làm ngoài giờ, nên mọi quyết định phải ưu tiên đường ngắn nhất để có bản dùng thử thay vì tối ưu kiến trúc quá sớm.
<!-- anchor: id=06-constraints/team-ownership  src=apps/mobile/src/features/constraints/constraints.ts::teamAndOwnershipConstraints  rev=  status=planned -->

## Deadline Và Mức Gấp
Mục tiêu là có bản dùng thử trong khoảng một tháng. Điều này buộc MVP phải giữ rất gọn, chỉ tập trung vào một luồng chia tiền chạy trơn.
<!-- anchor: id=06-constraints/timeline  src=apps/mobile/src/features/constraints/constraints.ts::timelineConstraints  rev=  status=planned -->

## Ngân Sách Và Giới Hạn Công Cụ
Ngân sách gần mức free-tier, nên các quyết định triển khai cần ưu tiên công cụ miễn phí hoặc rẻ, tránh kéo thêm hạ tầng nặng hoặc bài toán sync tốn công sớm.
<!-- anchor: id=06-constraints/budget  src=apps/mobile/src/features/constraints/constraints.ts::budgetConstraints  rev=  status=planned -->

## Ảnh Hưởng Lên Scope
Vì solo, ít tiền và thời gian ngắn, MVP chỉ nên làm phần ghi chi, chia tiền và xem số nợ. Mọi thứ như offline-first đầy đủ, dashboard đẹp hoặc store public ngay đều phải để sau.
<!-- anchor: id=06-constraints/scope-impact  src=apps/mobile/src/features/constraints/constraints.ts::constraintImpactOnScope  rev=  status=planned -->
