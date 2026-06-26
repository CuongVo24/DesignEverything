# Golden Example — Quality Score (Web)

## Tại sao cần file này
File này tự đánh giá và chấm điểm cây tài liệu `docs/` của dự án mẫu RecipeShare (nhánh Web) theo đúng các tiêu chí trong Quality Rubric. Điều này đảm bảo rằng tài liệu mẫu đạt chất lượng vàng trước khi được dùng làm fixture hoặc dữ liệu đối chiếu.

## Kết quả tổng quan
*   `00-vision.md`: Pass A + B
*   `01-personas.md`: Pass A + B
*   `02-scope.md`: Pass A + B + C (Must là tập tối thiểu hoạt động được, có lý do phân chia rõ ràng)
*   `03-data-model.md`: Pass A + B
*   `04-flows.md`: Pass A + B
*   `05-architecture.md`: Pass A + B (Các quyết định kỹ thuật bám sát W1-W5 và nhu cầu người dùng)
*   `06-constraints.md`: Pass A + B
*   `07-deployment.md`: Pass A + B (Deploy lên Vercel free-tier cho nhánh Web)
*   `README.md`: Pass A

## Ghi chú chấm điểm
*   **Bám sát thực tế**: Toàn bộ tài liệu được soạn thảo xoay quanh dự án RecipeShare giả lập, không sử dụng các khái niệm chung chung hay mơ hồ.
*   **Phân chia Scope hợp lý**: MVP chốt đúng các tính năng cốt lõi cho nhóm bạn (Must: tìm kiếm, xem món, tạo món; Should: đăng nhập Google, tạo danh sách ShoppingList).
*   **Kiến trúc Web đồng bộ**:
    *   Sử dụng Next.js (SSR/SSG) để giải quyết bài toán SEO của trang công thức nấu ăn công khai (W1).
    *   Thiết kế Responsive và Mobile-first đáp ứng nhu cầu xem danh sách đi chợ trên điện thoại khi đi siêu thị (W2).
    *   Deploy Vercel free-tier đáp ứng tiêu chí nhanh, ổn định và không tốn phí (W3).
*   **Mỏ neo truy vết đầy đủ**: Mọi phần tài liệu đều kết thúc bằng anchor tương ứng dạng ẩn mang trạng thái `status=planned`.
