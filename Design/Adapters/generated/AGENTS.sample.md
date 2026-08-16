<!--
  CẢNH BÁO: ĐÂY LÀ FILE SINH TỰ ĐỘNG, KHÔNG SỬA TAY.
  Nếu cần cập nhật nội dung file này, vui lòng thay đổi
  lõi script/policy/generator và chạy lệnh test để cập nhật.
-->
# AGENTS

## 1. Tại sao repo này dùng chế độ phỏng vấn trước
Repo này buộc agent đi theo hướng phỏng vấn trước khi code để tránh nhảy cóc vào triển khai khi scope và tài liệu còn mơ hồ.

## 2. Nguồn sự thật phải đọc
- Design/VibeCode.md
- Design/Core/Contract.md
- Design/Content/interview-script/script.yaml
- Design/Content/taxonomy.md

## 3. Cách hỏi từng bước
1. Hỏi đúng một câu tại một thời điểm theo `script.yaml`.
2. Nếu người dùng không rõ, dùng `default` như một đề xuất để xác nhận, không coi đó là sự thật tuyệt đối.
3. Luôn dịch ngược câu trả lời sang ngôn ngữ chuẩn rồi hỏi xác nhận từ người dùng.
4. Mỗi câu trả lời sau khi được xác nhận phải được ghi nhận và rót vào đúng file đích trong taxonomy.

> **Lưu ý về nhịp độ phỏng vấn:** Trên các harness mềm không có bộ giới hạn nhịp ép cứng - nhịp một-bước-mỗi-lượt chỉ là chỉ dẫn best-effort cho agent. Yêu cầu agent tự kỷ luật: hỏi một câu, chờ người dùng xác nhận dịch ngược, rồi mới ghi nhận vào doc và chuyển sang câu kế tiếp.

## 3a. Lựa chọn dạng text (fallback)
Harness này không có thẻ chọn native. Khi đến câu được hỗ trợ, hãy liệt kê các lựa chọn sau dạng text, cho phép người dùng tự nhập câu trả lời khác, rồi dịch ngược và chờ xác nhận. Không được tuyên bố có AskUserQuestion/native card.

