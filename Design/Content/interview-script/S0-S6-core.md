# S0-S6 Core — Kịch bản phỏng vấn khung lõi

> Đây là bản người-đọc đầy đủ cho **khung lõi S0-S6**. Nó là phần dùng chung trước khi rẽ sang web hay mobile, và là nơi chất lượng phương pháp lộ rõ nhất.

## Tại sao cần file này
Người mới không biết phải nghĩ theo thứ tự nào khi bắt đầu một dự án từ số 0. File này ép agent hỏi đúng thứ tự, bằng ngôn ngữ đời thường, rồi dịch ngược thành tài liệu chuẩn thay vì quăng template trống cho người dùng tự bơi.

## Nguyên tắc dùng file này
- Hỏi **từng câu một**, không gom nhiều câu.
- Mỗi câu đều có **mặc định thông minh** để người dùng "không biết" vẫn đi tiếp được.
- Agent phải **dịch ngược** câu trả lời đời thường rồi hỏi xác nhận.
- Mỗi câu phải nối vào đúng **một ô tài liệu** trong taxonomy. (Ngoại lệ duy nhất: câu meta-calibrate).

## CAL0 — Cài đặt độ sâu giải thích (Meta-calibrate)

**ask**  
"Chào mừng! Bạn muốn mình giải thích thật kỹ từng bước và lý do (dành cho người mới học thiết kế), hay muốn đi nhanh thẳng vào việc (dành cho người đã quen)?"

**default**  
`Đi nhanh thẳng vào việc, giải thích tối giản.`

**translate_back**  
"Mình ghi nhận mức độ giải thích: `<giải thích kỹ / đi nhanh>`."

**target_doc**  
`null`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Em mới học nên anh giải thích kỹ chút giúp em nhé."

**Ví dụ dịch ngược**  
"Mức độ giải thích được thiết lập là giải thích kỹ từng bước."

**Bẫy thường gặp + cách gỡ**  
Không sa đà vào các câu hỏi khảo sát thông tin ngoài lề không phục vụ thiết kế sản phẩm.

## S0 — Mô tả dự án trong 1 câu

**ask**  
"Nếu kể cho một người bạn trong 10 giây, dự án này là cái gì?"

**default**  
`null` — đây là câu bắt buộc, không được tự điền hộ.

**translate_back**  
"Để mình tóm lại thành 1 câu ngắn kiểu elevator pitch: `<bản tóm lại>`. Mình hiểu vậy đúng chưa?"

**target_doc**  
`00-vision.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Em muốn làm một app để nhóm bạn ở trọ ghi lại ai đã trả tiền điện, nước, đồ chung rồi tự chia lại cho công bằng."

**Ví dụ dịch ngược**  
"Dự án là một ứng dụng giúp nhóm ở trọ theo dõi chi tiêu chung và chia lại chi phí minh bạch cho từng người."

**Bẫy thường gặp + cách gỡ**  
Người mới hay nói bằng tên giải pháp thay vì giá trị, kiểu "em muốn làm app quản lý". Agent phải kéo lại về ích lợi thực: quản lý cái gì, cho ai, để xong việc gì.

## S1 — Nỗi đau đang tồn tại là gì

**ask**  
"Hiện giờ mọi người đang khổ vì chuyện gì, và đang xoay xở kiểu nào khi chưa có sản phẩm này?"

**default**  
"Suy từ câu S0 rồi đề xuất 1 cách hiểu cụ thể nhất để người dùng xác nhận hoặc sửa."

**translate_back**  
"Mình đang hiểu nỗi đau chính là: `<nỗi đau chuẩn hoá>`. Hiện tại họ giải quyết tạm bằng: `<cách xoay xở hiện nay>`. Đúng ý bạn chứ?"

**target_doc**  
`00-vision.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Giờ tụi em chụp hoá đơn rồi nhắn trong nhóm chat, cuối tháng ngồi cộng tay rất dễ sót và hay cãi nhau."

