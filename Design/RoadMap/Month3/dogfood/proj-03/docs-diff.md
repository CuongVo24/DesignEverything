# Docs Diff — Analysis of docs-generated vs docs-handfixed for proj-03

Tài liệu này phân tích định lượng và định tính sự khác biệt giữa tài liệu sinh ra tự động từ công cụ (`docs-generated/`) và bản sửa tay hoàn thiện để phục vụ phát triển thực tế (`docs-handfixed/`) của dự án **TaskFlow Mobile App**.

---

## 1. Đánh giá tỷ lệ hỗ trợ của công cụ (Tool Coverage)

Do TaskFlow là dự án có độ phức tạp cao (native React Native, WatermelonDB, PostgreSQL, FCM sync), công cụ **chỉ lo được khoảng 45%** công việc lập tài liệu. Lập trình viên phải bổ sung **55% chi tiết thiết kế sâu** liên quan đến đồng bộ dữ liệu ngoại tuyến và phân quyền.

| File | % Sinh tự động | % Phải sửa tay | Loại sửa chính | Đánh giá |
|---|:---:|:---:|---|---|
| **00-vision.md** | 85% | 15% | Điều chỉnh văn phong | Tốt. Định hình rõ nỗi đau chậm tiến độ trong doanh nghiệp. |
| **01-personas.md** | 60% | 40% | Tách JTBD | JTBD bị trùng lặp giữa các vai trò PM và Dev, cần tách biệt rõ rệt. |
| **02-scope.md** | 40% | 60% | Phân tầng tính năng | Tách biệt các tính năng quản lý công việc (Must) và dashboard Gantt (Should/Could). |
| **03-data-model.md** | 25% | 75% | Đặc tả WatermelonDB schema | Cần viết chi tiết các trường dữ liệu, khóa ngoại và cơ chế soft-delete phục vụ sync. |
| **04-flows.md** | 40% | 60% | Luồng offline & edge cases | Viết chi tiết luồng người dùng khi mất mạng, lưu trữ tạm vào local DB và tự động sync khi online. |
| **05-architecture.md**| 50% | 50% | Kiến trúc đồng bộ | Bổ sung cơ chế sync conflict resolution và kiến trúc kết nối Supabase Postgres. |
| **06-constraints.md** | 30% | 70% | Tách lặp | Tách biệt giới hạn 3 lập trình viên, deadline 6 tuần và ảnh hưởng lên kiến trúc. |
| **07-release.md** | 40% | 60% | Quy trình store | Điền rõ quy trình đăng ký tài khoản Apple Enterprise và phân phối TestFlight/Google Play console. |
| **README.md** | 90% | 10% | Cấu hình chạy native | Thêm hướng dẫn thiết lập SDK Android và CocoaPods cho iOS. |

---

## 2. File phải sửa nhiều nhất & Loại sửa chính

### 2.1. File sửa nhiều nhất
1.  **`03-data-model.md`**: Cần đặc tả chi tiết cấu trúc bảng của WatermelonDB (kiểu dữ liệu, chỉ mục index) thay vì chỉ liệt kê các tên thực thể thô.
2.  **`04-flows.md`**: Cần mô tả chi tiết ca biên liên quan đến mất kết nối mạng và giải quyết xung đột khi hai người cùng sửa một task ngoại tuyến.

### 2.2. Loại sửa chính (Common Edits)
- **Đặc tả cơ chế offline-first**: Bổ sung chi tiết kỹ thuật của WatermelonDB sync protocol.
- **Phân loại vai trò người dùng**: Làm rõ luồng phân quyền PM vs Member.
