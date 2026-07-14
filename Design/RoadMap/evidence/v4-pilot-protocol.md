# Pilot Protocol — V4 Newbie Experience Evaluation

Tài liệu này quy định quy chuẩn thử nghiệm thực tế (Pilot Protocol) để kiểm chứng trải nghiệm của lập trình viên tập sự (newbie) khi sử dụng hệ thống DesignEverything dưới sự giám sát của các cổng an toàn (release gates).

## 1. Bản Đồng Ý Tham Gia (Consent) & Nguyên Tắc Ẩn Danh
- **Quyền riêng tư**: Tuyệt đối không thu thập PII (tên, email, số điện thoại), mã nguồn dự án riêng hoặc token/API keys của người tham gia.
- **Dữ liệu ghi nhận**: Chỉ ghi nhận cấu hình thử nghiệm, thời gian hoàn thành, các can thiệp hỗ trợ kỹ thuật và phản hồi của người tham gia dưới dạng bí danh ẩn danh (alias).
- **Lưu trữ**: Dữ liệu thô được công bố công khai tại repo dưới dạng tệp dữ liệu thô `v4-pilot-raw.md`.

## 2. Kịch Bản Thử Nghiệm (Task Script)
Người tham gia được cung cấp một thư mục trống và yêu cầu thực hiện chuỗi nhiệm vụ:
1. Chạy lệnh chẩn đoán dự án (`doctor`) để tạo Project Profile.
2. Xác nhận hình-hài dự án (`cli`, `web` hoặc `mobile`) và chạy lệnh `emit` để sinh tài liệu thiết kế.
3. Chạy lệnh `validate` để sinh kế hoạch thực thi `execution-plan.json` và kiểm tra độ toàn vẹn.
4. Chạy lệnh `start` để kích hoạt nhiệm vụ đầu tiên `T0-discovery`.
5. Tạo tệp tin kiểm chứng giả mạo để thử tính năng ngăn chặn của PreToolUse hook (out-of-scope edit).
6. Hoàn thành nhiệm vụ thực tế và nộp bằng chứng hợp lệ qua lệnh `verify`.

## 3. Định Nghĩa Chỉ Số (Metrics)
- **Tỷ lệ hoàn thành (Completion Rate)**: Phần trăm số phiên đạt đến mốc `ready-to-build` (M0) thành công trên tổng số phiên tham gia.
- **Thời gian hoàn thành (Time-to-M0)**: Thời gian tính từ khi chạy lệnh doctor đến khi validate kế hoạch thành công.
- **Tỷ lệ can thiệp (Intervention Rate)**: Tần suất can thiệp trung bình trên mỗi phiên thử nghiệm.
- **Tỷ lệ lỗi (Failure Rate)**: Phần trăm số phiên thất bại hoàn toàn do vi phạm an toàn nghiêm trọng hoặc không vượt qua gate.

## 4. Phân Loại Can Thiệp (Intervention Taxonomy)
- **I1-clarification**: Người hướng dẫn giải thích thuật ngữ hoặc chỉ dẫn tài liệu cho người tham gia.
- **I2-workaround**: Hướng dẫn lách qua lỗi nhỏ của hệ thống mà không trực tiếp can thiệp vào code.
- **I3-operator-override**: Người hướng dẫn trực tiếp thực hiện lệnh hoặc viết code hộ người tham gia (Lưu ý: Vi phạm nguyên tắc tự chủ, tính là phiên THẤT BẠI).
- **I4-env-fix**: Sửa lỗi môi trường hệ điều hành hoặc cấu hình Node/Python của máy trạm.
