## Tại sao cần file này
File này chốt các quyết định kỹ thuật đủ để build mà không biến kiến trúc thành sân chơi của trend. Mọi lựa chọn trong đây phải nối ngược về cách người dùng thật sự dùng sản phẩm.

## Hướng Triển Khai Tổng Quan
Node.js (TypeScript)
<!-- anchor: id=05-architecture/overview  src=src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
flags/arguments và interactive prompts
<!-- anchor: id=05-architecture/client-rendering  src=src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
file config JSON ~/.config/myapp.json và ENV
<!-- anchor: id=05-architecture/auth-access  src=src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
Không áp dụng đối với CLI.
<!-- anchor: id=05-architecture/realtime-sync  src=src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
cross-platform macOS, Linux, Windows
<!-- anchor: id=05-architecture/device-capabilities  src=src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->

## Dữ Liệu Nhạy Cảm Và Bảo Mật
Chưa khai báo dữ liệu nhạy cảm ngoài thông tin đăng nhập cơ bản. Mức bảo mật tương ứng: băm mật khẩu, không log thông tin đăng nhập, không commit khóa bí mật vào repo. Nếu sau này có thêm dữ liệu cá nhân/thanh toán/sức khỏe, phải cập nhật lại mục này TRƯỚC khi code phần đó.
<!-- anchor: id=05-architecture/data-sensitivity  src=src/features/architecture/architecture.ts::dataSensitivityAndSecurity  rev=  status=planned -->

## Quy Mô Dự Kiến Và Hiệu Năng
Quy mô dự kiến năm đầu ở mức nhỏ (vài chục tới vài trăm người dùng). Ở mức này KHÔNG cần cache, queue, sharding hay microservice — làm sớm chỉ tốn thời gian. Khi nào đo được nghẽn thật thì mới tối ưu, và ghi lại số đo vào mục này.
<!-- anchor: id=05-architecture/expected-scale  src=src/features/architecture/architecture.ts::expectedScaleAndPerformance  rev=  status=planned -->

## Vì Sao Chọn Hướng Này
Chưa ghi lý do cho các quyết định ở trên. Mỗi lựa chọn kỹ thuật cần nối ngược về một câu trả lời phỏng vấn cụ thể (nhu cầu người dùng, ràng buộc, hoặc rủi ro) — nếu không nối được thì đó là chọn theo trend, nên xem lại.
<!-- anchor: id=05-architecture/decision-rationale  src=src/features/architecture/architecture.ts::architectureDecisionRationale  rev=  status=planned -->

## Phương Án Đã Cân Nhắc Và Loại
Chưa ghi phương án nào bị loại. Một quyết định không có phương án thay thế thường là chưa quyết định — chỉ là mặc định. Ghi rõ đã cân nhắc gì và vì sao loại, để sau này đổi ý còn biết điều kiện nào đã thay đổi.
<!-- anchor: id=05-architecture/alternatives-considered  src=src/features/architecture/architecture.ts::architectureAlternativesConsidered  rev=  status=planned -->
