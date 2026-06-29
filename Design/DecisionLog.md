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
| D11 | 2026-06-25 | `progress.json` lưu `last_user_turn_id` và chỉ cho advance tối đa 1 bước mỗi lượt người thật | Chốt enforcement "UserPromptSubmit mới được tiến bước", ngăn AI hoặc hook lặp đẩy state nhảy cóc | Active |
| D12 | 2026-06-25 | `interview-script.gate` là field **singular** trỏ 1 gate id; `Stop` không phải block action hợp lệ của `gate-policy` 0.1.0 | Giữ schema đơn giản cho MVP, tránh adapter hiểu gate khác nhau và tránh lạm dụng `Stop` thay `PreToolUse` | Active |
| D13 | 2026-06-25 | Taxonomy đầu ra gộp các quyết định auth, permissions và monetization vào `05-architecture.md` và `07-release.md` thay vì tách file riêng | Giữ bộ docs tối giản cho người mới, giảm số file phải đọc, nhưng vẫn đủ chỗ để neo các quyết định kỹ thuật và phát hành quan trọng | Active |
| D14 | 2026-06-26 | **Mô hình hai lớp** cho enforcement: lớp **skill/LLM** là actor duy nhất diễn giải ý nghĩa (commit `answered`, set `branch` sau S6, xác nhận dịch ngược); lớp **hook deterministic** chỉ ép gate-artifact (`PreToolUse`) + giới hạn nhịp một-bước-mỗi-lượt (`UserPromptSubmit`, đo bằng field mới `answered_len_at_last_turn`). `branch` do skill set và là một chiều. | Vá lỗ hổng: spec cũ bắt hook tự chọn web/mobile và chấm "câu trả lời hợp lệ" — hook không đọc được ý định (FirstIdea §6, gate-policy §1). Tách trách nhiệm giữ enforcement trung thực và buildable. Amend state-schema 0.1.0 tại chỗ vì chưa có code tiêu thụ. | Active |
| D15 | 2026-06-26 | Dữ liệu gate runtime tách thành file `Design/Content/interview-script/gate-policy.yaml` (cạnh `script.yaml`); `gate-policy.md` giữ vai hợp đồng/định nghĩa field. | Runtime không được parse markdown để lấy gate; đặt cạnh `script.yaml` để loader đọc cùng chỗ. Hai bản phải khớp, lệch thì dừng. | Active |
| D16 | 2026-06-28 | Cấu trúc gợi ý mặc định S3 (MoSCoW) thành danh sách và làm rõ cảnh báo M2 (Sync)/M5 (Store) | Phản hồi thực tế từ các phiên dogfood (proj-01, proj-02, proj-03) chỉ ra người dùng dễ bị vướng nếu gợi ý dồn cục, và cảnh báo thiếu chỉ dẫn xác nhận hoặc thiếu số phí cụ thể ($99/$25) | Active |
| D17 | 2026-06-28 | Hoãn mở rộng taxonomy nâng cao (ADR/Test-Plan/ContractForAI) | Dữ liệu dogfood 3 dự án chứng minh bản tối giản hiện tại là đủ; mở rộng sẽ gây gánh nặng nhận thức. Xem chi tiết căn cứ và điều kiện kích hoạt lại tại [taxonomy-decision.md](file:///e:/DesignEverything/Design/RoadMap/Month3/taxonomy-decision.md) | Active |
| D18 | 2026-06-29 | Hỗ trợ cấu hình tùy chọn tiền tố mỏ neo (`srcPrefix`) trong `emitTree` | Sửa lỗi F-04 khi tiền tố `apps/mobile/src/` bị ép cứng cho nhánh mobile, tạo điều kiện cấu hình cho các dự án Expo standalone mà không làm vỡ các adapter cũ | Active |
| D19 | 2026-06-29 | Bổ sung nhánh `'hybrid'` tích hợp Web & Mobile đồng thời | Giải quyết lỗi ma sát F-07 (lệch so với taxonomy-decision §5), sinh ra cả `07-deployment.md` và `07-release.md` cho dự án Hybrid mà không làm phình to taxonomy mặc định | Active |

## Quy ước thêm dòng
- ID tăng dần, không tái dùng.
- Đảo một quyết định: thêm dòng mới (lý do mới), đổi dòng cũ thành `Superseded by D<n>`.
- Quyết định lớn về kiến trúc nên kèm link tới file chi tiết.