- **CAL0**: `deep` — Giải thích kỹ: Có thêm lý do và hướng dẫn, nhưng mất thời gian hơn.; `fast` — Đi nhanh: Tập trung chốt quyết định nhanh với giải thích tối giản. **(khuyến nghị)**. Có thể tự nhập phương án khác.
- **S1**: tạo 3 gợi ý theo “nỗi đau + workaround khả dĩ” từ S0 đã commit; nếu thiếu nguồn, ghi `unknown` và hỏi tự nhập.
- **S2**: tạo 3 gợi ý theo “persona + job-to-be-done” từ S0, S1 đã commit; nếu thiếu nguồn, ghi `unknown` và hỏi tự nhập.
- **S3**: tạo 3 gợi ý theo “nhóm Must tiêu biểu” từ S0, S1, S2 đã commit; nếu thiếu nguồn, ghi `unknown` và hỏi tự nhập.
- **S4**: tạo 3 gợi ý theo “entity/relationship từ Must” từ S3 đã commit; nếu thiếu nguồn, ghi `unknown` và hỏi tự nhập.
- **S5**: tạo 3 gợi ý theo “luồng chính từ Must và data” từ S3, S4 đã commit; nếu thiếu nguồn, ghi `unknown` và hỏi tự nhập.
- **S7**: `web` — Ứng dụng web: Triển khai nhanh và truy cập được từ trình duyệt. **(khuyến nghị)**; `mobile` — App di động: Tận dụng trải nghiệm thiết bị nhưng tăng chi phí phát hành.; `hybrid` — Web và mobile: Phủ hai kênh nhưng cần đồng bộ phạm vi và kiểm thử.; `cli` — Công cụ dòng lệnh: Hợp tự động hoá kỹ thuật nhưng kém thân thiện với người phổ thông.. Có thể tự nhập phương án khác.
- **W1**: `public-seo` — Công khai cần SEO: Tăng khả năng được tìm thấy nhưng cần rendering phía server.; `private-app` — Ứng dụng riêng tư: Đơn giản hơn vì phần lớn nội dung sau đăng nhập.; `mixed-rendering` — Kết hợp hai kiểu: Cân bằng trang công khai và app riêng nhưng tăng độ phức tạp.. Có thể tự nhập phương án khác. Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.
- **W2**: `desktop-first` — Ưu tiên máy tính: Tối ưu thao tác màn hình lớn nhưng điện thoại là phụ.; `mobile-first` — Ưu tiên điện thoại: Tối ưu chạm và màn hình nhỏ nhưng desktop cần thích nghi.; `responsive-both` — Responsive cả hai: Phục vụ hai thiết bị nhưng cần kiểm thử nhiều breakpoint. **(khuyến nghị)**. Có thể tự nhập phương án khác.
- **W3**: `preview-subdomain` — Subdomain bản thử: Chia sẻ sớm với chi phí thấp nhưng chưa có thương hiệu riêng. **(khuyến nghị)**; `custom-domain` — Tên miền riêng: Tạo độ tin cậy sớm nhưng cần vận hành DNS và chi phí.; `internal-only` — Chỉ nội bộ: Giảm rủi ro công khai nhưng khó lấy phản hồi bên ngoài.. Có thể tự nhập phương án khác.
- **W4**: `no-account` — Không cần tài khoản: Giảm rào cản vào sản phẩm nhưng hạn chế dữ liệu cá nhân.; `google-email` — Google và email: Đăng nhập thuận tiện nhưng phải vận hành luồng xác thực.; `email-only` — Chỉ email: Ít phụ thuộc bên thứ ba nhưng người dùng nhập mật khẩu nhiều hơn.. Có thể tự nhập phương án khác. Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.
- **M1**: `android` — Android: Dễ thử nghiệm nếu đã có thiết bị Android thật.; `ios` — iOS: Hợp hệ Apple nhưng cần môi trường build và ký riêng.; `both` — Cả hai: Mở rộng phạm vi nhưng làm build và kiểm thử phức tạp hơn.. Có thể tự nhập phương án khác. Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.
- **M2**: `online-first` — Ưu tiên có mạng: Đơn giản nhất nhưng người dùng cần kết nối liên tục để thao tác được. **(khuyến nghị)**; `offline-critical` — Offline tác vụ chính: Bảo vệ luồng quan trọng nhưng cần sync có chọn lọc.; `offline-first` — Offline trước: Trải nghiệm bền vững nhưng chi phí đồng bộ và xung đột cao.. Có thể tự nhập phương án khác.
- **M4**: `no-push` — Chưa cần push: Giữ MVP đơn giản nhưng ít khả năng kéo người dùng quay lại. **(khuyến nghị)**; `transactional-push` — Push giao dịch: Nhắc việc thiết yếu nhưng cần sự kiện và quyền thông báo.; `engagement-push` — Push tương tác: Tăng quay lại nhưng dễ gây phiền và đòi hỏi tối ưu.. Có thể tự nhập phương án khác.
- **M5**: `internal-test` — Thử nghiệm nội bộ: Nhận phản hồi nhanh nhưng chưa tiếp cận người dùng công khai. **(khuyến nghị)**; `store-free` — Store miễn phí: Có phân phối công khai nhưng vẫn qua thủ tục store.; `store-iap` — Store in-app purchase: Có doanh thu trong app nhưng chịu phí và chính sách nền tảng.; `store-other` — Store cách khác: Linh hoạt mô hình nhưng cần tự xác định quy trình tuân thủ.. Có thể tự nhập phương án khác.
- **C1**: `node-ts` — Node TypeScript: Tận dụng hệ sinh thái phong phú nhưng cần runtime Node. **(khuyến nghị)**; `python` — Python: Viết nhanh và dễ học nhưng đóng gói đa nền tảng cần chú ý.; `go` — Go: Binary gọn nhẹ nhưng tốc độ phát triển ban đầu có thể chậm hơn.; `rust` — Rust: An toàn và hiệu năng cao nhưng đường học và compile phức tạp.. Có thể tự nhập phương án khác.
- **C2**: `flags` — Flags và arguments: Dễ tự động hoá nhưng người mới phải nhớ cú pháp.; `interactive` — Menu tương tác: Dễ khám phá nhưng khó dùng trong script tự động.; `pipeline` — Pipeline stdin stdout: Ghép công cụ tốt nhưng cần quy ước dữ liệu rõ.; `flags-interactive` — Flags và menu: Phục vụ cả hai cách nhưng bề mặt CLI lớn hơn. **(khuyến nghị)**. Có thể tự nhập phương án khác.
- **C4**: `windows` — Windows: Tối ưu máy hiện tại nhưng chưa bảo đảm hệ khác.; `macos` — macOS: Hợp hệ Apple nhưng khác biệt shell và đóng gói.; `linux` — Linux: Hợp môi trường server nhưng ít bao phủ desktop phổ thông.; `cross-platform` — Đa nền tảng: Phủ rộng nhưng cần test path và CRLF kỹ hơn.. Có thể tự nhập phương án khác. Không có lựa chọn được khuyến nghị trước vì phụ thuộc ngữ cảnh.
- **C5**: `local` — Chạy cục bộ: Nhanh để thử nghiệm nhưng người khác khó cài đặt. **(khuyến nghị)**; `registry` — Registry ngôn ngữ: Cài đặt quen thuộc nhưng cần duy trì phiên bản phát hành.; `release-binary` — Binary phát hành: Không cần runtime nhưng build đa nền tảng phức tạp.; `os-package-manager` — Package manager hệ điều hành: Tiện cho người dùng nhưng cần công thức cho từng hệ.. Có thể tự nhập phương án khác.

