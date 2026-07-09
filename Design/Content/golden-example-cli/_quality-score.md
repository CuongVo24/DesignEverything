# Golden Example — Quality Score (CLI)

## Tại sao cần file này
File này tự đánh giá và chấm điểm cây tài liệu `docs/` của dự án mẫu RecipeShare CLI theo đúng các tiêu chí trong Quality Rubric. Điều này đảm bảo rằng tài liệu mẫu đạt chất lượng vàng trước khi được dùng làm fixture hoặc dữ liệu đối chiếu.

## Kết quả tổng quan
*   `00-vision.md`: Pass A + B (Elevator pitch rõ ràng, nỗi đau thực tế)
*   `01-personas.md`: Pass A + B (Persona chính/phụ cụ thể, JTBD rõ rệt)
*   `02-scope.md`: Pass A + B + C (Must-have là tập tối thiểu hoạt động được, có lý do phân chia rõ ràng)
*   `03-data-model.md`: Pass A + B (Entity suy trực tiếp từ scope, có quan hệ thực thể, có dữ liệu để lại sau)
*   `04-flows.md`: Pass A + B (Luồng điển hình bám sát tính năng Must, chỉ ra rủi ro/ca biên)
*   `05-architecture.md`: Pass A + B + D (Kiến trúc CLI, phân bổ C1-C4 hợp lý)
*   `06-constraints.md`: Pass A + B (Ràng buộc solo dev, deadline 3 tuần, zero budget ảnh hưởng trực tiếp đến scope)
*   `07-distribution.md`: Pass A + B + D (Kênh phân phối NPM, quản lý phiên bản SemVer và hướng dẫn cài đặt)
*   `README.md`: Pass A (Bản đồ thư mục rõ ràng, thứ tự đọc logic, branch note)

## Bảng điểm chi tiết đối chiếu Quality Rubric

| File | Tiêu chí Rubric | Trạng thái | Điểm | Ghi chú |
|:---|:---|:---:|---:|:---|
| Mọi file | Có "Tại sao cần file này", dịch ngược chuẩn, mỏ neo ẩn | ĐẠT | 10/10 | Tất cả các tệp đều có mục mục đích, ngôn ngữ dịch ngược và anchor status=planned. |
| `00-vision.md` | Elevator pitch súc tích + Nỗi đau cụ thể của nhóm bạn | ĐẠT | 10/10 | Tập trung vào việc tìm kiếm và quản lý công thức trực tiếp bằng dòng lệnh. |
| `01-personas.md` | 2 người dùng cụ thể (My, Huy) + JTBD rõ ràng | ĐẠT | 10/10 | Phân tách vai trò đóng góp công thức và xem/tìm công thức. |
| `02-scope.md` | Phân tầng MoSCoW, Must-have là tập nhỏ nhất để chạy được | ĐẠT | 10/10 | Giữ tính năng thêm/xem/tìm ở Must, xuất file ở Should. |
| `03-data-model.md` | Entity thực tế từ scope, quan hệ 1-N/1-1, deferred data | ĐẠT | 10/10 | Khớp với User, Recipe, ShoppingList. |
| `04-flows.md` | Luồng điển hình tìm món -> đọc -> xuất shopping list | ĐẠT | 10/10 | Nêu luồng dòng lệnh hoàn chỉnh. |
| `05-architecture.md` | Kiến trúc CLI, runtime Node.js và cấu hình file cục bộ | ĐẠT | 10/10 | Phù hợp với môi trường CLI, lưu cấu hình cục bộ và giao diện flags. |
| `06-constraints.md` | Ràng buộc nhân sự (solo), thời gian (3 tuần), ngân sách | ĐẠT | 10/10 | Ràng buộc trực tiếp lên phạm vi của MVP. |
| `07-distribution.md` | Kênh phân phối NPM, versioning SemVer và cài đặt | ĐẠT | 10/10 | Hướng dẫn cụ thể phương án cài đặt global npm install. |

> **Tổng điểm**: **90 / 90 (Đạt chất lượng tối đa - Reference Level)**