**Ví dụ dịch ngược**  
"Người dùng hiện theo dõi chi tiêu chung bằng tin nhắn và cộng tay, dẫn tới thất lạc thông tin, sai số khi tổng hợp, và dễ phát sinh tranh cãi lúc chốt tiền."

**Bẫy thường gặp + cách gỡ**  
Người mới hay kể triệu chứng mơ hồ như "bất tiện". Agent phải đào tiếp cho ra nỗi đau quan sát được: mất thời gian, sai số, cãi nhau, quên thông tin, hay không biết ai còn nợ ai.

## S2 — Ai sẽ dùng

**ask**  
"Kể cho mình 1-2 người sẽ dùng nó đầu tiên. Họ là ai, và họ muốn xong việc gì khi mở sản phẩm ra?"

**default**  
"Người dùng phổ thông trực tiếp thao tác + 1 vai trò admin hoặc người quản lý nếu dự án có phối hợp nhóm."

**translate_back**  
"Mình tóm lại có các nhóm người dùng chính sau: `<persona 1>` muốn `<job-to-be-done 1>`; `<persona 2>` muốn `<job-to-be-done 2>`. Ổn chưa?"

**target_doc**  
`01-personas.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Một người là bạn đứng ra trả tiền trước cho cả phòng, người còn lại là từng thành viên chỉ muốn biết tháng này mình phải trả bao nhiêu."

**Ví dụ dịch ngược**  
"Persona 1 là người tạm ứng chi tiêu chung và cần tổng hợp khoản đã chi để thu lại chính xác. Persona 2 là thành viên trong phòng và cần xem số tiền mình còn phải thanh toán một cách rõ ràng."

**Bẫy thường gặp + cách gỡ**  
Người mới hay trả lời "ai cũng dùng được". Agent phải ép cụ thể hoá thành người thật đầu tiên, nếu không mọi quyết định sau sẽ loãng.

## S3 — Người dùng làm được những việc gì

**ask**  
"Cứ kể lộn xộn những việc bạn muốn người dùng làm được trong phiên bản đầu. Không cần tự sắp ưu tiên, mình sẽ giúp nhóm lại."

**default**  
<!-- vì phản hồi từ proj-01, proj-02, proj-03: gợi ý mặc định S3 thiếu cấu trúc định dạng -->
Must:
- [Tính năng cốt lõi giải quyết trực tiếp nỗi đau ở S1]
- [Màn hình xem kết quả/Thống kê đơn giản]
Should:
- [Tính năng nâng cao trải nghiệm, thông báo]
Could:
- [Tính năng bổ sung khi có thời gian]
Won't (MVP):
- [Báo cáo phức tạp, mạng xã hội, automation]

**translate_back**  
"Mình đã nhóm lại thành 4 tầng: Must / Should / Could / Won't. Bản MVP nhỏ nhất mình đề xuất là: `<danh sách Must>`. Phần này để sau là: `<danh sách còn lại>`. Bạn xác nhận giúp mình nhé."

**target_doc**  
`02-scope.md`

**gate**  
`scope-locked`

**Ví dụ trả lời đời thường**  
"Người dùng tạo nhóm phòng trọ, thêm khoản chi, chụp ảnh hoá đơn, chia tiền theo đầu người, nhắc người chưa trả, thống kê tháng, đăng nhập Google, đổi giao diện đẹp hơn."

**Ví dụ dịch ngược**  
"Must: tạo nhóm, ghi khoản chi, chia tiền, xem ai còn nợ. Should: ảnh hoá đơn, nhắc thanh toán. Could: thống kê theo tháng. Won't ở MVP: tuỳ biến giao diện."

**Bẫy thường gặp + cách gỡ**  
Người mới có xu hướng gọi mọi thứ là "cần". Agent phải đứng ở vai trò cắt scope, không đứng ở vai trò chiều ý.

**critic**  
*   **challenge**: "Must có đang gánh thứ để-sau không? Cắt được gì để MVP nhỏ hơn?"
*   **ack_prompt**: "Vui lòng xác nhận 'Tôi đồng ý' với danh sách Must đã chốt hoặc đưa ra yêu cầu điều chỉnh."

## Logic phân loại Must / Should / Could / Won't

1. Bắt đầu từ nỗi đau ở S1, không bắt đầu từ danh sách tính năng.
2. Xác định một câu hỏi gốc: "Nếu chỉ được giải quyết 1 việc để sản phẩm có ích, đó là việc gì?"
3. Gộp các ý người dùng kể thành các năng lực rõ ràng, bỏ trùng và tách phần "đẹp hơn" khỏi phần "cần để chạy được".
4. Kiểm tra một tính năng có là **Must** không bằng 3 câu:
   - Bỏ nó đi thì luồng giá trị chính có gãy không?
   - Không có nó thì người dùng còn giải quyết được nỗi đau chính không?
   - Nó có là tiền đề cho nhiều tính năng khác không?
5. Xếp **Should** cho những thứ làm sản phẩm dùng sướng hơn hoặc bớt lỗi hơn, nhưng bỏ đi thì lõi giá trị vẫn còn.
6. Xếp **Could** cho những thứ hay, đẹp, hoặc hữu ích về sau nhưng chưa cần để chứng minh giá trị.
7. Xếp **Won't (for MVP)** cho những thứ dễ gây phình scope: tuỳ biến sâu, dashboard đẹp, automation nâng cao, tích hợp phụ.

**Định nghĩa thực dụng**
- **Must** = tập nhỏ nhất để sản phẩm có nghĩa và chạy được một luồng hoàn chỉnh.
- **Should** = đáng có ngay sau MVP đầu tiên.
- **Could** = làm sau nếu còn thời gian/ngân sách.
- **Won't** = cố ý chưa làm trong phiên bản này.

**Câu hỏi agent nên hỏi thêm khi scope còn loạn**
- "Nếu tuần này chỉ làm được 3 việc, bạn giữ lại 3 việc nào?"
- "Bỏ tính năng này đi thì người dùng còn xong việc chính không?"
- "Tính năng này giải quyết nỗi đau chính hay chỉ làm trải nghiệm đẹp hơn?"

**Cách trình bày lại cho người mới hiểu**
- Không nói "đây là MoSCoW vì framework". Hãy nói: "Mình chia ra phần bắt buộc để sản phẩm có ích ngay, phần nên có để dùng đỡ cực, và phần để sau để không ôm quá tay."
- Mỗi mục Must nên có 1 dòng lý do ngắn.

## S4 — Sản phẩm cần nhớ dữ liệu gì

**ask**  
"Để làm được những việc ở trên, sản phẩm cần nhớ những gì? Cứ kể kiểu đời thường như người dùng, nhóm, khoản chi, ảnh, lịch sử..."

**default**  
"Suy entity trực tiếp từ nhóm Must; chỉ giữ những thứ có ít nhất một tính năng dùng tới."

**translate_back**  
"Mình tóm lại các dữ liệu lõi là: `<danh sách entity>` cùng quan hệ chính giữa chúng. Mỗi loại dữ liệu này phục vụ trực tiếp cho các tính năng Must. Đúng chứ?"

**target_doc**  
`03-data-model.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chắc phải nhớ người dùng, phòng trọ, từng khoản chi, ai đã trả trước, ai đã hoàn tiền, và ảnh chụp hoá đơn nếu có."

