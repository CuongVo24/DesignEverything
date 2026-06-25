# W-Web — Kịch bản phỏng vấn nhánh web

> Đây là phần rẽ nhánh **sau S6** cho các dự án web. Mục tiêu của nhánh này là kéo các quyết định kỹ thuật về đúng nhu cầu sử dụng thật, thay vì để agent hoặc người dùng chọn công nghệ theo cảm hứng.

## Tại sao cần file này
Người mới rất dễ chọn kiến trúc web theo trend: thấy Next.js thì dùng Next.js, thấy SPA phổ biến thì chọn SPA. File này buộc agent hỏi lại bằng ngôn ngữ đời thường: người dùng có cần SEO không, dùng trên thiết bị nào, cần tài khoản kiểu gì, có realtime không, để từ đó rót vào `05-architecture.md` và `07-deployment.md` một cách có lý do.

## Nguyên tắc dùng file này
- Chỉ chạy **sau S6** khi `branch = web`.
- Mỗi câu phải nối quyết định kỹ thuật về **nhu cầu người dùng thật**.
- Nếu người dùng không biết, agent dùng mặc định từ FirstIdea nhưng vẫn phải nói rõ **vì sao chọn mặc định đó**.
- Không biến câu hỏi thành bài giảng framework; hãy hỏi kiểu đời thường trước, rồi mới dịch ngược.

## W1 — Có cần người lạ tìm thấy trên Google không

**ask**  
"Người chưa đăng nhập, thậm chí chưa biết sản phẩm, có cần tìm thấy nội dung này trên Google không? Hay đây gần như là chỗ chỉ dùng sau khi vào tài khoản?"

**default**  
"Nếu cần người lạ tìm thấy nội dung hoặc trang công khai, ưu tiên SSR/SSG với Next.js. Nếu gần như chỉ dùng sau đăng nhập, ưu tiên SPA để đơn giản hóa."

**translate_back**  
"Mình tóm lại nhu cầu hiển thị là: `<cần SEO / không cần SEO>`, nên hướng rendering phù hợp là `<SSR/SSG hoặc SPA>` vì `<lý do gắn với cách người dùng tìm và dùng sản phẩm>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chắc không ai tìm trên Google đâu, vì đây là công cụ cho người đã có link mời vào nhóm thôi."

**Ví dụ dịch ngược**  
"Sản phẩm chủ yếu phục vụ người dùng đã vào nhóm hoặc đã đăng nhập, không có nhu cầu SEO mạnh; kiến trúc frontend có thể ưu tiên SPA để giảm độ phức tạp triển khai."

**Bẫy thường gặp + cách gỡ**  
Người mới hay trả lời "có website thì chắc phải lên Google". Agent phải gỡ bằng câu hỏi cụ thể hơn: họ cần tìm thấy bài viết công khai, trang giới thiệu, hay chỉ là màn hình thao tác sau đăng nhập.

**Vì sao default này hợp lý**  
SEO là nhu cầu nghiệp vụ, không phải món trang trí. Nếu cần nội dung công khai, SSR/SSG giúp trang dễ được tìm thấy và tải tốt hơn; nếu không cần, SPA thường là đường ngắn hơn cho MVP.

## W2 — Người dùng chủ yếu dùng trên thiết bị nào

**ask**  
"Người dùng của bạn chủ yếu mở sản phẩm trên máy tính, điện thoại, hay lúc nào cũng lẫn cả hai?"

**default**  
"Cả hai, nên thiết kế responsive và ưu tiên mobile-first ngay từ đầu."

**translate_back**  
"Mình hiểu thiết bị sử dụng chính là `<máy tính / điện thoại / cả hai>`. Vì vậy giao diện nên được thiết kế theo hướng `<responsive mobile-first / desktop-first có lý do cụ thể>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Có lẽ mọi người xem nhanh trên điện thoại nhiều, nhưng thỉnh thoảng vẫn nhập liệu trên laptop."

**Ví dụ dịch ngược**  
"Sản phẩm có nhu cầu dùng trên cả điện thoại và máy tính, với tần suất kiểm tra nhanh trên di động cao; frontend nên theo hướng responsive, ưu tiên mobile-first nhưng không bỏ trải nghiệm desktop."

**Bẫy thường gặp + cách gỡ**  
Người mới hay nói "cả hai" một cách phản xạ. Agent nên hỏi thêm: thao tác nào diễn ra trên điện thoại, thao tác nào trên laptop, để tránh một giao diện nửa mùa ở cả hai phía.

**Vì sao default này hợp lý**  
Phần lớn sản phẩm web đời đầu vẫn bị kéo sang cả desktop lẫn mobile rất sớm. Chọn responsive mobile-first là cách an toàn để không tự khóa mình vào một kích thước duy nhất quá sớm.

## W3 — Khi nào người khác vào bằng link, và deploy kiểu gì

**ask**  
"Bạn muốn người khác có thể mở sản phẩm bằng link ở giai đoạn nào? Có cần tên miền riêng ngay không, hay chỉ cần một bản chạy được để chia sẻ thử trước?"

**default**  
"Triển khai sớm trên Vercel hoặc Netlify với subdomain miễn phí; chưa cần tên miền riêng ở MVP nếu chưa có nhu cầu thương hiệu hoặc vận hành chính thức."

