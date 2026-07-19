# Docs Diff — Analysis of docs-generated vs docs-handfixed

Tài liệu này phân tích định lượng và định tính sự khác biệt giữa tài liệu sinh ra tự động từ công cụ (`docs-generated/`) và bản sửa tay hoàn thiện để phục vụ phát triển thực tế (`docs-handfixed/`).

---

## 1. Đánh giá tỷ lệ hỗ trợ của công cụ (Tool Coverage)

Nhìn chung, công cụ **lo được khoảng 55%** đối với 9 tệp đặc tả cốt lõi (chủ yếu là dựng khung xương cấu trúc, map các file đích trong taxonomy và neo giữ mỏ neo ẩn chính xác). Nếu tính gộp cả các tệp cơ khí/vận hành vừa bổ sung (`08-build-plan.md`, `09-execution-plan.md`, `decisions.md` được sinh tự động 100%), tỷ lệ tự động tổng thể trên toàn bộ cây thư mục đạt **khoảng 75%**.

| File | % Sinh tự động | % Phải sửa tay | Loại sửa chính | Đánh giá |
|---|:---:|:---:|---|---|
| **00-vision.md** | 90% | 10% | Chau chuốt chữ | Rất tốt, chỉ cần sửa lại lặp từ do S1 map cho cả nỗi đau lẫn workaround. |
| **01-personas.md** | 50% | 50% | Tách lặp + Chi tiết | Trung bình. S2 bị lặp đè lên cả Primary và Secondary JTBD. Phải tách rõ vai trò của Nam và An. |
| **02-scope.md** | 40% | 60% | Định dạng + Tách danh sách | Cần sửa nhiều. Câu trả lời S3 bị dồn cục, phải tách thành danh sách MoSCoW riêng biệt. |
| **03-data-model.md** | 30% | 70% | Đặc tả schema + Quan hệ | Sửa nhiều nhất. S4 chỉ là danh sách thực thể thô, phải viết rõ fields, datatypes và quan hệ khóa ngoại. |
| **04-flows.md** | 50% | 50% | Chi tiết bước + Ca biên | Cần viết rõ chi tiết các bước 1->4 và bổ sung rủi ro mất mạng tại thực địa. |
| **05-architecture.md**| 60% | 40% | Sắp xếp lại danh mục | Các câu trả lời M1-M5 bị map chéo mục. Sắp xếp lại Expo, SQLite, Supabase Auth và FCM đúng chỗ. |
| **06-constraints.md** | 40% | 60% | Tách lặp | S6 bị chép đè cho cả 4 phần. Tách rõ nhân sự, deadline và ngân sách cụ thể. |
| **07-release.md** | 40% | 60% | Sửa chép đè + Chi tiết | M3 (camera) bị map nhầm vào monetization. Sửa lại chi tiết EAS TestFlight và RevenueCat IAP. |
| **08-build-plan.md** | 100% | 0% | Không sửa | Tệp cơ khí đồng bộ mã nguồn, sử dụng trực tiếp không cần sửa tay. |
| **09-execution-plan.md** | 100% | 0% | Không sửa | Bản đồ phân nhiệm và trace-link của công cụ, sử dụng trực tiếp. |
| **decisions.md** | 100% | 0% | Không sửa | Bảng quyết định kiến trúc và công nghệ được suy diễn tự động từ phỏng vấn. |
| **README.md** | 95% | 5% | Sửa lệnh build | Xuất sắc. Bố cục và sơ đồ file khớp 100%. |

---

## 2. File phải sửa nhiều nhất & Loại sửa chính

### 2.1. File sửa nhiều nhất
1.  **`03-data-model.md`**: Bản sinh tự động chỉ có một dòng chữ liệt kê tên class `User, Habit, HabitLog, PartnerConnection`. Bản sửa tay phải định nghĩa đầy đủ các trường khóa chính, khóa ngoại, kiểu dữ liệu (String, DateTime, Boolean) để dev viết schema Prisma/Supabase.
2.  **`07-release.md`**: Do lỗi trỏ nhầm placeholder (hoặc người dùng trả lời M3/M4/M5 xen kẽ), quyền camera bị đè vào phần monetization và release. Bản sửa tay phải viết lại toàn bộ cấu hình build EAS và cổng RevenueCat.
3.  **`02-scope.md`**: Dạng text dồn cục của câu trả lời S3 được định dạng lại thành các bullet points sạch sẽ phân tầng rõ rệt.

### 2.2. Loại sửa chính (Common Edits)
*   **Tách lặp (De-duplication)**: Xử lý triệt để việc một câu trả lời duy nhất của người dùng (ví dụ: S2, S6) được hệ thống rải đều cho nhiều mục tiêu đề khác nhau dẫn đến trùng lặp dữ liệu.
*   **Đặc tả chi tiết sâu (Technical Refinement)**: Rót các thông tin kỹ thuật đặc thù của dự án di động thực tế (Expo SDK, SQLite client API, Supabase Auth APIs) thay vì các câu trả lời mang tính mô tả chức năng của người dùng.
