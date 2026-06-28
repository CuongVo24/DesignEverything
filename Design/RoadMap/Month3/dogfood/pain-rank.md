# Pain Rank — Friction Ranking & Priority Matrix

Bảng xếp hạng điểm vướng (Friction Points) của công cụ được tính toán dựa trên tích số giữa **Tần suất lặp (Frequency)** và **Mức độ đau (Pain Severity)** để định hướng thứ tự vá lỗi ưu tiên cho tuần W11.

---

## 1. Công thức và Quy đổi Chỉ số

$$Điểm = Tần suất \times Mức độ đau$$

*   **Tần suất lặp (F)**: Đếm số dự án phát hiện lỗi trên tổng số 3 dự án (tối đa 3). Đối với lỗi đặc thù di động, mẫu số tối đa là 2.
*   **Mức độ đau (P)**:
    *   `Cao` = 3 điểm
    *   `Trung bình` = 2 điểm
    *   `Thấp` = 1 điểm

---

## 2. Bảng xếp hạng điểm vướng (Friction Priority Matrix)

| Xếp hạng | Mã lỗi | Vấn đề vướng | Tần suất (F) | Mức độ đau (P) | Điểm số | Phân loại Pattern | Truy vết Backlog |
|:---:|---|---|:---:|:---:|:---:|---|---|
| **#1** | F-01 | Câu hỏi S3 (MoSCoW) dồn cục, thiếu định cấu trúc gợi ý mặc định. | 3/3 | Trung bình (2) | **6** | **Pattern hệ thống** | [backlog-month3.md](../backlog-month3.md#L11) |
| **#2** | F-02 | Cảnh báo M2 (Offline sync) thiếu chỉ dẫn xác nhận câu trả lời. | 2/2 di động | Trung bình (2) | **4** | **Pattern hệ thống di động** | [backlog-month3.md](../backlog-month3.md#L12) |
| **#3** | F-04 | Ép cứng tiền tố mỏ neo `apps/mobile/src/` cho nhánh mobile. | 2/2 di động | Trung bình (2) | **4** | **Pattern hệ thống di động** | [backlog-month3.md](../backlog-month3.md#L14) |
| **#4** | F-07 | Thiếu cấu trúc hỗ trợ dự án Hybrid (chạy cả web & mobile). | 1/3 | Trung bình (2) | **2** | Lỗi lẻ (Isolated issue) | [backlog-month3.md](../backlog-month3.md#L17) |
| **#5** | F-03 | Cảnh báo M5 (App Store) thiếu thông tin số phí thực tế. | 2/2 di động | Thấp (1) | **2** | **Pattern hệ thống di động** | [backlog-month3.md](../backlog-month3.md#L13) |
| **#6** | F-05 | Bộ sinh `AGENTS.md` chưa tự động đồng bộ khi lưu progress. | 1/3 | Thấp (1) | **1** | Lỗi lẻ (Isolated issue) | [backlog-month3.md](../backlog-month3.md#L15) |

---

## 3. Định hướng xử lý (Action Plan for W11)

*   **Đầu việc ưu tiên 1 (Điểm ≥ 4)**: Cần vá ngay các lỗi **F-01, F-02, F-04** ở W11. Đây là những điểm gây vướng nặng nề nhất cho lập trình viên khi sử dụng hệ thống, đặc biệt là ở nhánh di động.
*   **Đầu việc ưu tiên 2 (Điểm = 2)**: Cân nhắc nâng cấp cảnh báo store **F-03** và nghiên cứu cơ chế cấu hình linh hoạt cho dự án Hybrid **F-07** ở các tuần tiếp theo.
*   **Đầu việc ưu tiên 3 (Điểm = 1)**: Hoãn lại hoặc để người dùng chạy thủ công cho **F-05**.
