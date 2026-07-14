# M-Mobile — Kịch bản phỏng vấn nhánh mobile

> Đây là phần rẽ nhánh **sau S6** cho các dự án mobile. Nhánh này có nhiệm vụ kéo những quyết định tưởng như "chỉ là kỹ thuật" về lại đời thực: người dùng dùng máy nào, có cần offline không, có đụng quyền thiết bị không, có cần push không, và con đường ra store thực tế ra sao.

## Tại sao cần file này
Người mới rất hay mơ một app mobile theo kiểu "code xong là có app". Thực tế mobile thường khó hơn web ở hai chỗ: yêu cầu offline/sync làm chi phí tăng mạnh, và quy trình lên store có review, ký app, phân phối thử. File này buộc agent bới các rủi ro đó ra sớm, trước khi scope phình hoặc ảo tưởng kỹ thuật phá vỡ MVP.

## Nguyên tắc dùng file này
- Chỉ chạy **sau S6** khi `branch = mobile`.
- Mỗi câu phải nối quyết định kỹ thuật về **cách người dùng thật sự dùng điện thoại**.
- Nếu người dùng không biết, agent dùng mặc định từ FirstIdea nhưng phải nói rõ **đổi lại được gì và mất gì**.
- Hai chỗ bắt buộc phải cảnh báo sớm: **M2 offline/sync** và **M5 store/release**.

## M1 — Chạy trên iPhone, Android hay cả hai

**ask**  
"App di động này trước mắt chạy trên hệ điều hành nào (iOS hoặc Android) mà bạn đang có thiết bị thật để test? Bạn có muốn giới hạn ở một bên để đơn giản hóa MVP, hay bắt buộc phải chạy cả hai ngay từ đầu?"

**default**  
`Một nền tảng duy nhất mà bạn đang dùng thiết bị thật để thử nghiệm (Android hoặc iOS) để tránh phức tạp hóa việc build/test cả hai môi trường ở MVP.`

**translate_back**  
"Mình tóm lại phạm vi nền tảng thử nghiệm đầu tiên là `<Android / iOS / cả hai>`. Với nguồn lực hiện tại, việc tập trung vào `<Android / iOS>` làm MVP sẽ giúp giảm thiểu rủi ro build/test."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Mình có điện thoại Android nên muốn làm bản Android chạy trước cho dễ."

**Ví dụ dịch ngược**  
"MVP tập trung phát triển và thử nghiệm trên nền tảng Android trước để giảm thiểu rào cản thiết bị thử nghiệm; phiên bản iOS sẽ được xem xét tích hợp sau khi luồng core chạy tốt."

**Bẫy thường gặp + cách gỡ**  
Người mới hay nói "làm cả hai cho đủ" nhưng không ý thức chi phí setup, build và test trên cả hai hệ điều hành lớn. Agent phải hướng người dùng chọn một bên có sẵn thiết bị thật để rút ngắn thời gian phản hồi ở MVP.

**Vì sao default này hợp lý**  
Tập trung vào một nền tảng duy nhất có thiết bị thật để kiểm thử là hướng đi thực dụng nhất cho MVP, tránh ma sát phân phối và build lỗi đa nền tảng.

## M2 — Có cần dùng được khi mất mạng không

**ask**  
"Nếu điện thoại mất mạng hoặc mạng chập chờn, người dùng còn phải làm được phần nào không? Hay chỉ cần có mạng là đủ?"

**default**  
"Online-first. Chỉ chọn offline-first khi người dùng thật sự có tình huống mất mạng thường xuyên và vẫn phải hoàn thành việc ngay lúc đó."

**translate_back**  
"Mình hiểu yêu cầu kết nối là: `<online-first / cần offline cho tác vụ nào>`. Nếu cần offline, điều đó kéo theo lưu cục bộ, đồng bộ lại khi có mạng, và tăng độ phức tạp đáng kể. Bạn muốn chấp nhận đổi chi phí đó để lấy trải nghiệm này chứ?"

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Nếu mất mạng thì chắc chỉ cần xem lại dữ liệu cũ thôi, còn thêm khoản mới có mạng rồi làm cũng được."

**Ví dụ dịch ngược**  
"MVP có thể theo hướng online-first, chỉ cần cân nhắc cache đọc cho dữ liệu đã xem trước đó; chưa cần offline-first đầy đủ vì luồng ghi dữ liệu không bắt buộc phải hoạt động khi mất mạng."