## 4. Gate mềm trước khi code
Không được chủ động sinh code khi các file tài liệu bắt buộc cho gate hiện tại chưa tồn tại.

Các cổng chặn cụ thể:
- **Gate `scope-locked`**: Không bắt đầu tạo hoặc sửa mã nguồn ứng dụng khi chưa có đầy đủ các tài liệu: `00-vision.md`, `01-personas.md`, `02-scope.md`.
- **Gate `plan-validated`**: Không bắt đầu tạo hoặc sửa mã nguồn ứng dụng khi chưa có đầy đủ các tài liệu: `00-vision.md`, `01-personas.md`, `02-scope.md`, `03-data-model.md`, `04-flows.md`, `05-architecture.md`, `06-constraints.md`, `08-build-plan.md`, `README.md`.

**Các chỉ dẫn an toàn bắt buộc:**
- Trước khi viết code, tự kiểm tra các doc bắt buộc của gate hiện tại đã tồn tại chưa.
- Nếu chưa đủ doc, tiếp tục phỏng vấn hoặc hoàn thiện docs thay vì tạo hoặc chỉnh sửa source code.
- Không được tự ý bỏ qua gate chỉ vì đoán rằng scope đã rõ.

> **Tuyên bố giới hạn:** Trên harness chỉ đọc `AGENTS.md`, gate là chỉ dẫn mạnh chứ không phải chặn cứng bằng cơ chế. Nếu cần enforcement deterministic, dùng Claude Code adapter.

## 5. Cách emit docs
- Viết tài liệu đúng cây taxonomy được định nghĩa trong `Design/Content/taxonomy.md`.
- Mỗi file được tạo ra bắt buộc phải có phần tiêu đề mở đầu `## Tại sao cần file này`.
- Mỗi mục tài liệu phải được đính kèm mỏ neo ẩn ở dạng comment với trạng thái `status=planned` và `rev` để trống theo chuẩn mỏ neo truy vết.
- Không tự tiện tạo thêm file tài liệu mới nằm ngoài cấu trúc taxonomy trừ khi lõi hệ thống đã được cập nhật chính thức.

## 6. Quy trình thực thi V3 (Soft Enforcement)
Quy trình thực thi và ghi nhận bằng chứng ở các harness rules-only:
1. **Xác thực kế hoạch (Validate)**: Phải chạy validator thông qua tài liệu `09-execution-plan.md` và `.design-everything/execution-plan.json` trước khi code.
2. **Kích hoạt task (Start)**: Chỉ làm việc trên duy nhất một active task đang mở. Tự giới hạn phạm vi chỉnh sửa trong các tệp tin thuộc `allowed_paths` của task đó.
3. **Ghi nhận bằng chứng (Evidence & Repair)**: Sau khi chạy các lệnh kiểm chứng, ghi nhận kết quả (exit code, output) vào phần bằng chứng. Nếu lỗi xảy ra, giữ trạng thái ở chế độ sửa chữa (`repairing`) cho tới khi test pass hoàn toàn.
4. **Tuyên bố giới hạn (Self-reported Limitation)**: Chế độ Rules-Only là cơ chế ép buộc mềm. Agent và lập trình viên phải chủ động thực thi đúng kỷ luật và tự ghi nhận bằng chứng trung thực.
