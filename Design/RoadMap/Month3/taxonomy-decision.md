# Quyết định Kiến trúc & Đánh giá Taxonomy (W12)

Tài liệu này ghi nhận kết quả đánh giá thực tế từ các phiên dogfood (proj-01, proj-02, proj-03) trong tuần 9–11 và đưa ra quyết định chính thức về việc mở rộng cây thư mục đầu ra (taxonomy).

---

## 1. Quyết định chính thức

> [!IMPORTANT]
> **KẾT LUẬN: HOÃN MỞ RỘNG TAXONOMY (Giữ nguyên bản tối giản hiện tại)**
>
> Chúng ta sẽ **không** tích hợp các tài liệu mẫu nâng cao (ADR, Test Plan, ContractForAI) vào cây thư mục đầu ra trong giai đoạn này. Quyết định này giúp bảo vệ mục tiêu tối thượng của dự án: giữ hệ thống cực kỳ đơn giản cho người mới học, tránh việc phình to số lượng file tạo ra gánh nặng nhận thức không cần thiết.

---

## 2. Bằng chứng thực tế & Đánh giá nhu cầu

Dưới đây là phân tích chi tiết dựa trên dữ liệu dogfood từ 3 dự án thử nghiệm:

### 2.1. Đánh giá nhu cầu ADR (Architecture Decision Record)
*   **Tần suất nhu cầu thực tế**: 0/3 dự án.
*   **Chi tiết**: Các dự án hiện tại (solo developer, quy mô nhỏ đến trung bình) không có xung đột kiến trúc hoặc nhu cầu lưu vết thảo luận phức tạp. Các quyết định kỹ thuật cốt lõi (như chọn DB, offline sync, Firebase Cloud Messaging) đều đã được lưu vết và diễn giải trọn vẹn trong tệp `05-architecture.md`. Việc tách riêng thư mục ADR chỉ làm phân tán thông tin.

### 2.2. Đánh giá nhu cầu Test Plan độc lập
*   **Tần suất nhu cầu thực tế**: 0/3 dự án.
*   **Chi tiết**: Luồng nghiệp vụ chính và các trường hợp biên của dự án đều được mô tả đầy đủ trong tệp `04-flows.md`. Người dùng solo-developer không có quy trình QA độc lập hoặc hệ thống CI/CD bắt buộc cần một Test Plan riêng biệt. Việc bắt buộc viết Test Plan sẽ tạo ra ma sát thừa.

### 2.3. Đánh giá nhu cầu ContractForAI
*   **Tần suất nhu cầu thực tế**: 0/3 dự án.
*   **Chi tiết**: Các dự án hiện tại chưa sử dụng mô hình multi-agent tự động sinh code từ hợp đồng trung gian. Mỏ neo ẩn (`status=planned`) trong bộ tài liệu hiện tại là đủ để lập trình viên/agent đơn lẻ định vị và phát triển code.

---

## 3. Điều kiện kích hoạt lại (Activation Conditions)

Chúng ta sẽ chỉ xem xét mở rộng các tài liệu này khi dự án của người dùng đạt các điều kiện cụ thể sau:

1.  **Kích hoạt ADR**: Khi dự án có từ **2+ lập trình viên** cùng tham gia đóng góp phát triển trực tiếp và xuất hiện các xung đột quyết định kỹ thuật cần lưu vết chính thức để tránh đảo ngược quyết định (Drift).
2.  **Kích hoạt Test Plan**: Khi dự án tích hợp hệ thống **CI/CD tự động** chạy kiểm thử và yêu cầu độ bao phủ mã nguồn (code coverage) tối thiểu.
3.  **Kích hoạt ContractForAI**: Khi người dùng cấu hình hệ thống **multi-agent** để tự động sinh mã nguồn từ tài liệu thiết kế của DesignEverything mà không cần sự can thiệp thủ công.

---

## 4. Sơ bộ tác động lên Hệ thống nếu mở rộng (Impact Assessment)

Nếu quyết định mở rộng taxonomy được thực thi trong tương lai, hệ thống sẽ chịu các tác động lan tỏa lớn sau:

*   **Lõi (`emit.ts`)**: Cần cập nhật logic ánh xạ câu hỏi mới vào file mới, bổ sung cấu trúc sinh thư mục/file mẫu.
*   **Validator**: Cần định nghĩa lại schema cấu trúc đầu ra, kiểm tra sự tồn tại và tính hợp lệ của các file mới.
*   **Adapter (`AGENTS.md`)**: Cập nhật prompt/rules của adapter để định hướng AI điền đúng mẫu cấu trúc mới.
*   **Golden Examples**: Bắt buộc phải viết lại toàn bộ tài liệu mẫu cho 2 dự án vàng (web và mobile) để thêm các file ADR/Test Plan/ContractForAI, chấm lại điểm chất lượng trong `_quality-score.md`.
*   **Chính sách phiên bản**: Đánh dấu **MAJOR bump** (Ví dụ: `2.0.0`) vì thay đổi cấu trúc cây đầu ra, gây mất tương thích ngược với các adapter cũ.

---

## 5. Đề xuất cải tiến thực tế (Dành cho W12B)

Mặc dù hoãn mở rộng taxonomy nâng cao, phản hồi dogfood từ **proj-03** chỉ ra một lỗi hệ thống thực tế: **F-07** (Ép cứng `07-release.md` hoặc `07-deployment.md` làm hạn chế khả năng biểu diễn của dự án Hybrid).

*   **Giải pháp đề xuất cho W12B**: Thay vì thêm file mới, ta sẽ cho phép cấu hình linh hoạt để sinh cả hai file hoặc gộp file tùy thuộc vào cấu hình dự án, nhằm giải quyết triệt để F-07 mà không làm phình to taxonomy mặc định.
