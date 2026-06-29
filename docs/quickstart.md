# Quickstart Onboarding — Hướng dẫn cài đặt và chạy thử 5 phút

Tài liệu này giúp các nhà phát triển mới hoặc người kiểm thử cài đặt, thiết lập và tạo ra bộ tài liệu thiết kế nền móng đầu tiên của họ bằng **DesignEverything** chỉ trong vòng 5 phút.

---

## 1. Bản Đồ Đọc Nhanh (Onboarding Reading Map)
Trước khi bắt đầu chạy thực tế, bạn chỉ cần nắm rõ:
- **Lõi (Core)**: Nằm ở [Design/Content/interview-script/script.yaml](file:///e:/DesignEverything/Design/Content/interview-script/script.yaml) (kịch bản phỏng vấn) và [Design/Content/doc-templates/](file:///e:/DesignEverything/Design/Content/doc-templates/) (các file doc mẫu).
- **Bộ Kiểm Thử**: Các bài test nằm ở thư mục [test/](file:///e:/DesignEverything/test/) giúp tự động hóa quá trình chạy phỏng vấn giả lập.

---

## 2. Các Bước Cài Đặt (Setup Checklist)

Bạn cần hoàn thành các bước thiết lập môi trường sau:
- [ ] **Node.js**: Đảm bảo máy đã cài đặt Node.js phiên bản `>=18` (kiểm tra bằng `node -v`).
- [ ] **Git**: Dùng Git để quản lý mã nguồn.
- [ ] **Cài đặt dependencies**: Chạy lệnh `npm ci` ở thư mục gốc để cài đặt sạch.
- [ ] **Biên dịch code**: Chạy lệnh `npm run build` để dịch TypeScript sang JavaScript trong thư mục `dist/`.

---

## 3. Chạy Demo 5 Phút (Claude Code Reference Path)

Để trải nghiệm quy trình phỏng vấn tự động và sinh tài liệu giả lập bằng Claude Code (tuyến tham chiếu chính):

### Bước 3.1. Chạy regression test giả lập phỏng vấn
Chạy lệnh sau trong terminal:
```bash
npx vitest run test/regression/run-dogfood.test.ts
```

### Bước 3.2. Kết quả kỳ vọng (Expected Output)
Bài test trên sẽ giả lập việc nạp các câu trả lời thật cho dự án **HabitBuilder Mobile App** (proj-01), tự động vượt qua các chốt chặn (gates) và gọi hàm lõi `emitTree` để sinh ra một cây thư mục tài liệu thiết kế hoàn chỉnh tại:
- [Design/RoadMap/Month3/dogfood/proj-01/docs-generated/](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/proj-01/docs-generated/)

Mở thư mục trên, bạn sẽ thấy cấu trúc 9 file tài liệu chuẩn:
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
└── README.md             # Mục lục tài liệu và thứ tự đọc
```

---

## 4. Hướng Dẫn Tuyến Rules-Only (`AGENTS.md`)
Đối với các coding harness không hỗ trợ hook chạy code lập trình (như Cursor, Cline, Cursor Rules, hay Codex), DesignEverything hỗ trợ cơ chế ép mềm bằng tệp cấu hình quy tắc:
- Tệp quy tắc tự động sinh ra tại: [Design/Adapters/generated/AGENTS.sample.md](file:///e:/DesignEverything/Design/Adapters/generated/AGENTS.sample.md) (hoặc tệp quy tắc [AGENTS.md](file:///e:/DesignEverything/.agents/AGENTS.md) ở root workspace).
- **Cách dùng**: Sao chép nội dung tệp này vào tệp cấu hình quy tắc của IDE của bạn (ví dụ: dán vào `.clauderules` hoặc cấu hình Agent của Cursor/Cline). AI agent đọc file này sẽ tự động hiểu kịch bản, hỏi bạn từng câu một và tiến hành sinh tài liệu theo đúng taxonomy.

---

## 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Sự cố / Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `Error: Cannot find module './dist/...'` | Chưa biên dịch file TypeScript | Chạy lệnh `npm run build` trước khi chạy ứng dụng hoặc chạy test. |
| Các test golden regression bị đỏ | File template nguồn bị drift hoặc thay đổi | Chạy `npm test` để xác định chính xác dòng bị drift, cập nhật lại golden docs trong `Design/Content/golden-example-*` nếu đó là thay đổi cố ý. |
| Lỗi đường dẫn tương thích trên Windows | Dùng dấu gạch chéo ngược (`\`) trong code | Đảm bảo sử dụng hàm `join` từ module `path` của Node.js để tự động chuẩn hóa đường dẫn chéo nền tảng. |
