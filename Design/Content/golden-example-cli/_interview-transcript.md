# Golden Example — Interview Transcript (CLI)

## Tại sao cần file này
File này là bằng chứng rằng kịch bản phỏng vấn không chỉ đọc được mà còn dùng được trên một dự án dòng lệnh (CLI) giả lập hoàn chỉnh. Nó cho thấy agent hỏi từng câu một, sử dụng các mặc định thông minh cho dev-tool/CLI, dịch ngược các yêu cầu kỹ thuật và ghi nhận đúng địa chỉ các file tài liệu thiết kế.

## Dự án mẫu
**RecipeShare CLI tool**  
Mục tiêu: Giúp các lập trình viên quản lý, tìm kiếm và xuất bản các công thức nấu ăn trực tiếp từ cửa sổ dòng lệnh (terminal).

## Transcript

**CAL0 - Agent hỏi**  
"Trước khi bắt đầu, bạn muốn thiết kế sản phẩm này ở mức độ chi tiết nào? (ví dụ: chỉ phác thảo ý tưởng tổng quan hay muốn lên thiết kế kỹ thuật chi tiết để viết code được ngay)?"

**Người dùng trả lời**  
"Muốn lên thiết kế kỹ thuật chi tiết luôn."

**Agent dịch ngược**  
"Mình ghi nhận bạn chọn mức độ chi tiết là: `<thiết kế kỹ thuật chi tiết>`."

**Người dùng xác nhận**  
"Đồng ý."

**S0 - Agent hỏi**  
"Nếu kể cho một người bạn trong 10 giây, dự án này là cái gì?"

**Người dùng trả lời**  
"Nó là một công cụ dòng lệnh (CLI tool) giúp các dev quản lý, tìm kiếm nhanh công thức nấu ăn của họ."

**Agent dịch ngược**  
"Mình hiểu dự án là một công cụ CLI giúp các lập trình viên tìm kiếm và quản lý công thức nấu ăn ngay từ terminal. Đúng ý bạn chứ?"

**Người dùng xác nhận**  
"Đúng."

**S1 - Agent hỏi**  
"Hiện giờ mọi người đang khổ vì chuyện gì, và đang xoay xở kiểu nào khi chưa có sản phẩm này?"

**Người dùng trả lời**  
"Mỗi lần cần nấu món gì lại phải mở trình duyệt tìm hoặc lục các file text rải rác trên máy rất mất thời gian."

**Agent dịch ngược**  
"Mình hiểu nỗi đau chính là lập trình viên mất thời gian lục tìm công thức cũ trên mạng hoặc các file text rời rạc cục bộ. Đúng không?"

**Người dùng xác nhận**  
"Đúng."

**S2 - Agent hỏi**  
"Kể cho mình 1-2 người sẽ dùng nó đầu tiên. Họ là ai, và họ muốn xong việc gì khi mở sản phẩm ra?"

**Người dùng trả lời**  
"Người viết và đóng góp công thức (Recipe Contributor) và người chỉ cần tìm để nấu (Shopper/Cook)."

**Agent dịch ngược**  
"Mình tóm lại có hai vai trò chính: người đóng góp công thức muốn quản lý và thêm món mới nhanh, và người nấu muốn tìm kiếm công thức tiện lợi từ terminal. Ổn chưa?"

**Người dùng xác nhận**  
"Ổn."

**S3 - Agent hỏi**  
"Cứ kể lộn xộn những việc bạn muốn người dùng làm được trong phiên bản đầu. Không cần tự sắp ưu tiên, mình sẽ giúp nhóm lại."

**Người dùng trả lời**  
"Thêm công thức mới, xem danh sách công thức, tìm kiếm theo tên, xuất file JSON để lưu trữ, đồng bộ lên cloud, giao diện màu mè."

**Agent dùng mặc định thông minh + dịch ngược**  
"Mình đề xuất MVP nhỏ nhất như sau. Must: thêm công thức, xem danh sách, tìm kiếm. Should: xuất file JSON. Could: đồng bộ cloud. Won't ở MVP: tùy biến màu sắc terminal phức tạp. Bạn chốt theo hướng này nhé?"

**Người dùng xác nhận**  
"Chốt vậy đi."

**S4 - Agent hỏi**  
"Hệ thống cần quản lý những thông tin (thực thể) cốt lõi nào để chạy được luồng trên?"

**Người dùng trả lời**  
"Cần thông tin User, Recipe (gồm tên, nguyên liệu, các bước nấu), và Shopping List."

