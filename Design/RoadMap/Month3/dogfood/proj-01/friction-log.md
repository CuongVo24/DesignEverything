# Friction Log — Dogfooding Session #1 (HabitBuilder Mobile)

Báo cáo này ghi nhận nhật ký ma sát cơ học thu được trong quá trình phỏng vấn chạy thật dự án HabitBuilder Mobile App bằng hệ thống phỏng vấn v1.0.0.

---

## 1. Đo lường thời gian (Time Metrics)

| Giai đoạn | Nội dung | Thời gian thực hiện | Số câu hỏi | Ghi chú |
|---|---|---:|:---:|---|
| **Pha 1: S0 – S2** | Vision & Personas | 8 phút | 3 | Soạn thảo persona mất nhiều thời gian nhất để khớp đúng vai trò. |
| **Pha 2: S3 – S6** | Scope, Data & Flows | 12 phút | 4 | Soạn danh sách MoSCoW tại S3 và luồng đi tại S5 tốn nhiều năng lượng suy nghĩ. |
| **Pha 3: M1 – M5** | Mobile Architecture & Store | 15 phút | 5 | Đọc kỹ cảnh báo M2 (sync) và M5 (App Store) mất thêm thời gian thảo luận. |
| **Tổng cộng** | **Toàn bộ phiên phỏng vấn** | **35 phút** | **12** | Đạt nhịp độ trung bình ~3 phút/câu. |

---

## 2. Điểm ma sát cơ học phát hiện (Friction Points)

Dưới đây là 4 điểm cấn cụ thể về mặt câu chữ, mặc định hoặc luồng hoạt động gây mất thời gian trong phiên chạy thực tế:

### Ma sát #1: Câu hỏi S3 (Scope MoSCoW) thiếu cấu trúc định dạng sẵn
*   **Vị trí**: Câu hỏi `S3` (Xác định phạm vi theo MoSCoW).
*   **Mô tả ma sát**: Câu hỏi yêu cầu phân rã rõ rệt 4 nhóm: Must, Should, Could, Won't. Tuy nhiên, đề xuất mặc định (`default`) trong script chỉ là một đoạn text nối tiếp nhau bằng dấu chấm phẩy. Người dùng phải tự gõ thủ công các tiêu đề hoặc tự định dạng dấu đầu dòng, dẫn đến câu trả lời thô dễ bị lệch chuẩn.
*   **Đề xuất cải tiến (cho W11)**: Cung cấp định dạng mẫu có sẵn trong `default` để người dùng chỉ việc điền vào chỗ trống:
    ```text
    Must: [Đăng nhập, tạo thói quen]
    Should: [Nhắc nhở, offline]
    Could: [Sửa lịch sử]
    Won't: [Mạng xã hội]
    ```

### Ma sát #2: Cảnh báo M2 (Offline/Sync) thiếu định hướng trả lời cụ thể
*   **Vị trí**: Câu hỏi `M2` (Offline-first & đồng bộ).
*   **Mô tả ma sát**: Đoạn cảnh báo `[CẢNH BÁO] Nếu chọn offline/sync, độ phức tạp và chi phí phát triển sẽ tăng đáng kể...` xuất hiện đầy đủ trong context. Tuy nhiên, câu hỏi không hướng dẫn người dùng nên trả lời "Đồng ý" hay phải mô tả kỹ thuật lưu trữ thế nào. Người dùng bối rối không biết có cần viết rõ "Tôi đồng ý chịu chi phí gấp đôi" vào câu trả lời hay không.
*   **Đề xuất cải tiến (cho W11)**: Bổ sung câu chốt hướng dẫn trong `ask` hoặc `default`, yêu cầu xác nhận rõ sự đồng ý đánh đổi chi phí phát triển.

### Ma sát #3: Cảnh báo M5 (App Store Fees) chưa ghi rõ con số chi phí thực tế
*   **Vị trí**: Câu hỏi `M5` (Mô hình kiếm tiền & phát hành App Store/Play Store).
*   **Mô tả ma sát**: Cảnh báo nhắc nhở lập trình viên phải `chuẩn bị phí tài khoản Developer hàng năm`. Với các solo developer hoặc nhóm nhỏ khởi nghiệp, việc biết chính xác số tiền cần chi trả ngay từ bước thiết kế là rất quan trọng. Việc ghi chung chung "phí tài khoản" bắt buộc họ phải mở trình duyệt tìm kiếm ngoài luồng.
*   **Đề xuất cải tiến (cho W11)**: Ghi rõ con số thực tế trong cảnh báo để tăng tính thiết thực: phí tài khoản Apple Developer ($99/năm) và Google Play Console ($25 một lần).

### Ma sát #4: Tiền tố đường dẫn mỏ neo Mobile cứng nhắc
*   **Vị trí**: Output của `emitTree` đối với nhánh `mobile`.
*   **Mô tả ma sát**: Toàn bộ mỏ neo ẩn trong docs được tự động thêm tiền tố `apps/mobile/src/`. Đối với các dự án mobile thuần (không dùng monorepo, ví dụ chỉ là repo Expo thuần túy), việc ép đường dẫn bắt đầu bằng `apps/mobile/src/` khiến mã nguồn thật của dự án bị sai cấu trúc thư mục (thường mã nguồn Expo sẽ nằm ngay ở root hoặc `src/`).
*   **Đề xuất cải tiến (cho W11)**: Cho phép cấu hình custom tiền tố source code trong S6 hoặc tách riêng config cho monorepo/polyrepo thay vì hardcode.