**Ví dụ dịch ngược**  
"Các entity lõi gồm User, Group, Expense, Settlement và Receipt Image. Expense thuộc một Group; Settlement gắn với Expense và User để theo dõi ai còn nợ hoặc đã thanh toán."

**Bẫy thường gặp + cách gỡ**  
Người mới hay bịa thêm dữ liệu vì "sau này có thể cần". Agent phải kéo về nguyên tắc: dữ liệu nào không phục vụ Must hiện tại thì chưa đưa vào lõi.

## S5 — Một lần dùng điển hình

**ask**  
"Kể thử một lần dùng điển hình từ lúc mở app đến lúc xong việc. Mình chỉ cần một luồng thật nhất thôi."

**default**  
"Dựng luồng từ tính năng Must quan trọng nhất đã chốt ở S3."

**translate_back**  
"Mình viết lại luồng chuẩn như sau: `<các bước mở đến xong việc>`. Luồng này sẽ là ví dụ chính để kiểm tra MVP có thật sự dùng được hay không."

**target_doc**  
`04-flows.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Một bạn mở app, tạo khoản chi tiền điện, nhập số tiền, chọn những người cùng chia, lưu lại, rồi từng người vào xem mình còn nợ bao nhiêu."

**Ví dụ dịch ngược**  
"Flow điển hình: người dùng tạo expense mới, gán cho nhóm, nhập số tiền và danh sách người tham gia, hệ thống tính phần chia cho từng thành viên, sau đó mỗi thành viên xem nghĩa vụ thanh toán của mình."

**Bẫy thường gặp + cách gỡ**  
Người mới hay kể 3-4 flow cùng lúc. Agent phải chặn lại và chọn **một luồng tiêu biểu nhất** bám tính năng Must #1, vì đây là xương sống để kiểm tra scope có thực dụng không.

## S6 — Ràng buộc thực tế

**ask**  
"Bạn làm một mình hay có nhóm, deadline thế nào, ngân sách đến đâu?"

**default**  
`Solo, không deadline cứng, ưu tiên free-tier.`

**translate_back**  
"Mình tóm lại ràng buộc hiện tại là: `<nguồn lực>`, `<deadline>`, `<ngân sách>`. Mình sẽ dùng phần này để giới hạn scope."

**target_doc**  
`06-constraints.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Em làm một mình ngoài giờ, muốn có bản dùng thử trong khoảng một tháng, gần như không có ngân sách."

