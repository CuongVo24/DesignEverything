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
"Bạn cần ứng dụng chạy trên hệ điều hành nào? Chỉ macOS/Linux, chỉ Windows, hay phải hỗ trợ cả ba (cross-platform)?"

**default**  
`Hỗ trợ cả ba hệ điều hành lớn (macOS, Linux, Windows) bằng cách sử dụng các module chuẩn hóa tránh phụ thuộc OS cụ thể.`

**translate_back**  
"Mình ghi nhận phạm vi tương thích hệ điều hành là: `<macOS/Linux / Windows / cả ba>`, hướng xử lý tương thích là `<sử dụng module đa nền tảng / cross-compile / native script>`."

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
`Xuất bản lên NPM registry dưới dạng package cài đặt toàn cục (npm install -g myapp).`

**translate_back**  
"Mình xác nhận phương án đóng gói và phát hành là: `<NPM registry / Pip / GitHub Releases binary / Homebrew>`, cùng cơ chế quản lý phiên bản (versioning): `<Semantic Versioning (SemVer)>`."

**target_doc**  
`07-distribution.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Đóng gói thành package rồi public lên npm để cài bằng `npm install -g` cho nhanh."

**Ví dụ dịch ngược**  
"Kênh phân phối chính của công cụ là registry công khai của NPM; quy trình phát hành tuân thủ quy tắc quản lý phiên bản SemVer."
