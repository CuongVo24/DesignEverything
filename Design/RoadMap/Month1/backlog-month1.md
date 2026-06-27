# Backlog — Month 1 (Kết Thúc Giai Đoạn Web)

Tài liệu này ghi nhận toàn bộ các vấn đề, lỗi, thiếu sót và ý tưởng cải tiến được phát hiện sau khi hoàn tất chặng phát triển Web (Month 1), được phân loại rõ ràng thành các đầu việc chặn Month 2 (phát triển Mobile) và các ý tưởng có thể để sau.

---

## 1. Nhóm Bắt Buộc Sửa Cho Month 2 (Blocks Month 2 — Mobile)

Đây là các đầu việc **chặn đứng** hoặc bắt buộc phải bổ sung để nhánh Mobile (Tháng 2) có thể vận hành ổn định và đúng đặc tả:

1.  **Cảnh báo chi phí Offline/Sync (Gating M2)**:
    *   *Mô tả*: Cần bổ sung logic cảnh báo đặc thù cho Mobile khi người dùng trả lời "có" ở câu hỏi M2 (Offline/Sync). Cảnh báo về việc chi phí phát triển và độ phức tạp sẽ tăng gấp đôi trước khi chốt gate.
    *   *Mức độ*: Nghiêm trọng (Chặn chốt scope kiến trúc Mobile).
2.  **Cảnh báo phân phối Store (Gating M5)**:
    *   *Mô tả*: Khi phỏng vấn qua câu hỏi M5 về phát hành lên Store, hệ thống bắt buộc phải in cảnh báo chi tiết về quy trình review, ký ứng dụng (App Signing) và phí nhà phát triển (Apple/Google Developer) để người dùng không ngộ nhận "code xong là có app".
    *   *Mức độ*: Nghiêm trọng (Bảo vệ tính thực tế của rubric).
3.  **Tự động ánh xạ đường dẫn Mobile trong emitTree**:
    *   *Mô tả*: Đảm bảo động cơ `emitTree` sinh mỏ neo planned với tiền tố `apps/mobile/src/` thay vì `src/` khi chạy nhánh mobile. (Đã được giải quyết sớm ở W4A nhưng cần kiểm thử liên tục).
    *   *Mức độ*: Đã chuẩn bị sẵn, cần test tích hợp sâu thêm.

---

## 2. Nhóm Ý Tưởng Cải Tiến Để Sau (Nice-To-Have — Không Chặn)

Các tính năng, cải tiến trải nghiệm người dùng không ảnh hưởng trực tiếp đến tính đúng đắn của lõi phỏng vấn và có thể để lại phát triển sau này:

1.  **Cơ chế phát hiện đổi ý tự động (Change Detection)**:
    *   *Ý tưởng*: Nếu người dùng đang trả lời giữa chừng rồi nói "cho mình đổi ý câu S2...", AI có khả năng tự phát hiện ngữ cảnh và đề xuất rollback/re-interview từ bước đó.
    *   *Lý do để sau*: Độ phức tạp NLP cao, người dùng hiện tại có thể gõ lệnh reset hoặc phỏng vấn lại thủ công.
2.  **Cơ chế Rollback có xác nhận qua UI**:
    *   *Ý tưởng*: Thêm lệnh `/rollback <step_id>` hoặc `/back` để lùi lại bước phỏng vấn trước đó, xóa phần tử tương ứng trong `answered` và khôi phục turn stamp.
    *   *Lý do để sau*: Chưa chặn tiến trình phỏng vấn tiêu chuẩn.
3.  **Lưu lịch sử hội thoại đầy đủ (Chat History Preservation)**:
    *   *Ý tưởng*: Lưu giữ toàn bộ nội dung chat thô của người dùng thay vì chỉ lưu trữ tiến trình phỏng vấn chuẩn hóa dịch ngược trong `progress.json`.
    *   *Lý do để sau*: Hiện tại các adapter đã đảm bảo bám sát file transcript thô trên đĩa, việc đồng bộ hóa dữ liệu thô vào `progress.json` là chưa cần thiết ở MVP.
4.  **Cảnh báo xung đột logic chéo (Cross-document conflict warning)**:
    *   *Ý tưởng*: Tự động quét và phát hiện các mâu thuẫn logic, ví dụ: định nghĩa Entity trong `03-data-model.md` có trường `avatar` nhưng trong `02-scope.md` lại ghi Won't làm tính năng Avatar.
    *   *Lý do để sau*: Đây là nghiệp vụ nâng cao của AI Agent ở các phase sau.