**Bẫy thường gặp + cách gỡ**  
Người mới rất dễ nói "có offline càng tốt". Agent phải chặn lại và hỏi: offline cho việc nào, tần suất bao nhiêu, nếu không có thì có hỏng giá trị chính không.

**Cảnh báo bắt buộc**  
Nếu chọn offline-first thật, agent phải nói thẳng: **chi phí và độ phức tạp thường tăng gần gấp đôi** vì phải lo cache, conflict, sync, và xử lý trạng thái lệch giữa máy với server.

**Vì sao default này hợp lý**  
Phần lớn MVP mobile không cần offline-first đầy đủ. Online-first giúp giữ scope thấp hơn nhiều và tránh kéo cả kiến trúc vào một bài toán sync chưa chắc đã cần.

## M3 — Có cần camera, GPS, danh bạ, micro, ảnh không

**ask**  
"App có cần đụng tới phần cứng hay dữ liệu trong máy như camera, vị trí, danh bạ, micro, hay thư viện ảnh không?"

**default**  
"Chỉ xin đúng những quyền thật sự phục vụ tính năng Must; không xin 'để dành'."

**translate_back**  
"Mình tóm lại app cần các quyền sau: `<danh sách quyền cần thiết>`, mỗi quyền gắn với `<tính năng Must tương ứng>`. Những quyền chưa phục vụ trực tiếp cho MVP sẽ để sau để tránh tăng rào cản review và niềm tin người dùng."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chắc chỉ cần ảnh để chụp hoá đơn thôi, chưa cần GPS hay micro gì cả."

**Ví dụ dịch ngược**  
"MVP chỉ cần quyền truy cập camera hoặc thư viện ảnh để đính kèm hoá đơn; chưa cần vị trí, danh bạ, hay micro vì các tính năng Must không phụ thuộc vào chúng."

**Bẫy thường gặp + cách gỡ**  
Người mới hay gom nhiều quyền vì nghĩ "biết đâu sau này cần". Agent phải bám nguyên tắc MVP: quyền nào không gắn thẳng vào Must thì chưa xin.

**Vì sao default này hợp lý**  
Mỗi quyền thêm vào đều ảnh hưởng niềm tin người dùng và có thể làm quy trình review trên store khó hơn. Xin ít quyền nhất là mặc định an toàn và thực dụng.

## M4 — Có cần push notification không

**ask**  
"Bạn có cần app chủ động kéo người dùng quay lại bằng thông báo đẩy không? Nếu có thì muốn nhắc họ chuyện gì?"

**default**  
"Có thể dùng FCM nếu push thực sự phục vụ luồng giá trị, nhưng mặc định chưa bật nếu không có lý do rõ ràng từ hành vi người dùng."

**translate_back**  
"Mình hiểu nhu cầu push là: `<có / chưa cần>`, dùng để `<nhắc việc gì>`. Nếu triển khai, phương án thực dụng hiện tại là FCM cho thông báo đẩy; nếu chưa có tình huống buộc phải kéo người dùng quay lại, có thể để sau MVP."

