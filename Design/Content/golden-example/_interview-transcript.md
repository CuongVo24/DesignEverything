# Golden Example — Interview Transcript

## Tại sao cần file này
File này là bằng chứng rằng kịch bản phỏng vấn không chỉ đọc được mà còn dùng được trên một dự án giả lập hoàn chỉnh. Nó cho thấy agent hỏi từng câu một, có mặc định thông minh, dịch ngược, và mỗi câu thật sự rót vào đúng ô tài liệu.

## Dự án mẫu
**App chia tiền nhóm bạn ở trọ**  
Mục tiêu: giúp nhóm ở trọ ghi chi tiêu chung, biết ai còn nợ bao nhiêu, và nhắc thanh toán mà không phải cộng tay trong chat.

## Transcript

**S0 - Agent hỏi**  
"Nếu kể cho một người bạn trong 10 giây, dự án này là cái gì?"

**Người dùng trả lời**  
"Em muốn làm một app cho nhóm bạn ở trọ để ghi lại tiền điện nước, đồ chung rồi tự chia lại cho công bằng."

**Agent dịch ngược**  
"Mình hiểu dự án là một ứng dụng giúp nhóm ở trọ theo dõi chi tiêu chung và chia lại chi phí minh bạch cho từng người. Đúng ý bạn chứ?"

**Người dùng xác nhận**  
"Đúng."

**S1 - Agent hỏi**  
"Hiện giờ mọi người đang khổ vì chuyện gì, và đang xoay xở kiểu nào khi chưa có sản phẩm này?"

**Người dùng trả lời**  
"Giờ tụi em chụp hóa đơn rồi nhắn trong group chat, cuối tháng cộng tay dễ sót lắm, lại hay cãi nhau."

**Agent dịch ngược**  
"Mình hiểu nỗi đau chính là nhóm đang theo dõi chi tiêu chung bằng chat và cộng tay, nên dễ thất lạc thông tin, sai số khi chốt tiền, và phát sinh tranh cãi. Đúng không?"

**Người dùng xác nhận**  
"Đúng."

**S2 - Agent hỏi**  
"Kể cho mình 1-2 người sẽ dùng nó đầu tiên. Họ là ai, và họ muốn xong việc gì khi mở sản phẩm ra?"

**Người dùng trả lời**  
"Một người là bạn hay trả tiền trước cho cả phòng. Người còn lại là từng thành viên chỉ muốn biết tháng này mình còn nợ bao nhiêu."

**Agent dịch ngược**  
"Mình tóm lại có hai vai trò chính: người tạm ứng muốn tổng hợp khoản đã chi để thu lại chính xác, và thành viên muốn xem rõ mình còn phải thanh toán bao nhiêu. Ổn chưa?"

**Người dùng xác nhận**  
"Ổn."

**S3 - Agent hỏi**  
"Cứ kể lộn xộn những việc bạn muốn người dùng làm được trong phiên bản đầu. Không cần tự sắp ưu tiên, mình sẽ giúp nhóm lại."

**Người dùng trả lời**  
"Tạo nhóm phòng trọ, thêm khoản chi, chia tiền theo đầu người, xem ai còn nợ, chụp hóa đơn, nhắc người chưa trả, xem thống kê tháng, đăng nhập Google, đổi giao diện đẹp hơn."

**Agent dùng mặc định thông minh + dịch ngược**  
"Mình đề xuất MVP nhỏ nhất như sau. Must: tạo nhóm, ghi khoản chi, chia tiền, xem ai còn nợ. Should: ảnh hóa đơn, nhắc thanh toán, đăng nhập Google. Could: thống kê tháng. Won't ở MVP: tùy biến giao diện. Mình chia như vậy để bản đầu vẫn chạy được một luồng hoàn chỉnh mà không phình. Bạn chốt theo hướng này nhé?"

**Người dùng xác nhận**  
"Chốt vậy đi."

**S4 - Agent hỏi**  
"Để làm được những việc ở trên, sản phẩm cần nhớ những gì? Cứ kể kiểu đời thường như người dùng, nhóm, khoản chi, ảnh, lịch sử..."

**Người dùng trả lời**  
"Chắc phải nhớ người dùng, nhóm ở trọ, từng khoản chi, ai đã trả trước, ai còn nợ, với ảnh hóa đơn nếu có."

**Agent dịch ngược**  
"Mình tóm lại dữ liệu lõi gồm User, Group, Expense, Settlement và Receipt Image. Expense thuộc Group; Settlement gắn với Expense và User để biết ai đã trả và ai còn nợ. Đúng chứ?"