**Agent dịch ngược**  
"Mình ghi nhận các thực thể dữ liệu cốt lõi là: User, Recipe (có quan hệ 1-N với User), và ShoppingList (danh sách mua đồ liên kết với công thức). Đúng chứ?"

**Người dùng xác nhận**  
"Đúng."

**S5 - Agent hỏi**  
"Mô tả luồng sử dụng chính của một người dùng từ lúc bắt đầu đến khi xong việc."

**Người dùng trả lời**  
"Họ mở terminal -> gõ lệnh search -> xem công thức -> xuất file shopping list."

**Agent dịch ngược**  
"Mình tóm tắt luồng công việc chính là: `<Mở terminal -> Tìm kiếm công thức -> Đọc công thức -> Xuất file shopping list>`. Đúng quy trình bạn muốn chưa?"

**Người dùng xác nhận**  
"Đúng."

**S6 - Agent hỏi**  
"Ai sẽ viết code cho app này, bạn muốn hoàn thành nó trong bao lâu, và có giới hạn ngân sách nào không?"

**Người dùng trả lời**  
"Mình tự viết, muốn xong trong 3 tuần, không mất chi phí."

**Agent dịch ngược**  
"Mình ghi nhận dự án được phát triển bởi solo developer trong thời gian 3 tuần với ngân sách bằng không. Đúng chưa?"

**Người dùng xác nhận**  
"Đúng."

**S7 - Agent hỏi**  
"Bạn muốn xây dựng ứng dụng này dưới hình hài nào: Web App, Mobile App, Hybrid (cả hai), hay một Công cụ dòng lệnh (CLI)?"

**Người dùng trả lời**  
"CLI."

**Agent dịch ngược**  
"Mình ghi nhận nhánh hình hài đã chọn là: `<CLI>`."

**Người dùng xác nhận**  
"Đúng."

**C1 - Agent hỏi**  
"Bạn muốn viết công cụ dòng lệnh này bằng ngôn ngữ hay môi trường nào (ví dụ Node.js, Python, Go, Rust, hay Bash script)?"

**Người dùng trả lời**  
"Node.js (TypeScript) để dùng hệ sinh thái npm."

**Agent dịch ngược**  
"Mình ghi nhận ngôn ngữ và môi trường chạy là: Node.js (TypeScript), sử dụng các thư viện npm."

**Người dùng xác nhận**  
"Đồng ý."

**C2 - Agent hỏi**  
"Giao diện lệnh của app sẽ thế nào? Người dùng truyền flags/arguments (ví dụ --verbose -f file.txt), tương tác qua menu (interactive prompt), hay truyền dữ liệu qua stdin/stdout pipeline?"

**Người dùng trả lời**  
"Thích gõ flags cho nhanh, nhưng nếu thiếu thì hiện menu cho chọn."

**Agent dịch ngược**  
"Mình tóm tắt phương thức giao tiếp CLI là: kết hợp flags/arguments cho CI/CD và menu tương tác (interactive prompts) khi nhập liệu."

**Người dùng xác nhận**  
"Đồng ý."

**C3 - Agent hỏi**  
"Ứng dụng lưu cấu hình, khóa bảo mật (API keys), và dữ liệu ở đâu? (ví dụ file config JSON ở thư mục home, biến môi trường ENV, hay keychain của hệ điều hành)?"

**Người dùng trả lời**  
"Lưu global ở `~/.config/recipe-share/config.json`."

**Agent dịch ngược**  
"Mình ghi nhận giải pháp cấu hình là lưu file JSON cục bộ tại home directory."

**Người dùng xác nhận**  
"Đồng ý."

**C4 - Agent hỏi**  
"Bạn cần ứng dụng chạy trên hệ điều hành nào? Chỉ macOS/Linux, chỉ Windows, hay phải hỗ trợ cả ba (cross-platform)?"

**Người dùng trả lời**  
"Cần chạy trên cả Windows lẫn Mac/Linux."

**Agent dịch ngược**  
"Mình ghi nhận phạm vi tương thích hệ điều hành là cross-platform cả ba nền tảng chính."

**Người dùng xác nhận**  
"Đồng ý."

**C5 - Agent hỏi**  
"Bạn định phân phối công cụ này tới người dùng bằng cách nào? (ví dụ xuất bản lên NPM/Pip/Cargo, tải file binary biên dịch sẵn từ GitHub Releases, hay dùng homebrew/scoop)?"

**Người dùng trả lời**  
"Publish lên npm registry để cài global."

**Agent dịch ngược**  
"Mình xác nhận phương án đóng gói và phát hành là NPM registry, quản lý phiên bản bằng SemVer."

**Người dùng xác nhận**  
"Đồng ý."