**target_doc**  
`05-architecture.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Nếu ai đó còn nợ tiền lâu quá thì có thông báo nhắc sẽ hay, còn bình thường chắc chưa cần."

**Ví dụ dịch ngược**  
"Push notification có giá trị chủ yếu cho luồng nhắc thanh toán. Vì đây không phải điều kiện để hoàn thành giá trị cốt lõi của MVP, tính năng này có thể được thiết kế sẵn hướng triển khai bằng FCM nhưng chưa bắt buộc đưa vào bản đầu."

**Bẫy thường gặp + cách gỡ**  
Người mới hay thêm push vì thấy app nào cũng có. Agent phải hỏi ngược: nếu không gửi thông báo thì người dùng còn hoàn thành việc chính không, hay push chỉ là phần tăng quay lại sau này.

**Vì sao default này hợp lý**  
FCM là mặc định hợp lý khi thật sự cần push, nhưng bản thân push không nên tự động trở thành Must. Nó chỉ đáng làm khi có một hành vi cần kéo người dùng quay lại rõ ràng.

## M5 — Kiếm tiền kiểu gì, và phát hành store thật hay bản thử

**ask**  
"Bạn đang nghĩ app này kiếm tiền kiểu gì, và ở giai đoạn đầu muốn lên store thật luôn hay chỉ cần bản thử để test với người dùng trước?"

**default**  
"Mặc định phát hành bản thử trước qua TestFlight hoặc kênh internal test. Nếu có bán trong app, dùng in-app purchase và chấp nhận phí nền tảng."

**translate_back**  
"Mình tóm lại chiến lược phát hành là: `<bản thử / lên store thật ngay>`, và kiếm tiền theo hướng `<free trước / in-app purchase / cách khác>`. Mình lưu ý trước rằng mobile không phải code xong là phát hành được ngay: còn review, ký app, cấu hình phân phối và vòng test trước khi public."

**target_doc**  
`07-release.md`

**gate**  
`null`

**Ví dụ trả lời đời thường**  
"Chắc cứ cho dùng thử trước đã, nếu ổn thì sau này mới nghĩ chuyện bán gì đó trong app."

**Ví dụ dịch ngược**  
"Giai đoạn đầu nên phát hành bản thử qua TestFlight hoặc internal testing để thu phản hồi trước khi lên store công khai. Chiến lược kiếm tiền chưa phải trọng tâm của MVP; nếu sau này bán trong app, hướng mặc định là in-app purchase và cần tính tới phí nền tảng."

**Bẫy thường gặp + cách gỡ**  
Người mới rất hay tưởng "xây xong app là bấm publish". Agent phải bới ra đủ chuỗi việc: build ký app, gửi review, phân phối thử, sửa nếu bị từ chối, rồi mới tới phát hành công khai.

**Cảnh báo bắt buộc**  
Agent phải nói rõ: **lên store là một quy trình riêng**, không chỉ là bước cuối của coding. Có review, ký app, metadata, phân phối thử và khả năng bị reject. Nếu chưa cần phân phối rộng ngay, bản thử trước gần như luôn là đường an toàn hơn.

**Vì sao default này hợp lý**  
Với MVP, bản thử qua TestFlight hoặc internal test giúp học nhanh hơn và ít rủi ro hơn lên store thật ngay. Nó giữ đúng tinh thần sản phẩm: kiểm chứng nhu cầu trước khi ôm thêm độ phức tạp vận hành.

**critic**  
*   **challenge**: |
      [CẢNH BÁO BẪY PHÁT HÀNH DI ĐỘNG & HYBRID]
      Xin lưu ý các rào cản lớn đối với ứng dụng di động (Mobile) và ứng dụng đa kênh (Hybrid):
      1. Offline-first & Đồng bộ dữ liệu (nếu chọn): Sẽ đội chi phí và thời gian phát triển lên gấp đôi do phải xử lý lưu trữ cục bộ, hàng đợi, và đồng bộ.
      2. Quy trình lên App Store / Play Store: Bạn bắt buộc phải chuẩn bị phí tài khoản Developer ($99/năm cho Apple, $25 một lần cho Google), ký ứng dụng (App Signing), và chờ kiểm duyệt nghiêm ngặt.
      3. Đồng bộ đa kênh (Hybrid): Việc đồng bộ hóa tính năng và thời điểm phát hành giữa hai kênh Web và Mobile đòi hỏi quy trình kiểm thử và tích hợp CI/CD rất chặt chẽ để tránh lệch pha dữ liệu.
*   **ack_prompt**: "Vui lòng xác nhận 'Tôi đồng ý' để chấp nhận chi phí và quy trình này hoặc đưa ra yêu cầu điều chỉnh."

## Checklist nghiệm thu cho M1-M5
- Mỗi câu có đủ `ask`, `default`, `translate_back`, `target_doc`, `gate`.
- Mỗi câu đều có ví dụ đời thường, ví dụ dịch ngược, bẫy, và phần giải thích vì sao mặc định đó hợp lý.
- M2 phải cảnh báo rất rõ chi phí offline/sync tăng mạnh trước khi chốt.
- M5 phải nói rõ review, ký app, phân phối thử, và phá ảo tưởng "code xong là có app".
- M1, M3, M4 rót đúng `05-architecture.md`; M5 rót đúng `07-release.md`.
- Nội dung khớp default đã chốt trong FirstIdea cho nhánh mobile.
