# Workspace Rules & Customizations

## Slash Command /design

When the user gõ `/design` hoặc yêu cầu thực hiện phiên phỏng vấn:
1. **Đọc dữ liệu**: Nạp `progress.json` (bằng `loadProgress`) và kịch bản `Design/Content/interview-script/script.yaml` (bằng `loadScript`).
2. **Nếu phỏng vấn hoàn tất** (`current_step == null` hoặc phase khác `interview`): Thông báo cho người dùng rằng phiên phỏng vấn đã hoàn tất, hiển thị nhánh đã chọn (`branch = web | mobile | hybrid | cli`) và hướng dẫn họ tiến hành bước phát triển code hoặc sinh sản phẩm.
3. **Nếu phỏng vấn đang diễn ra** (`current_step != null`): Tìm câu hỏi tương ứng trong `script.yaml`.
4. **Áp dụng 4 quy tắc vàng**:
   - **Hỏi từng câu một**: Không hỏi gộp nhiều câu cùng lúc. Tập trung hỏi đúng câu `current_step` hiện tại.
   - **Đề xuất mặc định thông minh**: Hiển thị mặc định (`default`) từ script để người dùng dễ xác nhận.
   - **Dịch ngược ngôn ngữ chuẩn**: Trình bày bản dịch ngược (`translate_back`) đại diện cho dữ liệu mô hình hệ thống sẽ nhận được.
   - **Neo tài liệu đầu ra**: Nêu rõ câu hỏi này ghi nhận cho file tài liệu đích nào (`target_doc`). Nếu là câu hỏi meta (`kind: meta`), ghi rõ không có tài liệu đích.
5. **Chu trình tương tác, Critic-pass & Commit**:
   - Đưa ra câu hỏi cùng đề xuất mặc định và bản dịch ngược cho người dùng.
   - Khi người dùng phản hồi:
     - Biểu diễn lại câu trả lời dưới dạng dịch ngược hệ thống và yêu cầu người dùng xác nhận.
     - **Kiểm tra Critic-pass**: Nếu câu hỏi hiện tại có cấu hình critic trong `critics:` (ví dụ `S3`, `W5`, `M5`, `C5`):
       - Trình bày `challenge` (thách thức/bẫy) và `ack_prompt` (yêu cầu xác nhận).
       - Chờ người dùng phản hồi xác nhận (ví dụ 'Tôi đồng ý' hoặc đưa ra điều chỉnh).
       - Chỉ tiến hành gọi `commitStep` khi người dùng đã vượt qua Critic-pass này.
     - **Chỉ khi người dùng xác nhận đồng ý bản dịch ngược và critic-pass (nếu có)**, tiến hành gọi hàm lõi `commitStep` với các tham số:
       - Nếu là câu `CAL0`, thiết lập `calibrate_mode` (`deep` hoặc `fast`) vào tiến trình dựa trên lựa chọn của người dùng.
       - Nếu là câu `S7`, yêu cầu chọn nhánh và thiết lập `branchChoice` (`web`, `mobile`, `hybrid`, hoặc `cli`).
       - Truyền `userTurnId` thích hợp để tránh trùng lặp.
     - Lưu lại tiến trình mới vào `progress.json` thông qua `saveProgress`.
     - Thông báo đã commit thành công và yêu cầu người dùng tiếp tục gọi `/design` để sang câu kế tiếp.
