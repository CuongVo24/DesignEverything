# Golden Example — Interview Transcript (Web)

## Tại sao cần file này
File này là minh chứng giả lập cho kịch bản phỏng vấn của nhánh Web (từ S0 đến S6 và rẽ sang W1 đến W5). Nó giúp các nhà phát triển và AI agent thấy rõ cách một phiên hỏi đáp diễn ra trong thực tế, tuân thủ đúng 4 quy tắc vàng: hỏi từng câu một, đề xuất mặc định thông minh, dịch ngược ngôn ngữ chuẩn và neo vào đúng ô tài liệu đầu ra.

## Dự án mẫu
**RecipeShare — Trang chia sẻ & tìm công thức nấu ăn của nhóm bạn**  
Mục tiêu: Giúp nhóm bạn thân lưu trữ, chia sẻ công thức nấu ăn tự chế biến và tự động tạo danh sách đi chợ từ các công thức đó, tránh việc thông tin bị trôi mất trong group chat.

---

## Transcript

**S0 - Agent hỏi**  
"Mô tả dự án trong 1 câu, như kể cho bạn thân."

**Người dùng trả lời**  
"Em muốn làm một trang web để nhóm bạn thân tụi em đăng công thức nấu ăn tự làm lên, rồi ai thích món gì thì bấm chọn để tự gom nguyên liệu thành danh sách đi chợ cho tiện."

**Agent dịch ngược**  
"Mình hiểu dự án là một ứng dụng web giúp nhóm bạn chia sẻ công thức nấu ăn cá nhân và tự động tổng hợp danh sách nguyên liệu cần mua (danh sách đi chợ) từ các công thức đã chọn. Đúng ý bạn chứ?"

**Người dùng xác nhận**  
"Đúng rồi."

---

**S1 - Agent hỏi**  
"Người ta đang khổ vì chuyện gì? Hiện xoay xở ra sao?"

**Người dùng trả lời**  
"Mỗi lần muốn nấu ăn chung cuối tuần là tụi em lại phải lội chat tìm công thức cũ rất mất thời gian. Nhiều lúc đi chợ thì không nhớ món đó cần mua những nguyên liệu gì, mua thiếu hoặc mua trùng tùm lum."

**Agent dịch ngược**  
"Nỗi đau chính là: nhóm không có nơi lưu trữ công thức tập trung (phải tìm lại tin nhắn trôi) và gặp khó khăn khi chuẩn bị nguyên liệu đi chợ (dễ quên hoặc mua sai). Hiện tại nhóm đang xoay xở bằng cách nhắn tin thủ công. Đúng không?"

**Người dùng xác nhận**  
"Đúng."

---

**S2 - Agent hỏi**  
"Ai sẽ dùng? Kể 1–2 người cụ thể & việc họ muốn làm xong."

**Người dùng trả lời**  
"Có bạn My là người nấu chính, muốn đăng công thức có hình ảnh và các bước rõ ràng. Còn em là người đi chợ, muốn tìm nhanh công thức món thịt kho rồi xem danh sách cần mua những gì để đi siêu thị."

**Agent dịch ngược**  
"Mình tóm tắt có hai đối tượng (personas) chính: 'Người chia sẻ công thức' (như bạn My) cần đăng tải nguyên liệu/các bước nấu dễ dàng, và 'Người đi chợ' (như bạn) cần tìm nhanh công thức và xem danh sách mua sắm trên điện thoại. Đúng chưa bạn?"

**Người dùng xác nhận**  
"Chuẩn."

---

**S3 - Agent hỏi**  
"Liệt kê việc người dùng làm được (kể lộn xộn)."

**Người dùng trả lời**  
"Đăng nhập tài khoản, tạo công thức nấu ăn mới, sửa/xóa công thức, tìm kiếm công thức theo tên, chia sẻ link cho người ngoài xem, tích chọn công thức để tự động tạo danh sách đi chợ, đánh dấu nguyên liệu đã mua trong siêu thị, viết bình luận nhận xét món ăn, đăng nhập bằng Google."

**Agent dùng mặc định thông minh + dịch ngược**  
"Mình đề xuất phân chia MVP như sau. Must: đăng nhập, xem danh sách công thức, tạo công thức mới, tìm kiếm theo tên, chia sẻ link xem công thức. Should: đăng nhập Google, chọn công thức để tự động gom thành danh sách đi chợ, đánh dấu nguyên liệu đã mua. Could: sửa/xóa công thức của chính mình. Won't ở MVP: viết bình luận nhận xét. Chia vậy để bản đầu tiên hoàn thành nhanh nhất nhưng vẫn dùng được. Bạn đồng ý chứ?"

**Người dùng xác nhận**  
"Đồng ý, chốt thế đi."

---

**S4 - Agent hỏi**  
"Sản phẩm cần nhớ những gì? (user, bài viết, đơn hàng...)"

**Người dùng trả lời**  
"Cần nhớ tài khoản người dùng, các món ăn (có tên, hình ảnh, nguyên liệu, các bước nấu), và danh sách đi chợ mà người dùng đã tạo."

**Agent dịch ngược**  
"Mình tóm lại dữ liệu cần lưu trữ gồm: User, Recipe (chứa Ingredients và Steps), và ShoppingList (chứa danh sách nguyên liệu và trạng thái đã mua). Một Recipe sẽ do một User tạo ra. Đúng chứ?"

**Người dùng xác nhận**  
"Đúng."

---

**S5 - Agent hỏi**  
"Kể một lần dùng điển hình từ mở app đến xong việc."

