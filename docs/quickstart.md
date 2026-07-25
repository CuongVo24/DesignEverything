# Quickstart Onboarding — Hướng dẫn cài đặt và sử dụng

Tài liệu này giúp các nhà phát triển mới hoặc người kiểm thử cài đặt, thiết lập và tạo ra bộ tài liệu thiết kế nền móng đầu tiên của họ bằng **DesignEverything**.

---

## 1. Bản Đồ Đọc Nhanh (Onboarding Reading Map)

Trước khi bắt đầu chạy thực tế, bạn chỉ cần nắm rõ:
- **Lõi (Core)**: Nằm ở [Design/Content/interview-script/script.yaml](../Design/Content/interview-script/script.yaml) (kịch bản phỏng vấn) và [Design/Content/doc-templates/](../Design/Content/doc-templates/) (các file doc mẫu).
- **Bộ Kiểm Thử**: Các bài test nằm ở thư mục [test/](../test/) giúp tự động hóa quá trình chạy phỏng vấn giả lập.

---

## 2. Các Bước Cài Đặt (Setup Checklist)

Bạn cần hoàn thành các bước thiết lập môi trường sau:
- [ ] **Node.js**: Đảm bảo máy đã cài đặt Node.js phiên bản `>=18` (kiểm tra bằng `node -v`).
- [ ] **Git**: Dùng Git để quản lý mã nguồn.
- [ ] **Cài đặt dependencies**: Chạy lệnh `npm ci` ở thư mục gốc để cài đặt sạch.
- [ ] **Biên dịch code**: Chạy lệnh `npm run build` để dịch TypeScript sang JavaScript trong thư mục `dist/`.

---

## 3. Trải Nghiệm Thật Trên Claude Code / CLI (Real Onboarding Path)

Để trải nghiệm quy trình phỏng vấn thật và sinh tài liệu thiết kế trên dự án của bạn:

### Bước 3.1. Cài đặt Adapter vào thư mục dự án đích
Chạy lệnh installer từ thư mục gốc của DesignEverything:
```bash
node adapter/claude-code/install.mjs /path/to/your-project
```

### Bước 3.2. Mở phiên Claude Code và bắt đầu phỏng vấn
Mở Claude Code tại dự án đích và gõ lệnh slash command:
```bash
/design-everything
```
Agent sẽ tiến hành phỏng vấn từng câu một (thời lượng thực tế từ 10-15 phút tùy độ sâu câu trả lời).

### Bước 3.3. Handoff và Kiểm duyệt Kế hoạch (`/build` validate)
> [!IMPORTANT]
> Việc hoàn tất phỏng vấn và xuất tài liệu (`docs-emitted`) **chưa đồng nghĩa với việc mã nguồn đã sẵn sàng để viết code**.
> Bước bắt buộc tiếp theo là thực thi lệnh kiểm duyệt kế hoạch và tạo snapshot trạng thái:

```bash
node adapter/claude-code/cli.mjs validate
```
Hoặc dùng skill `/build` để xác thực kế hoạch trước khi bắt đầu thực thi task đầu tiên.

---

## 4. Chạy Giả Lập / Kiểm Thử Tự Động (Vitest Simulation & Test Path)

Để chạy kiểm thử tự động quy trình phỏng vấn giả lập (dành cho CI/CD và kiểm thử hồi quy):

### Bước 4.1. Chạy regression test giả lập phỏng vấn
Chạy lệnh sau trong terminal:
```bash
npx vitest run test/regression/run-dogfood.test.ts
```

### Bước 4.2. Kết quả kỳ vọng (Expected Output)
Bài test trên sẽ giả lập việc nạp các câu trả lời thật cho dự án mẫu, tự động vượt qua các chốt chặn (gates) và gọi hàm lõi `emitTree` để sinh ra một cây thư mục tài liệu thiết kế hoàn chỉnh tại:
- `Design/RoadMap/Month3/dogfood/proj-01/docs-generated/`

Mở thư mục trên, bạn sẽ thấy cấu trúc file tài liệu chuẩn:
```text
docs-generated/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu
├── 04-flows.md           # Luồng trải nghiệm người dùng
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc dự án
├── 07-release.md         # Kế hoạch phát hành & Phân phối cửa hàng
├── 08-build-plan.md      # Kế hoạch build theo milestone (cầu nối docs → code)
└── README.md             # Mục lục tài liệu và thứ tự đọc
```

---

## 5. Hướng Dẫn Tuyến Rules-Only (`AGENTS.md`)

Đối với các coding harness không hỗ trợ hook chạy code lập trình (như Cursor, Cline, Cursor Rules, hay Codex), DesignEverything hỗ trợ cơ chế ép mềm bằng tệp cấu hình quy tắc:
- Tệp quy tắc tự động sinh ra tại: `Design/Adapters/generated/AGENTS.sample.md` (hoặc tệp quy tắc `.agents/AGENTS.md` ở root workspace).
- **Cách dùng**: Sao chép nội dung tệp này vào tệp cấu hình quy tắc của IDE của bạn (ví dụ: dán vào `.clauderules` hoặc cấu hình Agent của Cursor/Cline).

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Sự cố / Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `Error: Cannot find module './dist/...'` | Chưa biên dịch file TypeScript | Chạy lệnh `npm run build` trước khi chạy ứng dụng hoặc chạy test. |
| Các test golden regression bị đỏ | File template nguồn bị drift hoặc thay đổi | Chạy `npm test` để xác định chính xác dòng bị drift, cập nhật lại golden docs trong `Design/Content/golden-example-*` nếu đó là thay đổi cố ý. |
| Lỗi đường dẫn tương thích trên Windows | Dùng dấu gạch chéo ngược (`\`) trong code | Đảm bảo sử dụng hàm `join` từ module `path` của Node.js để tự động chuẩn hóa đường dẫn chéo nền tảng. |
