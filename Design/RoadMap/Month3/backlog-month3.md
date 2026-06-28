# Backlog — Month 3 Issue Tracking

Tài liệu này tổng hợp danh sách các vấn đề ma sát phát hiện từ phiên dogfood #1, được phân loại rõ rệt theo 4 nhóm kèm mức độ đau và đề xuất tầng vá lỗi.

---

## 1. Bảng phân loại tồn đọng (Backlog Table)

| Mã lỗi | Nhóm phân loại | Chi tiết ma sát phát hiện | Mức độ đau | Tầng đề xuất sửa | Trạng thái / Chờ xác nhận |
|---|---|---|:---:|---|---|
| **F-01** | Content | Câu hỏi S3 (MoSCoW) trả về text dồn cục do gợi ý mặc định (`default`) thiếu cấu trúc định dạng sẵn. | Trung bình | Content (`script.yaml` và gợi ý) | **Chờ xác nhận tần suất ở W10** |
| **F-02** | Content | Cảnh báo M2 (Offline sync) tốt nhưng thiếu câu hỏi chốt hướng dẫn người dùng cách trả lời đồng ý. | Trung bình | Content (`script.yaml`) | **Chờ xác nhận tần suất ở W10** |
| **F-03** | Content | Cảnh báo M5 (App Store) ghi chung chung "phí developer" thay vì ghi rõ con số cụ thể ($99/năm Apple, $25 Google). | Thấp | Content (`script.yaml` warnings) | **Chờ xác nhận tần suất ở W10** |
| **F-04** | Taxonomy | Ép cứng tiền tố mỏ neo `apps/mobile/src/` cho nhánh mobile gây lỗi đường dẫn đối với dự án Expo standalone thuần túy. | Trung bình | Taxonomy / Lõi (`emit.ts`) | **Chờ xác nhận tần suất ở W10** |
| **F-05** | Adapter | Bộ sinh rule `AGENTS.md` chưa tự động chạy (trigger) đồng bộ khi người dùng cập nhật tiến trình `progress.json`. | Thấp | Adapter / CLI wrapper | Đã xác định hệ thống (defer Month 4) |
| **F-06** | Onboarding | Thiếu cẩm nang chạy thử và các lệnh vận hành cụ thể cho nhánh Mobile. | Cao | Onboarding (Tài liệu) | Đã giải quyết ở W8B (RUNBOOK-mobile.md) |

---

## 2. Ranh giới rủi ro & Nguyên tắc xử lý

1.  **Chống nhầm lỗi cá biệt thành lỗi hệ thống**: Các lỗi **F-01, F-02, F-03, F-04** được gắn nhãn **"Chờ xác nhận tần suất ở W10"**. Chúng ta sẽ không vội vàng sửa đổi lõi ngay lập tức mà chờ chạy thêm 2 phiên dogfood thật trên 2 dự án khác nhau ở Tuần 10 để đo đếm tần suất lặp lại của ma sát trước khi kết luận và vá ở Tuần 11.
2.  **Ranh giới vá lỗi**:
    *   Tầng **Content**: Chỉnh sửa kịch bản `script.yaml` (câu chữ, default, translate_back).
    *   Tầng **Taxonomy**: Thay đổi cấu trúc phát hành file hoặc logic định dạng mỏ neo ẩn (`emit.ts`).
    *   Tầng **Adapter**: Điều chỉnh cơ chế trigger của hook hoặc CLI.
    *   Tầng **Onboarding**: Bổ sung cẩm nang hướng dẫn sử dụng, chạy thử và giải thích.