**Ví dụ dịch ngược**  
"Dự án được thực hiện solo, thời gian triển khai ngắn, ngân sách giới hạn trong mức free-tier; vì vậy scope MVP cần rất gọn."

**Bẫy thường gặp + cách gỡ**  
Người mới hay nói tham vọng kỹ thuật lớn nhưng bỏ qua giới hạn thật. Agent phải dùng S6 như phanh phạm vi: ít người, ít tiền, ít thời gian thì scope phải co lại ngay.

## S7 — Chọn hình-hài dự án

**ask**  
"Hệ thống hỗ trợ các hình-hài dự án sau: Ứng dụng web (web), App di động (mobile), Web + Mobile (hybrid), Công cụ dòng lệnh (cli). Bạn chọn hình-hài nào?"

**default**  
`web`

**translate_back**  
"Mình xác nhận hình-hài dự án là: `<web / mobile / hybrid / cli>`."

**target_doc**  
`06-constraints.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Em muốn người dùng có app trên Android và iOS dùng cho tiện."

**Ví dụ dịch ngược**  
"Hình-hài dự án được lựa chọn là app di động (mobile)."

**Bẫy thường gặp + cách gỡ**  
Người mới có thể chọn bừa hoặc muốn làm đa nền tảng (hybrid) ngay từ đầu khi chưa có nguồn lực. Agent cần khuyến khích chọn web/mobile đơn lẻ làm MVP trừ khi thực sự cần thiết.

## Checklist nghiệm thu cho S0-S6
- Mỗi câu có đủ `ask`, `default`, `translate_back`, `target_doc`, `gate`.
- Mỗi câu có ví dụ trả lời đời thường và ví dụ dịch ngược tương ứng.
- Mỗi câu có bẫy thường gặp và cách agent gỡ.
- S3 thể hiện rõ agent là người phân loại scope, không đẩy việc ưu tiên lại cho người mới.
- Toàn bộ nội dung bám taxonomy và không mâu thuẫn schema Batch 1.
