# C-CLI — Kịch bản phỏng vấn nhánh CLI

> Đây là phần rẽ nhánh **sau S7** cho các dự án công cụ dòng lệnh (CLI). Mục tiêu của nhánh này là xác định cấu trúc kỹ thuật, môi trường chạy, cách quản lý cấu hình và phương thức phân phối cho các dev-tools hoặc script dòng lệnh.

## Tại sao cần file này
Các công cụ CLI có các yêu cầu kỹ thuật đặc thù (như tương thích OS, quản lý biến môi trường, phân phối qua các package manager như npm/pip/homebrew) khác xa so với ứng dụng Web hay Mobile. File này giúp định hình kiến trúc ứng dụng CLI một cách có hệ thống, đi từ ngôn ngữ lập trình đến cách phân phối sản phẩm.

## Nguyên tắc dùng file này
- Chỉ chạy **sau S7** khi `branch = cli`.
- Mỗi câu hỏi dịch ngược các lựa chọn của lập trình viên thành các thông số kỹ thuật tương ứng trong `05-architecture.md` và `07-distribution.md`.
- Tránh sa đà vào việc thảo luận quá sâu về cú pháp lệnh; tập trung vào phạm vi MVP và cách thức tương tác.

---

## C1 — Ngôn ngữ và môi trường chạy

**ask**  
"Bạn muốn viết công cụ dòng lệnh này bằng ngôn ngữ hay môi trường nào (ví dụ Node.js, Python, Go, Rust, hay Bash script)?"

**default**  
`Node.js (TypeScript) để tận dụng hệ sinh thái phong phú và dễ đóng gói.`

**translate_back**  
"Mình ghi nhận ngôn ngữ và môi trường chạy là: `<Node.js / Python / Go / Rust / Bash>`, sử dụng các thư viện chính: `<danh sách thư viện>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Mình quen dùng Node.js rồi, viết bằng TypeScript cho an toàn."

**Ví dụ dịch ngược**  
"Công cụ CLI được xây dựng trên môi trường Node.js sử dụng TypeScript; dự kiến sử dụng các thư viện phụ thuộc từ npm."

---

## C2 — Giao diện lệnh và tương tác

**ask**  
"Giao diện lệnh của app sẽ thế nào? Người dùng truyền flags/arguments (ví dụ --verbose -f file.txt), tương tác qua menu (interactive prompt), hay truyền dữ liệu qua stdin/stdout pipeline?"

**default**  
`Kết hợp truyền flags/arguments cho các lệnh tự động và menu tương tác (interactive prompts) khi cần nhập liệu trực quan.`

**translate_back**  
"Mình tóm tắt phương thức giao tiếp CLI là: `<truyền tham số flags/args / menu tương tác / stdin/stdout pipeline>`. Thư viện xử lý giao diện CLI đề xuất là `<Commander.js / Inquirer.js / Clack / các thư viện tương ứng>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chủ yếu là chạy lệnh kiểu `myapp deploy --env prod` có kèm flags, nhưng nếu thiếu thông số thì hiện menu cho chọn."

**Ví dụ dịch ngược**  
"Giao diện CLI hỗ trợ cả hai chế độ: truyền flags/arguments trực tiếp (thích hợp cho CI/CD) và hiển thị menu tương tác (interactive prompts) khi thiếu tham số đầu vào."

---

## C3 — Cấu hình và lưu trữ trạng thái

**ask**  
"Ứng dụng lưu cấu hình, khóa bảo mật (API keys), và dữ liệu ở đâu? (ví dụ file config JSON ở thư mục home, biến môi trường ENV, hay keychain của hệ điều hành)?"

**default**  
`Lưu file config JSON tại thư mục home người dùng (ví dụ ~/.config/myapp.json) và hỗ trợ ghi đè bằng biến môi trường (ENV).`

**translate_back**  
"Mình ghi nhận giải pháp quản lý cấu hình và bảo mật là: `<lưu file config JSON cục bộ / biến môi trường / keychain>` tại đường dẫn `<đường dẫn>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Lưu API keys trong file `.env` ở thư mục chạy lệnh, hoặc lưu global ở `~/.config/mytool/config.json`."

**Ví dụ dịch ngược**  
"Cấu hình và API keys được lưu cục bộ dưới định dạng JSON tại thư mục Home của người dùng; hỗ trợ nạp cấu hình động qua các biến môi trường (ENV) phục vụ chạy tự động."

---

## C4 — Khả năng tương thích hệ điều hành

**ask**  
"Ứng dụng CLI này trước mắt chạy trên hệ điều hành nào của riêng bạn? Bạn có muốn giới hạn ở một hệ điều hành duy nhất để đơn giản hóa MVP, hay bắt buộc phải chạy đa nền tảng (macOS, Linux, Windows) ngay từ đầu?"

**default**  
`Chạy trên hệ điều hành hiện tại của người phát triển (ví dụ Windows hoặc macOS) để tối giản hóa việc tương thích.`

**translate_back**  
"Mình ghi nhận hệ điều hành hỗ trợ đầu tiên là: `<hệ điều hành của bạn>`. Các hệ điều hành khác sẽ được xem xét sau MVP để tối ưu hóa việc phân phối."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Mình viết cho các bạn trong team dùng nên bắt buộc phải chạy được trên cả Windows lẫn macOS."

**Ví dụ dịch ngược**  
"Ứng dụng yêu cầu tính tương thích cross-platform (Windows, macOS, Linux); mã nguồn cần sử dụng các module đường dẫn chuẩn (`path.join`, `path.resolve`) và tránh gọi trực tiếp lệnh shell đặc thù của OS."

---

## C5 — Phương thức phân phối và phát hành

**ask**  
"Bạn định phân phối công cụ này tới người dùng bằng cách nào? (ví dụ xuất bản lên NPM/Pip/Cargo, tải file binary biên dịch sẵn từ GitHub Releases, hay dùng homebrew/scoop)?"

**default**  
`Chạy cục bộ bằng node hoặc npx (hoặc npm link) để kiểm thử nội bộ trước khi xuất bản lên NPM registry.`

**translate_back**  
"Mình xác nhận cơ chế phân phối ban đầu: `<cục bộ qua node/npx / npm link / NPM registry>`."

**target_doc**  
`07-distribution.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Đóng gói thành package rồi public lên npm để cài bằng `npm install -g` cho nhanh."

**Ví dụ dịch ngược**  
"Kênh phân phối chính của công cụ là registry công khai của NPM; quy trình phát hành tuân thủ quy tắc quản lý phiên bản SemVer."

**critic**  
*   **challenge**: |
      [CẢNH BÁO BẪY CÔNG CỤ DÒNG LỆNH]
      Hãy lưu ý các thách thức đặc thù của công cụ dòng lệnh (CLI):
      - Đa hệ điều hành: Chạy tốt trên máy của bạn (ví dụ Mac) không có nghĩa là chạy được ngay trên Windows của đồng nghiệp nếu không xử lý đường dẫn (`path`) và ký tự xuống dòng (`CRLF`) chuẩn hóa.
      - Đóng gói & Ký nhị phân: Việc build ra file chạy trực tiếp (standalone binary) trên các môi trường không cài sẵn Node/Python rất dễ gặp lỗi tương thích thư viện native.
      - Breaking-change API: Thay đổi tham số lệnh (arguments/flags) sau khi người dùng đã tích hợp CLI vào script tự động của họ sẽ trực tiếp làm hỏng quy trình làm việc của họ.
*   **ack_prompt**: "Vui lòng xác nhận 'Tôi đồng ý' hoặc đưa ra yêu cầu điều chỉnh."
