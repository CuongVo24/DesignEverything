# RecipeShare — Tài liệu nền móng dự án

> Đây là tài liệu nền móng mẫu được thiết kế chuẩn chỉnh cho dự án Web RecipeShare theo phương pháp DesignEverything.

## Tại sao cần file này
File này đóng vai trò là bản đồ chỉ đường (cửa vào) cho toàn bộ tài liệu dự án. Nó giúp người mới biết nên đọc theo thứ tự nào và mỗi file trong bộ docs dùng để trả lời câu hỏi gì, thay vì mở ra một thư mục rồi không biết bắt đầu từ đâu.

## Đọc Theo Thứ Tự Này
1. `00-vision.md` — hiểu dự án là gì và nỗi đau gốc ở đâu.
2. `01-personas.md` — hiểu ai là người dùng thật đầu tiên.
3. `02-scope.md` — chốt phần bắt buộc của MVP.
4. `03-data-model.md` — hiểu sản phẩm cần nhớ những gì.
5. `04-flows.md` — xem một luồng điển hình mở $\rightarrow$ xong việc.
6. `05-architecture.md` — xem các quyết định kỹ thuật bám theo nhu cầu.
7. `06-constraints.md` — xem giới hạn về người, thời gian, tiền.
8. `07-deployment.md` — xem quy trình CI/CD và cấu hình Hosting (Vercel).
<!-- anchor: id=docs-readme/reading-order  src=src/features/docs/readme.ts::readingOrder  rev=  status=planned -->

## Tóm Tắt Nhanh Dự Án
RecipeShare là một trang web giúp nhóm bạn chia sẻ công thức nấu ăn tự làm và tự động tổng hợp danh sách nguyên liệu cần mua (danh sách đi chợ) từ các công thức đã chọn.
<!-- anchor: id=docs-readme/project-summary  src=src/features/docs/readme.ts::projectSummary  rev=  status=planned -->

## Bản Đồ File
```text
docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
└── README.md             # Mục lục tài liệu (File này)
```
<!-- anchor: id=docs-readme/file-map  src=src/features/docs/readme.ts::fileMap  rev=  status=planned -->

## Ghi Chú Về Nhánh Đã Chọn
Dự án được triển khai trên nền tảng Web. Cấu hình triển khai Next.js/Vercel chi tiết ở 07-deployment.md.
<!-- anchor: id=docs-readme/branch-note  src=src/features/docs/readme.ts::branchSpecificDocNote  rev=  status=planned -->

## Ghi Chú Khi Bắt Đầu Build
Chạy local: `npm run dev`. Chạy tests: `npm test`.
<!-- anchor: id=docs-readme/build-notes  src=src/features/docs/readme.ts::buildNotes  rev=  status=planned -->
