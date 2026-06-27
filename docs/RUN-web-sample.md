# Runbook — E2E Web Flow Sample Run

Tài liệu này ghi nhận (log) quá trình giả lập chạy thử nghiệm toàn bộ hệ thống động cơ phỏng vấn và đánh giá cổng chặn (gating) của nhánh **Web** từ bước khởi chạy đến khi sinh tài liệu thành công.

---

## 1. Kịch bản chạy thử (Session Walkthrough)

### Bước 1: Khởi chạy phiên (SessionStart)
AI adapter gọi hàm hook `onSessionStart` để khởi tạo tiến trình. Tệp trạng thái `progress.json` được tạo mới:
```json
{
  "version": "0.1.0",
  "phase": "interview",
  "branch": null,
  "current_step": "S0",
  "answered": [],
  "emitted_docs": [],
  "gates_passed": [],
  "last_user_turn_id": null,
  "answered_len_at_last_turn": 0
}
```

### Bước 2: Hỏi & Đáp các câu hỏi Core (S0 -> S6)
Trong quá trình này, mỗi lượt tương tác người dùng gửi câu trả lời, hook `onUserPromptSubmit` tiến hành kiểm nhịp phỏng vấn và cập nhật `answered_len_at_last_turn = answered.length`.

Lớp skill `/design` thực hiện phân tích ngữ nghĩa, đưa ra bản dịch ngược (`translate_back`) và thực thi lệnh ghi trạng thái phỏng vấn (`commitStep`):

*   **S0 (Tầm nhìn)**:
    *   *Input*: "RecipeShare web app giúp chia sẻ công thức nấu ăn"
    *   *System Model*: `vision_elevator_pitch`
*   **S1 (Nỗi đau & Xoay xở)**:
    *   *Input*: "Khó tìm công thức cũ trong chat; giải quyết tạm bằng notepad."
    *   *System Model*: `problem_summary`, `current_workaround`
*   **S2 (Persona & JTBD)**:
    *   *Input*: "My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ."
    *   *System Model*: `primary_persona_summary`, `secondary_persona_summary`
*   **S3 (Phạm vi MVP - MoSCoW)**:
    *   *Input*: "Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List."
    *   *System Model*: `must_have_scope`, `should_have_scope`
*   **S4 (Entity Data Model)**:
    *   *Input*: "User, Recipe, ShoppingList"
    *   *System Model*: `core_entities`
*   **S5 (Luồng hành trình điển hình)**:
    *   *Input*: "Mở web -> xem công thức -> chọn món -> tích nguyên liệu"
    *   *System Model*: `main_flow_summary`
*   **S6 (Rẽ nhánh & Ràng buộc)**:
    *   *Input*: "Solo, 3 tuần, web"
    *   *Branch chốt*: `'web'`
    *   *System Model*: `team_and_ownership_constraints`, `branchChoice`

---

## 2. Gate Policy & Điểm Chặn Hành Vi (Gating)

Tại bước tiếp theo (**W1**), phiên phỏng vấn chưa kết thúc và chưa có bất kỳ tài liệu thiết kế nào được tạo lập trong thư mục `docs/`.

### Thử nghiệm chặn sửa code (PreToolUse Gate Blocked)
Nếu AI cố tình kích hoạt các công cụ chỉnh sửa mã nguồn hoặc cài đặt thư viện:
*   **Hành động**: Gọi `Write src/index.ts` hoặc `Bash npm install`.
*   **Xử lý trong PreToolUse**: Quét thư mục `docs/` $\rightarrow$ Thấy thiếu tệp `02-scope.md` $\rightarrow$ Gate `scope-locked` bị đóng.
*   **Kết quả**: Trả về `deny` kèm tin nhắn lỗi:
    > "Phỏng vấn chưa xong tới S3 hoặc thiếu tài liệu scope-locked (cần 00-vision.md, 01-personas.md, 02-scope.md để khóa scope trước khi viết code)."
*   **Thao tác an toàn (Allowed)**: Gọi `Write docs/02-scope.md` hoặc `Bash ls docs/` $\rightarrow$ Trả về `allow` (cho phép chỉnh sửa tài liệu hoặc đọc dữ liệu an toàn).

---

## 3. Hỏi & Đáp các câu hỏi Nhánh Web (W1 -> W5)
Tiếp tục quá trình hỏi đáp trên nhánh Web để chốt kiến trúc và cách thức deploy:
*   **W1 (Rendering SEO)** $\rightarrow$ Next.js SSR cho SEO
*   **W2 (UI Responsive)** $\rightarrow$ Responsive mobile-first
*   **W3 (Triển khai)** $\rightarrow$ Deploy lên Vercel
*   **W4 (Xác thực)** $\rightarrow$ NextAuth Google OAuth
*   **W5 (Thời gian thực)** $\rightarrow$ Không realtime ở MVP

Sau khi commit bước **W5**, tiến trình phỏng vấn hoàn thành, trạng thái cập nhật:
*   `current_step`: `null`
*   `phase`: `ready-to-build`

---

## 4. Phát Hành Tài Liệu (Docs Scaffolding / Emission)

Sau khi phỏng vấn kết thúc, động cơ sinh tài liệu lõi `emitTree` được kích hoạt, tự động sinh 9 file tài liệu lưu vào thư mục `docs/`:

```text
docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
└── README.md             # Mục lục tài liệu
```

### So sánh và đối chiếu (Golden Web Matching)
*   **Cấu trúc mỏ neo**: Mỗi phần nội dung của các file đều được đính kèm mỏ neo ẩn đúng định dạng, ví dụ:
    `<!-- anchor: id=00-vision/elevator-pitch  src=src/features/vision/vision.ts::projectVision  rev=  status=planned -->`
    Đảm bảo `status=planned` và `rev` để trống hoàn toàn đúng quy định.
*   **File 07**: Chỉ có `07-deployment.md` được sinh ra, loại bỏ hoàn toàn `07-release.md` đặc thù của nhánh Mobile.

---

## 5. Mở Cổng Chặn (Gate Opened)

Khi các tệp tài liệu thiết kế đã hiện diện đầy đủ trong thư mục `docs/`:

1.  AI gọi lại công cụ chỉnh sửa mã nguồn: `Write src/index.ts`.
2.  Hook `onPreToolUse` quét thư mục `docs/`, xác nhận sự tồn tại của `00-vision.md`, `01-personas.md`, `02-scope.md` $\rightarrow$ Mở cổng `scope-locked`.
3.  **Kết quả**: Trả về `allow`, mở khóa hoàn toàn để bắt đầu viết code dự án.
4.  Trạng thái `gates_passed` được cập nhật thêm `'scope-locked'`:
    ```json
    {
      "gates_passed": ["scope-locked"]
    }
    ```