**Người dùng trả lời**  
"Em mở web ra, gõ tìm món 'Thịt kho tàu', bấm vào xem công thức của My đăng. Em thấy thích nên bấm 'Thêm vào giỏ đi chợ'. Web tự hiện ra danh sách nguyên liệu cần mua. Em cầm điện thoại ra siêu thị, vừa nhặt đồ vừa tích chọn đã mua."

**Agent dịch ngược**  
"Hành trình điển hình sẽ là: Người dùng tìm kiếm công thức $\rightarrow$ Xem chi tiết món $\rightarrow$ Thêm món vào danh sách đi chợ $\rightarrow$ Hệ thống gộp các nguyên liệu cần mua $\rightarrow$ Người dùng xem danh sách đi chợ trên di động và đánh dấu đã mua tại thực địa. Đúng luồng bạn muốn chứ?"

**Người dùng xác nhận**  
"Đúng rồi."

---

**S6 - Agent hỏi**  
"Một mình/nhóm? deadline? ngân sách? web hay app?"

**Người dùng trả lời**  
"Em làm một mình, muốn xong trong 3 tuần để kịp sinh nhật nhóm bạn, không có tiền mua server nên muốn free, và muốn làm web cho dễ chia sẻ link."

**Agent dùng mặc định thông minh + dịch ngược**  
"Dự án là solo dev, deadline 3 tuần (khá gấp), ngân sách free-tier, và hướng triển khai là ứng dụng Web. Mình sẽ giữ MVP tối giản nhất để kịp tiến độ và chuyển sang hỏi nhánh Web nhé?"

**Người dùng xác nhận**  
"Ok."

---

**W1 - Agent hỏi**  
"Người lạ trên Google có cần tìm thấy nội dung?"

**Người dùng trả lời**  
"Có chứ, tụi em muốn sau này chia sẻ công thức lên thì ai tìm kiếm trên Google cũng thấy công thức của tụi em để họ nấu theo."

**Agent dùng mặc định thông minh + dịch ngược**  
"Vì bạn cần người lạ tìm thấy công thức qua Google (SEO), mình đề xuất kiến trúc web sử dụng Server-Side Rendering (SSR) hoặc Static Site Generation (SSG) - cụ thể là dùng framework Next.js. Các trang công thức public sẽ được render phía server để Google lập chỉ mục dễ dàng, còn trang danh sách đi chợ riêng tư sẽ render phía client (CSR) sau khi đăng nhập. Bạn thấy phương án này ổn chứ?"

**Người dùng xác nhận**  
"Quá hợp lý."

---

**W2 - Agent hỏi**  
"Dùng chủ yếu máy tính, điện thoại, hay cả hai?"

**Người dùng trả lời**  
"Cả hai nha. Lúc đăng công thức thì viết trên máy tính cho nhanh, còn lúc đi chợ thì mở điện thoại lên xem danh sách nguyên liệu."

**Agent dùng mặc định thông minh + dịch ngược**  
"Vì người dùng soạn thảo công thức trên PC và xem danh sách đi chợ trên điện thoại, giao diện web bắt buộc phải thiết kế responsive (co giãn tốt trên mọi màn hình) và tối ưu hóa trải nghiệm mobile-first cho trang ShoppingList. Đúng hướng bạn muốn chứ?"

**Người dùng xác nhận**  
"Đúng."

---

**W3 - Agent hỏi**  
"Muốn người khác vào bằng link lúc nào? Tên miền riêng?"

**Người dùng trả lời**  
"Chỉ cần deploy lên rồi gửi link cho tụi nó vào xài là được, xài tên miền free cũng được chưa cần mua domain riêng."

**Agent dùng mặc định thông minh + dịch ngược**  
"Mình đề xuất deploy ứng dụng Next.js lên Vercel sử dụng gói free-tier và dùng subdomain mặc định dạng `recipeshareshare.vercel.app`. Phương án này nhanh, không tốn chi phí và ổn định. Chốt nhé?"

**Người dùng xác nhận**  
"Chốt."

---

**W4 - Agent hỏi**  
"Cần tài khoản? Đăng nhập kiểu gì?"

**Người dùng trả lời**  
"Cần đăng nhập để lưu danh sách đi chợ riêng. Đăng nhập bằng Google cho nhanh với tiện, không cần mật khẩu rườm rà."

**Agent dùng mặc định thông minh + dịch ngược**  
"Để lưu trữ danh sách đi chợ cá nhân, người dùng cần có tài khoản. Mình đề xuất tích hợp Google OAuth làm phương thức đăng nhập chính, kết hợp với thư viện NextAuth.js để quản lý session an toàn và nhanh gọn. Bạn đồng ý chứ?"

**Người dùng xác nhận**  
"Đồng ý."

---

**W5 - Agent hỏi**  
"Có chỗ cập nhật tức thì? Cần trang admin riêng?"

**Người dùng trả lời**  
"Không cần cập nhật tức thì đâu, ai đăng công thức mới thì người khác load lại trang là thấy rồi. Cũng không cần trang admin riêng, trong nhóm bạn với nhau nên ai đăng món nấy tự quản lý thôi."

**Agent dùng mặc định thông minh + dịch ngược**  
"Hệ thống sẽ không cần tính năng cập nhật thời gian thực (realtime) phức tạp, chỉ cần reload/fetch thông thường. Đồng thời, không cần xây dựng trang quản trị (Admin Dashboard) riêng biệt cho MVP vì mọi người dùng trong nhóm đều bình đẳng và tự quản lý công thức của mình. Đúng ý bạn chứ?"

**Người dùng xác nhận**  
"Đúng vậy."
