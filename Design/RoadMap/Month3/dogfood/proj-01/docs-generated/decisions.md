## Tại sao cần file này
Sáu tháng nữa, khi bạn (hoặc người mới vào dự án) hỏi "vì sao hồi đó chọn cái này?", đây là chỗ trả lời. Mỗi quyết định kỹ thuật trong bảng đều nối ngược về một câu bạn đã trả lời lúc phỏng vấn — nên không có quyết định nào từ trên trời rơi xuống. Không có file này, các lựa chọn ban đầu dần biến thành luật bất thành văn mà không ai dám sửa, vì không ai còn biết nó dựa trên điều gì.

## Bảng Quyết Định
Chốt ngày 2026-07-17, tại thời điểm sinh bộ tài liệu nền móng.

| Mã | Quyết định | Đã chốt là | Nối từ câu | Chi tiết tại |
|---|---|---|---|---|
| D-shape | Hình-hài dự án | mobile | S7 | `06-constraints.md` |
| D-security | Mức bảo mật theo độ nhạy dữ liệu | Chưa khai báo dữ liệu nhạy cảm ngoài thông tin đăng nhập cơ bản. Mức bảo mật tương ứng: băm mật khẩu, không log thông tin đăng nhập, không commit khóa bí mật… | S8 | `05-architecture.md` |
| D-scale | Mức tối ưu theo quy mô dự kiến | Quy mô dự kiến năm đầu ở mức nhỏ (vài chục tới vài trăm người dùng). Ở mức này KHÔNG cần cache, queue, sharding hay microservice — làm sớm chỉ tốn thời gian.… | S8 | `05-architecture.md` |
| D-platform | Nền tảng và chiến lược client | React Native + Expo để build cross-platform nhanh chóng và dễ test trên thiết bị thật qua Expo Go. | M1 | `05-architecture.md` |
| D-overview | Hướng triển khai tổng quan (offline/sync) | Offline-first. Cần lưu trữ logs hoàn thành thói quen cục bộ bằng SQLite; đồng bộ lên Supabase PostgreSQL khi có mạng. | M2 | `05-architecture.md` |
| D-distribution | Phân phối và phát hành store | Quyền truy cập camera để thay đổi ảnh đại diện và đính kèm ảnh minh chứng đã hoàn thành thói quen. | M3 | `07-release.md` |
| D-auth | Xác thực và phân quyền | Cần thông báo nhắc nhở (push notifications) hàng ngày qua Expo Notification Service (hoặc FCM) lúc 8 giờ sáng để nhắc nhở người dùng thực hiện thói quen. | M4 | `05-architecture.md` |
| D-realtime | Realtime, push hoặc đồng bộ | Phát hành bản thử nghiệm qua Expo Application Services (EAS) Internal Testing trước, sau đó phát hành lên Apple App Store và Google Play Store (áp dụng mô hì… | M5 | `05-architecture.md` |
<!-- anchor: id=decisions/table  src=apps/mobile/src/features/decisions/decisions.ts::decisionTable  rev=  status=planned -->

## Vì Sao Chọn Như Vậy
Chưa ghi lý do cho các quyết định ở trên. Mỗi lựa chọn kỹ thuật cần nối ngược về một câu trả lời phỏng vấn cụ thể (nhu cầu người dùng, ràng buộc, hoặc rủi ro) — nếu không nối được thì đó là chọn theo trend, nên xem lại.
<!-- anchor: id=decisions/rationale  src=apps/mobile/src/features/architecture/architecture.ts::architectureDecisionRationale  rev=  status=planned -->

## Phương Án Đã Cân Nhắc Và Loại
Chưa ghi phương án nào bị loại. Một quyết định không có phương án thay thế thường là chưa quyết định — chỉ là mặc định. Ghi rõ đã cân nhắc gì và vì sao loại, để sau này đổi ý còn biết điều kiện nào đã thay đổi.
<!-- anchor: id=decisions/alternatives  src=apps/mobile/src/features/architecture/architecture.ts::architectureAlternativesConsidered  rev=  status=planned -->

## Khi Muốn Đổi Một Quyết Định
Quyết định trong bảng trên không bất di bất dịch — nhưng đổi thì phải đổi tường minh, không đổi lén trong lúc code:

1. Ghi rõ **điều kiện nào đã thay đổi** so với lúc chốt: có nhu cầu mới, đo được nghẽn thật, hay rủi ro đã thành hiện thực?
2. Sửa file chi tiết tương ứng ở cột "Chi tiết tại", kèm lý do mới.
3. Nếu đổi stack hoặc thư viện: cập nhật `docs/conventions/` **trước**, vì đó là danh sách khóa.
4. Chạy lại `validate` — kế hoạch thực thi phải được kiểm tra lại theo quyết định mới.

Đổi quyết định vì đã học được điều mới là trưởng thành. Đổi vì thấy công nghệ khác trông hay hơn là scope creep.
<!-- anchor: id=decisions/change-policy  src=apps/mobile/src/features/decisions/decisions.ts::decisionChangePolicy  rev=  status=planned -->
