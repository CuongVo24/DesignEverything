# Golden Example — Quality Score (Web)

## Tại sao cần file này
File này tự đánh giá và chấm điểm cây tài liệu `docs/` của dự án mẫu RecipeShare (nhánh Web) theo đúng các tiêu chí trong Quality Rubric. Điều này đảm bảo rằng tài liệu mẫu đạt chất lượng vàng trước khi được dùng làm fixture hoặc dữ liệu đối chiếu.

## Kết quả tổng quan
*   `00-vision.md`: Pass A + B (Elevator pitch rõ ràng, nỗi đau thực tế)
*   `01-personas.md`: Pass A + B (Persona chính/phụ cụ thể, JTBD rõ rệt)
*   `02-scope.md`: Pass A + B + C (Must-have là tập tối thiểu hoạt động được, có lý do phân chia rõ ràng)
*   `03-data-model.md`: Pass A + B (Entity suy trực tiếp từ scope, có quan hệ thực thể, có dữ liệu để lại sau)
*   `04-flows.md`: Pass A + B (Luồng điển hình bám sát tính năng Must, chỉ ra rủi ro/ca biên)
*   `05-architecture.md`: Pass A + B (Next.js SSR/SSG giải quyết bài toán SEO và Responsive Web)
*   `06-constraints.md`: Pass A + B (Ràng buộc solo dev, deadline 3 tuần, zero budget ảnh hưởng trực tiếp đến scope)
*   `07-deployment.md`: Pass A + B (Triển khai CI/CD tự động lên Vercel free-tier)
*   `README.md`: Pass A (Bản đồ thư mục rõ ràng, thứ tự đọc logic, branch note)

## Bảng điểm chi tiết đối chiếu Quality Rubric

| File | Tiêu chí Rubric | Trạng thái | Điểm | Ghi chú |
|:---|:---|:---:|---:|:---|
| Mọi file | Có "Tại sao cần file này", dịch ngược chuẩn, mỏ neo ẩn | ĐẠT | 10/10 | Tất cả các tệp đều có mục mục đích, ngôn ngữ dịch ngược và anchor status=planned. |
| `00-vision.md` | Elevator pitch súc tích + Nỗi đau cụ thể của nhóm bạn | ĐẠT | 10/10 | Tránh pitch chung chung, tập trung vào chia sẻ công thức và gộp nguyên liệu. |
| `01-personas.md` | 2 người dùng cụ thể (My, Huy) + JTBD rõ ràng | ĐẠT | 10/10 | Chia rõ rệt nhu cầu người đăng món (My) và người đi chợ (Huy). |
| `02-scope.md` | Phân tầng MoSCoW, Must-have là tập nhỏ nhất để chạy được | ĐẠT | 10/10 | Chỉ giữ đăng nhập, xem/tạo/tìm công thức ở Must, đẩy bình luận sang Won't. |
| `03-data-model.md` | Entity thực tế từ scope, quan hệ 1-N/1-1, deferred data | ĐẠT | 10/10 | Khớp chính xác với các thực thể User, Recipe, ShoppingList. |
| `04-flows.md` | Luồng điển hình tìm món -> tích chọn mua đồ, edge cases | ĐẠT | 10/10 | Ghi nhận rủi ro mất kết nối mạng tại siêu thị và trùng nguyên liệu khác đơn vị. |
| `05-architecture.md` | Quyết định kỹ thuật Next.js SSR/CSR, Responsive khớp W1-W5 | ĐẠT | 10/10 | SSR cho SEO trang công khai, CSR cho trang ShoppingList bảo mật. |
| `06-constraints.md` | Ràng buộc nhân sự (solo), thời gian (3 tuần), ngân sách | ĐẠT | 10/10 | Giới hạn trực tiếp đến scope của MVP để kịp tiến độ. |
| `07-deployment.md` | Pipeline Vercel, serverless DB Neon/Supabase, variables | ĐẠT | 10/10 | Chỉ dẫn deploy Web chi tiết, không nhầm sang mobile. |

> **Tổng điểm**: **90 / 90 (Đạt chất lượng tối đa - Reference Level)**
