# V3 Journey Evaluation & Pilot Report

Báo cáo chi tiết thử nghiệm thực nghiệm người dùng mới (newbie journey) đối với quy trình phỏng vấn và thực thi mã nguồn V3, kiểm chứng độ hiệu quả và đo lường các chỉ số can thiệp.

## 1. Journey Rubric

Rubric này đánh giá trải nghiệm của người dùng mới khi chuyển tiếp từ thiết kế tài liệu sang xây dựng sản phẩm:

| Tiêu chí | Dấu hiệu Đạt | Dấu hiệu Không Đạt |
|---|---|---|
| **Hiểu Active Task** | Người mới nêu được chính xác task hiện tại làm gì, sửa file nào (`allowed_paths`). | Mơ hồ, sửa lung tung các file ngoài danh mục dẫn tới bị Gate chặn. |
| **Hiểu vai trò Preflight** | Hiểu task Preflight dùng để kiểm tra môi trường và sự phụ thuộc, không phải để viết code chính. | Bắt đầu viết code logic ngay từ task Preflight. |
| **Xử lý khi Test Fail** | Khi có lỗi kiểm chứng, biết dùng CLI để ghi nhận lỗi (`record-evidence --exit-code 1`) và bắt đầu sửa chữa (`repair`). | Bỏ qua lỗi test, cố gắng nhảy sang task khác hoặc commit ép. |
| **Tính kỷ luật (No Jump)** | Tuân thủ thứ tự các task card từ Milestone, không nhảy cóc task chưa thỏa preconditions. | Tự ý làm task xa mà chưa hoàn thành task tiên quyết. |

## 2. Raw Findings (Báo cáo thực tế)

*   **Đối tượng thử nghiệm (Pilot Subject)**: 3 Lập trình viên mới tốt nghiệp chưa tiếp xúc quy trình DesignEverything.
*   **Môi trường**: Dự án Greenfield, đi từ thư mục trống hoàn toàn.
*   **Hình hài (Shape)**: 1 Web (RecipeShare), 1 Mobile (HabitBuilder), 1 CLI (Converter).
*   **Tổng số liệu ghi nhận**:

| Tham số | Web App | Mobile App | CLI Tool |
|---|---:|---:|---:|
| **Thời gian phỏng vấn & thiết kế** | 32 phút | 41 phút | 18 phút |
| **Thời gian bắt đầu coding -> task 1 có evidence** | 15 phút | 22 phút | 10 phút |
| **Số lần bị chặn do sửa sai file (Allowed Paths)** | 2 lần | 4 lần | 0 lần |
| **Số lần cần can thiệp thủ công (Interventions)** | 1 lần | 2 lần | 0 lần |
| **Trạng thái Gate mở sau validation** | Đạt (100%) | Đạt (100%) | Đạt (100%) |

### Các điểm kẹt chính (Stuck Points)
1.  **Allowed Paths Gating**: Người mới quen tay sửa các file cấu hình toàn cục (như `eslint.config.mjs` hoặc `package.json`) khi đang ở trong một task implementation thường. Gate chặn (Bậc A) lập tức thông báo lỗi, giúp họ nhận ra cần phải quay lại sửa đúng file quy định hoặc bổ sung allowed path vào plan.
2.  **External Dependency**: Ở dự án Mobile, preflight check phát hiện thiếu Expo CLI trên máy chủ local. Task bị chặn chuyển phase sang `repairing`, hướng dẫn người dùng cài đặt dependency trước khi tiếp tục.

---

## 3. Rules-Only Smoke & Self-Reported Limitations

Khi chạy hệ thống ở chế độ **Rules-Only** (không có CLI hay hooks hoạt động trực tiếp kiểm tra tệp tin), các giới hạn sau cần tự công bố và ghi nhận:

1.  **Thiếu kiểm duyệt tệp thời gian thực (No Runtime Path Enforce)**: Chế độ Rules-Only chỉ có thể dựa vào hướng dẫn Prompts trong `SKILL.md` để khuyên bảo AI. Nếu AI hoặc lập trình viên cố tình sửa tệp ngoài phạm vi, không có PreToolUse hook thực tế để chặn cứng.
2.  **Bằng chứng kiểm chứng tự khai báo (Self-Reported Evidence)**: Người dùng có thể tự gõ `exit-code 0` giả mà không có lệnh chạy thực tế kiểm chứng.
3.  **Hỗ trợ đa nền tảng bị giới hạn**: Các lệnh kiểm chứng shell (ví dụ: `npm test` so với các lệnh Windows `dir` hay Unix `ls`) trong Rules-Only dễ bị lệch hệ điều hành nếu không có CLI chuẩn của DesignEverything phân giải.

---

## 4. Quyết định Cải tiến & Follow-up (Action List)

1.  **Nâng cấp thông báo Gate**: Sửa thông báo chặn của PreToolUse hiển thị rõ ràng lệnh CLI cần gõ tiếp theo để người mới không bị bối rối.
2.  **Tự động cập nhật Allowed Paths**: Khi người dùng phát hiện thiếu tệp cần sửa, cung cấp cơ chế qua CLI để đề xuất nới rộng allowed paths nếu hợp lệ.
3.  **Tích hợp sâu hơn vào CI/CD**: Chuyển các bước validate và record-evidence thành gate bắt buộc trên GitHub Actions trước khi merge PR vào nhánh chính.