**Người dùng xác nhận**  
"Đúng."

**S5 - Agent hỏi**  
"Kể thử một lần dùng điển hình từ lúc mở app đến lúc xong việc. Mình chỉ cần một luồng thật nhất thôi."

**Người dùng trả lời**  
"Một bạn mở app, tạo khoản chi tiền điện, nhập số tiền, chọn những người cùng chia, lưu lại, rồi cả phòng vào xem mỗi người còn nợ bao nhiêu."

**Agent dịch ngược**  
"Luồng chính sẽ là: tạo expense mới cho nhóm, nhập số tiền và người tham gia, hệ thống tính phần chia, sau đó từng thành viên xem nghĩa vụ thanh toán của mình. Ổn nhé?"

**Người dùng xác nhận**  
"Ổn."

**S6 - Agent hỏi**  
"Bạn làm một mình hay có nhóm, deadline thế nào, ngân sách đến đâu, và hiện tại mình đang nên nghĩ theo hướng web hay app?"

**Người dùng trả lời**  
"Em làm một mình ngoài giờ, muốn có bản thử trong khoảng một tháng, gần như không có ngân sách, và thấy mọi người dùng điện thoại nhiều hơn."

**Agent dùng mặc định thông minh + dịch ngược**  
"Mình hiểu dự án là solo, deadline ngắn, ngân sách gần mức free-tier, và nên ưu tiên hướng mobile. Mình sẽ giữ MVP gọn và rẽ sang nhánh mobile nhé?"

**Người dùng xác nhận**  
"Ừ."

**M1 - Agent hỏi**  
"Bạn muốn app chạy trên iPhone, Android, hay ngay từ đầu phải phủ cả hai?"

**Người dùng trả lời**  
"Cả hai."

**Agent dịch ngược**  
"Vậy bản đầu nên đi theo hướng cross-platform để phủ cả iPhone lẫn Android mà vẫn giữ scope vừa sức cho một người làm."

**Người dùng xác nhận**  
"Ok."

**M2 - Agent hỏi**  
"Nếu điện thoại mất mạng hoặc mạng chập chờn, người dùng còn phải làm được phần nào không? Hay chỉ cần có mạng là đủ?"

**Người dùng trả lời**  
"Nếu mất mạng thì chắc chỉ cần xem lại dữ liệu cũ thôi, còn thêm khoản mới có mạng rồi làm cũng được."

**Agent cảnh báo + dịch ngược**  
"Vậy mình giữ hướng online-first. Nếu đòi offline-first thật thì chi phí sync gần như tăng mạnh ngay, không hợp MVP một tháng này."

**Người dùng xác nhận**  
"Ừ, online-first là được."

**M3 - Agent hỏi**  
"App có cần đụng tới phần cứng hay dữ liệu trong máy như camera, vị trí, danh bạ, micro, hay thư viện ảnh không?"

**Người dùng trả lời**  
"Chỉ cần ảnh để chụp hóa đơn thôi."

**Agent dịch ngược**  
"MVP chỉ cần camera hoặc thư viện ảnh để đính kèm hóa đơn, chưa cần quyền khác."

**Người dùng xác nhận**  
"Đúng."

**M4 - Agent hỏi**  
"Bạn có cần app chủ động kéo người dùng quay lại bằng thông báo đẩy không? Nếu có thì muốn nhắc họ chuyện gì?"

**Người dùng trả lời**  
"Nếu ai còn nợ lâu quá thì có thông báo nhắc sẽ hay."

**Agent dịch ngược**  
"Push có giá trị cho luồng nhắc thanh toán, nhưng chưa phải điều kiện bắt buộc của bản đầu. Mình sẽ ghi là hướng nên có sau MVP."

**Người dùng xác nhận**  
"Ok."

**M5 - Agent hỏi**  
"Bạn đang nghĩ app này kiếm tiền kiểu gì, và ở giai đoạn đầu muốn lên store thật luôn hay chỉ cần bản thử để test với người dùng trước?"

**Người dùng trả lời**  
"Cứ cho dùng thử trước đã, ổn rồi mới nghĩ chuyện bán."

**Agent cảnh báo + dịch ngược**  
"Vậy mình ghi nhận chiến lược phát hành là bản thử trước qua kênh internal test hoặc TestFlight. Mình nhắc luôn là mobile không phải code xong là publish được ngay, còn review và ký app nữa."

**Người dùng xác nhận**  
"Chuẩn."
