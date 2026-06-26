# RecipeShare — Tài liệu nền móng dự án

> Đây là tài liệu nền móng mẫu được thiết kế chuẩn chỉnh cho dự án Web RecipeShare theo phương pháp DesignEverything.

## Tại sao cần file này
File này đóng vai trò là bản đồ chỉ đường (cửa vào) cho toàn bộ tài liệu dự án. Nó chỉ dẫn thứ tự đọc tối ưu nhất để bất kỳ lập trình viên nào mới tham gia dự án (hoặc AI coding agent) đều có thể nhanh chóng nắm bắt ý đồ sản phẩm và kiến trúc kỹ thuật trước khi bắt tay vào viết code.

## Thứ tự đọc tài liệu kiến nghị

Đọc theo đúng thứ tự logic dưới đây để hiểu dự án từ Ý tưởng $\rightarrow$ Tính năng $\rightarrow$ Dữ liệu $\rightarrow$ Luồng $\rightarrow$ Kiến trúc:

1.  **[00-vision.md](00-vision.md)**: Định nghĩa RecipeShare là gì, giải quyết nỗi đau nào của nhóm bạn, và cách họ đang xoay xở khi chưa có trang web.
2.  **[01-personas.md](01-personas.md)**: Chi tiết về hai đối tượng người dùng chính (My - người đăng công thức, Huy - người xem danh sách đi chợ) để định hình tính năng giao diện.
3.  **[02-scope.md](02-scope.md)**: Phân rã phạm vi tính năng theo MoSCoW (Must/Should/Could/Won't) để khóa chặt những gì sẽ code ở MVP.
4.  **[03-data-model.md](03-data-model.md)**: Đặc tả cấu trúc database (User, Recipe, ShoppingList,...) và các mối quan hệ giữa các bảng.
5.  **[04-flows.md](04-flows.md)**: Mô tả chi tiết hành trình của Huy từ lúc tìm công thức nấu ăn đến khi tích chọn mua nguyên liệu tại siêu thị.
6.  **[05-architecture.md](05-architecture.md)**: Các quyết định kỹ thuật cốt lõi (Next.js SSR/CSR, Responsive Web, NextAuth Google OAuth).
7.  **[06-constraints.md](06-constraints.md)**: Các giới hạn thực tế buộc phải tuân thủ (1 dev, 3 tuần, zero budget).
8.  **[07-deployment.md](07-deployment.md)**: Quy trình deploy lên Vercel free-tier, cấu hình database và quản lý các biến môi trường nhạy cảm.

---

## Cấu trúc cây thư mục tài liệu

```text
docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thể dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
└── README.md             # Mục lục tài liệu (File này)
```
