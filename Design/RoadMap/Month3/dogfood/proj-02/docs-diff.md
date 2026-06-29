# Docs Diff — Analysis of docs-generated vs docs-handfixed for proj-02

Tài liệu này phân tích định lượng và định tính sự khác biệt giữa tài liệu sinh ra tự động từ công cụ (`docs-generated/`) và bản sửa tay hoàn thiện để phục vụ phát triển thực tế (`docs-handfixed/`) của dự án **BookRegistry Web App**.

---

## 1. Đánh giá tỷ lệ hỗ trợ của công cụ (Tool Coverage)

Nhìn chung, công cụ **lo được khoảng 65%** công việc lập tài liệu thiết kế do BookRegistry có độ phức tạp thấp, ít các ca biên phức tạp. Người dùng chỉ cần bổ sung khoảng **35% chi tiết kỹ thuật thô** (đặc tả database fields, hosting settings).

| File | % Sinh tự động | % Phải sửa tay | Loại sửa chính | Đánh giá |
|---|:---:|:---:|---|---|
| **00-vision.md** | 95% | 5% | Sửa lỗi chính tả | Rất tốt. Tầm nhìn solo project được giữ nguyên vẹn. |
| **01-personas.md** | 80% | 20% | Bổ sung ngữ cảnh | Khá tốt. Mô tả JTBD của chủ tủ sách cá nhân rõ ràng. |
| **02-scope.md** | 60% | 40% | Tách danh sách | Dữ liệu S3 được cấu trúc lại thành bảng Must/Should/Could sạch sẽ. |
| **03-data-model.md** | 30% | 70% | Đặc tả schema + Quan hệ | Cần sửa nhiều. Viết rõ các trường id, email, title, owner_id và vẽ quan hệ 1-N. |
| **04-flows.md** | 70% | 30% | Thêm ca biên | Thêm xử lý lỗi khi quét barcode không ra thông tin sách từ API. |
| **05-architecture.md**| 75% | 25% | Sửa config Supabase | Bổ sung mô tả về Supabase Auth client và Vercel routing rules. |
| **06-constraints.md** | 30% | 70% | Tách lặp | Tránh trùng lặp nội dung S6 gán đều cho 4 đề mục. |
| **07-deployment.md**| 60% | 40% | Sửa biến môi trường | Điền rõ các ENV variables (SUPABASE_KEY) cần thiết trên Vercel. |
| **README.md** | 95% | 5% | Link chéo | Tuyệt vời. |

---

## 2. File phải sửa nhiều nhất & Loại sửa chính

### 2.1. File sửa nhiều nhất
1.  **`03-data-model.md`**: Bản tự động chỉ liệt kê tên entity, bản sửa tay đặc tả đầy đủ kiểu dữ liệu và mối quan hệ để phục vụ viết Prisma schema.
2.  **`06-constraints.md`**: Bản tự động lặp lại "Solo, 2 tuần, web" ở mọi mục. Bản sửa tay viết tách biệt vai trò solo dev, timeline 2 tuần, ngân sách $0 và ảnh hưởng lên scope.

### 2.2. Loại sửa chính (Common Edits)
- **Tách lặp (De-duplication)**: Loại bỏ trùng lặp khi câu hỏi S6 hoặc S4 được map chung cho tất cả các slot con.
- **Bổ sung đặc tả kỹ thuật**: Thêm thông tin cấu hình Supabase Client API và biến môi trường cho Vercel.
