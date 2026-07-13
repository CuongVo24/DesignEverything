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
