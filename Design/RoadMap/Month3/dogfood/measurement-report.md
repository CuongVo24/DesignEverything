# Measurement Report — Multi-project Dogfooding Analysis

Báo cáo này đối chiếu và tổng hợp các chỉ số đo lường hiệu năng của công cụ phỏng vấn thiết kế **DesignEverything** thu thập từ 3 dự án dogfood thực tế (proj-01, proj-02, proj-03) nhằm đánh giá thời gian tiết kiệm được và chỉ ra các mặt hạn chế của hệ thống.

---

## 1. Bảng so sánh các dự án (Dogfood Projects Comparison)

Dưới đây là bảng tổng hợp các số liệu thô thu được từ [metrics-raw.csv](metrics-raw.csv):

| Dự án | Phân loại nguồn | Nhánh chạy | Tổng thời gian (phút) | Thời gian/giai đoạn (S0-S2 / S3-S6 / Tech) | Số lần dừng giải thích | Ước lượng % sửa tay |
|---|---|---|:---:|---|:---:|:---:|
| **proj-01** (HabitBuilder) | Thật (Real) | `mobile` | 35 phút | 8 / 12 / 15 phút | 2 lần | ~25% (toàn bộ) / ~45% (core specs) |
| **proj-02** (BookRegistry) | Bán-thật (Semi-Real) | `web` | 20 phút | 5 / 7 / 8 phút | 0 lần | ~15% (toàn bộ) / ~25% (core specs) |
| **proj-03** (TaskFlow) | Thật (Real) | `mobile` | 45 phút | 10 / 15 / 20 phút | 3 lần | ~30% (toàn bộ) / ~50% (core specs) |

---

## 2. Ước lượng thời gian tiết kiệm (Estimated Time Saved vs. Baseline)

*   **Chỉ số Baseline truyền thống**: Thông thường, để một lập trình viên/đội ngũ thiết kế hoàn thành bộ 9 file tài liệu đặc tả chuẩn chỉ (từ Tầm nhìn, Persona, Scope, Data Model, UX Flows, Architecture, đến Release/Deployment) cho một dự án di động hoặc ứng dụng web sẽ mất **khoảng 1 tuần làm việc (khoảng 30 - 40 giờ)** bao gồm cả thời gian hội ý, nháp, vẽ luồng và chau chuốt chữ nghĩa.
*   **Hiệu quả thực tế của công cụ**:
    *   **Pha Phỏng vấn & Sinh tài liệu tự động**: Chỉ mất **từ 20 đến 45 phút** để hoàn thành cuộc đối thoại phỏng vấn và xuất bản ra cây docs tự động đầy đủ mỏ neo.
    *   **Pha Tinh chỉnh sửa tay (Hand-fix phase)**: Dev chỉ cần mất thêm **khoảng 2 đến 4 giờ** để hoàn thiện các đặc tả kỹ thuật chi tiết (như viết schema database chi tiết, mô tả cụ thể cơ chế sync worker).
*   **Tỷ lệ thời gian rút ngắn**: Tiết kiệm được **khoảng 80% - 90%** thời gian chuẩn bị tài liệu ban đầu (giảm từ ~35 giờ xuống còn ~4 giờ tổng cộng).
*   **Giả định & Độ tin cậy (Assumptions & Confidence Warning)**:
    > [!WARNING]
    > **Độ tin cậy của số đo: THẤP - TRUNG BÌNH**.
    > 1. Mẫu thử nghiệm còn mỏng (chỉ gồm 3 dự án nhỏ/trung bình).
    > 2. Người tham gia phỏng vấn là lập trình viên giả lập đã hiểu tương đối rõ cấu trúc câu hỏi nên việc đưa ra câu trả lời diễn ra nhanh và trơn tru hơn thực tế.
    > 3. Mức độ tiết kiệm thời gian 90% chỉ áp dụng cho pha khởi động dự án (bootstrapping docs), không phản ánh thời gian bảo trì tài liệu trong suốt vòng đời dự án.

---

## 3. Đánh giá hai chiều: Lợi ích & Hạn chế

### 3.1. Điểm tích cực (Benefits)
*   **Chuẩn hóa cấu trúc**: Công cụ ép người dùng đi qua đúng quy trình chuẩn (Tầm nhìn trước, Personas rồi mới đến Scope và Tech stack), ngăn chặn tình trạng nhảy cóc.
*   **Khớp Taxonomy tuyệt đối**: Cây docs sinh ra luôn đầy đủ, sạch sẽ, bám sát các tệp tin di động/web được chỉ định trong taxonomy, đồng thời tự động chèn các mỏ neo ẩn truy vết mà không cần lập trình viên can thiệp thủ công.

### 3.2. Điểm hạn chế (Limitations)
*   **Bị lặp dữ liệu**: Nếu câu trả lời của người dùng quá ngắn hoặc mang tính chất gộp (như S3 gộp cả Must/Should/Could), hệ thống sẽ rải câu trả lời đó cho nhiều phần tiêu đề khác nhau gây trùng lặp thông tin nặng nề.
*   **Thiếu độ chi tiết kỹ thuật sâu**: Công cụ không thể tự biết được các thuộc tính cụ thể của database schema hay cách phân chia luồng offline phức tạp, bắt buộc dev phải sửa tay thủ công mới sử dụng để code được.
