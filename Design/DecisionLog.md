# Decision Log — Nhật ký quyết định

> Mỗi dòng = một quyết định + **lý do** + ngày. Để 3 tháng sau không cãi lại với chính mình. Quyết định mới ghi vào đây; quyết định bị đảo thì đánh dấu *superseded*, không xoá.

## Tại sao cần file này
Quyết định nằm rải rác trong nhiều file → quên mất *vì sao* đã chọn → dễ đảo ngược lãng phí. Log tập trung giữ lý do ở một chỗ tra cứu được.

| ID | Ngày | Quyết định | Lý do | Trạng thái |
|---|---|---|---|---|
| D1 | 2026-06-25 | Đối tượng = dự án greenfield + người **không biết viết doc** | Thu hút đông người dùng; tạo khe hở so với đối thủ (vốn giả định user đã biết mình muốn gì) | Active |
| D2 | 2026-06-25 | Cốt lõi là **PHỎNG VẤN**, không sinh từ template trống | Người mới không biết điền gì vào template rỗng | Active |
| D3 | 2026-06-25 | Hình hài = **plugin native từng harness, dùng chung một lõi** | Trải nghiệm tốt nhất + ép mạnh nhất mỗi nơi; đổi lại rủi ro bảo trì N nền tảng → kỷ luật lõi béo/adapter gầy | Active |
| D4 | 2026-06-25 | **Không build agent** — chạy trên lưng agent có sẵn | Kịch bản phỏng vấn mới là sản phẩm; không nuôi model | Active |
| D5 | 2026-06-25 | Adapter theo **HARNESS**, không theo **MODEL** | DeepSeek/GLM là model chạy trong harness → phủ harness là phủ luôn model | Active |
| D6 | 2026-06-25 | Ra mắt **Claude Code trước**, rồi `AGENTS.md` | Claude Code ép cứng được → chứng minh tầm nhìn đầy đủ, làm reference cho hợp đồng | Active |
| D7 | 2026-06-25 | Anchor neo theo **symbol name**, không line-range | Bền khi thêm/bớt dòng; line-range giòn tới mức vô dụng khi maintain | Active |
| D8 | 2026-06-25 | Anchor `rev` = **git blame SHA** | Cho biết commit nào chạm symbol → so SHA biết có drift + nối thẳng vào diff; checksum chỉ trả lời có/không | Active |
| D9 | 2026-06-25 | Scaffolding chưa có code → anchor **trỏ file dự kiến** + `status=planned` | Mỏ neo liền mạch doc→ý định→code, không quãng đứt | Active |
| D10 | 2026-06-25 | TechStack = **Node.js + TypeScript** | Cùng hệ ReportSupporter, type-safe, parse YAML dễ, hợp khi lên CLI/bot | Active |

## Quy ước thêm dòng
- ID tăng dần, không tái dùng.
- Đảo một quyết định: thêm dòng mới (lý do mới), đổi dòng cũ thành `Superseded by D<n>`.
- Quyết định lớn về kiến trúc nên kèm link tới file chi tiết.