**translate_back**  
"Mình tóm lại nhu cầu triển khai là: `<chia sẻ bản thử sớm / cần miền riêng ngay / chỉ nội bộ>`. Vì vậy phương án phù hợp trước mắt là `<Vercel hoặc Netlify free + subdomain / phương án khác có lý do>`."

**target_doc**  
`07-deployment.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Em chỉ cần có link để gửi cho vài người dùng thử trước, tên miền riêng chắc tính sau."

**Ví dụ dịch ngược**  
"Mục tiêu giai đoạn đầu là phát hành bản dùng thử nhanh qua một URL công khai để thu phản hồi; nên triển khai trên Vercel hoặc Netlify với subdomain mặc định trước khi đầu tư tên miền riêng."

**Bẫy thường gặp + cách gỡ**  
Người mới dễ nghĩ deploy là chuyện rất xa. Agent nên kéo nó vào hiện tại bằng câu hỏi chia sẻ thật: ai sẽ mở link đầu tiên, và họ cần trải nghiệm ổn định đến đâu.

**Vì sao default này hợp lý**  
MVP web cần tốc độ và khả năng chia sẻ sớm. Vercel/Netlify free giải quyết tốt nhu cầu đó mà không ép người dùng chốt hạ tầng quá sớm.

## W4 — Có cần tài khoản, và đăng nhập kiểu gì

**ask**  
"Người dùng có cần vào bằng tài khoản không? Nếu có thì kiểu nào sẽ đỡ rào cản nhất: email, Google, hay một cách đăng nhập khác?"

**default**  
"Nếu cần tài khoản, ưu tiên Google OAuth kèm email/password để vừa dễ vào nhanh vừa có đường fallback."

**translate_back**  
"Mình hiểu bài toán truy cập là: `<cần / không cần tài khoản>`. Nếu cần, phương án đăng nhập phù hợp hiện tại là `<Google OAuth + email/password / phương án khác>` vì `<lý do gắn với độ tiện và đối tượng người dùng>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Có, vì mỗi người phải thấy đúng dữ liệu nhóm mình. Chắc cho đăng nhập Google sẽ đỡ mất công hơn."

**Ví dụ dịch ngược**  
"Sản phẩm cần xác thực người dùng để phân tách dữ liệu theo nhóm. Phương án ưu tiên là Google OAuth để giảm ma sát đăng nhập, đồng thời giữ email/password làm phương án dự phòng."

**Bẫy thường gặp + cách gỡ**  
Người mới hay thêm đăng nhập vì "app nào cũng có". Agent phải hỏi ngược: đăng nhập để làm gì, bảo vệ dữ liệu nào, hay chỉ vì quen mắt. Nếu không có dữ liệu riêng tư hoặc trạng thái cá nhân, có thể chưa cần ngay.

**Vì sao default này hợp lý**  
Google OAuth thường giảm rào cản vào sản phẩm nhanh nhất, còn email/password giữ đường fallback khi người dùng không muốn hoặc không thể dùng OAuth.

## W5 — Có cần realtime hoặc trang admin riêng không

**ask**  
"Có chỗ nào cần cập nhật ngay lúc đó không, kiểu chat, thông báo live, hay nhiều người cùng thấy thay đổi tức thì? Và bạn có cần một khu vực admin riêng để quản lý không?"

**default**  
"Mặc định chưa cần realtime ở MVP; chỉ thêm trang admin nếu từ S2 đã có vai trò admin hoặc người vận hành rõ ràng."

**translate_back**  
"Mình tóm lại mức tương tác thời gian thực là `<không cần / cần ở chỗ nào>`, và nhu cầu quản trị là `<có / chưa cần admin riêng>`. Vì vậy kiến trúc nên `<giữ đơn giản không realtime / bổ sung realtime có phạm vi rõ>`."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chắc chưa cần chat hay live gì cả, chỉ cần người ta vào xem lại dữ liệu là đủ. Cũng chưa cần màn admin riêng, trừ khi sau này có nhiều nhóm quá."

**Ví dụ dịch ngược**  
"MVP không đòi hỏi realtime; mô hình đọc/ghi thông thường là đủ cho luồng giá trị chính. Chưa cần khu vực admin riêng ở giai đoạn đầu vì chưa có vai trò vận hành tách biệt."

**Bẫy thường gặp + cách gỡ**  
Người mới dễ bị hấp dẫn bởi chat, notification live, dashboard admin vì nghe "xịn". Agent phải kéo về câu hỏi gốc: nếu bỏ realtime đi, người dùng có còn xong việc chính không.

**Vì sao default này hợp lý**  
Realtime và admin riêng thường đẩy kiến trúc phức tạp lên rất nhanh. Nếu S2 chưa có một persona quản trị thật và luồng chính không cần tức thời, giữ MVP non-realtime sẽ tiết kiệm đáng kể chi phí xây và test.

## Checklist nghiệm thu cho W1-W5
- Mỗi câu có đủ `ask`, `default`, `translate_back`, `target_doc`, `gate`.
- Mỗi câu đều có ví dụ đời thường, ví dụ dịch ngược, bẫy, và phần giải thích vì sao mặc định đó hợp lý.
- Mọi quyết định trong `05-architecture.md` đều nối về nhu cầu thật của người dùng, không chọn công nghệ chỉ vì phổ biến.
- W3 rót vào `07-deployment.md`; các câu còn lại rót đúng `05-architecture.md`.
- Nội dung khớp default đã chốt trong FirstIdea cho nhánh web.
