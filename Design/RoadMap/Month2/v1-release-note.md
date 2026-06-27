# Release Note — Version 1.0.0 (v1 dùng được)

Bản phát hành chính thức **v1.0.0** đóng mốc hoàn thành giai đoạn **Month 2** của dự án DesignEverything. Hệ thống hiện tại đã hỗ trợ đầy đủ thiết kế hai nhánh Web và Mobile, cơ chế cổng chặn (gating) kiểm soát an toàn mã nguồn, bộ sinh chỉ dẫn rules mềm (`AGENTS.md`) và đã vượt qua bộ kiểm thử hồi quy biên cứng cáp.

---

## 1. Phạm Vi Tính Năng (v1 Scope)

### 1.1. Lõi Phỏng Vấn & Quản Lý Trạng Thái (Core Engine)
*   **Hỏi từng câu một (1-Step-per-Turn)**: Ràng buộc chặt chẽ thông qua `checkRate` và `stampTurn`, ngăn chặn người dùng trả lời gộp/nhảy cóc.
*   **Dịch ngược & Đề xuất mặc định**: Tích hợp các nội dung `translate_back` và đề xuất thông minh `default` từ tệp kịch bản `script.yaml`.
*   **Bảo vệ nhánh hoạt động**: Rẽ nhánh tại câu hỏi quyết định `S6` (chọn `'web'` hoặc `'mobile'`), khóa chặt nhánh đã cam kết và cấm thay đổi ngược.

### 1.2. Hỗ Trợ Nhánh Web (Month 1 Web Path)
*   Đầy đủ bộ câu hỏi nhánh Web từ S0 $\rightarrow$ S6 $\rightarrow$ W1 $\rightarrow$ W5.
*   Phát hành bộ tài liệu 9 file gồm tệp deployment cụ thể: **`07-deployment.md`** (cấu hình deploy Vercel và database).
*   Các mỏ neo planned tự động định tuyến tới mã nguồn web (`src/`).

### 1.3. Hỗ Trợ Nhánh Mobile (Month 2 Mobile Path)
*   Đầy đủ bộ câu hỏi nhánh Mobile từ S0 $\rightarrow$ S6 $\rightarrow$ M1 $\rightarrow$ M5.
*   Phát hành bộ tài liệu 9 file gồm tệp release cụ thể: **`07-release.md`** (cấu hình phân phối App Store, ký ứng dụng, phí developer).
*   Cảnh báo thực tế độ phức tạp offline/sync (M2) và quy trình xét duyệt của store (M5) tích hợp trực tiếp trước khi người dùng xác nhận.
*   Các mỏ neo planned tự động định tuyến tới mã nguồn di động (`apps/mobile/src/`).

### 1.4. Tự Động Sinh Rules Chỉ Dẫn Mềm (AGENTS.md Generator)
*   Hàm thuần `generateAgentsMd` tự động sinh tệp `AGENTS.md` từ lõi `script.yaml` và `gate-policy.yaml`.
*   Tự động kết xuất danh sách tài liệu bắt buộc cho gate `scope-locked` từ chính sách gate-policy thời điểm chạy (runtime).
*   Chứa đầy đủ các tuyên bố giới hạn enforcement mềm và khuyến nghị nhịp độ phỏng vấn best-effort trên các harness mềm.

---

## 2. Hướng Dẫn Thiết Lập Nhanh (Setup)

Yêu cầu Node.js $\ge$ 18.0.0.

```bash
# 1. Clone repository và cài đặt thư viện
npm install

# 2. Chạy thử nghiệm toàn bộ test suite
npm test

# 3. Biên dịch TypeScript
npm run build
```

---

## 3. Cách Trình Diễn Demo (How to Demo)

Hệ thống cung cấp hai cẩm nang vận hành chi tiết tương ứng với từng nhánh thiết kế:
*   Đọc và làm theo **[RUNBOOK-web.md](file:///e:/DesignEverything/RUNBOOK-web.md)** để thử nghiệm nhánh Web.
*   Đọc và làm theo **[RUNBOOK-mobile.md](file:///e:/DesignEverything/RUNBOOK-mobile.md)** để thử nghiệm nhánh Mobile.

---

## 4. Các Giới Hạn Đã Biết (Known Limitations)

Đây là các giới hạn kỹ thuật của phiên bản v1, sẽ được làm dữ liệu backlog nghiên cứu và giải quyết trong giai đoạn **Month 3** và **Month 4**:

1.  **Chưa Đóng Gói (Distribution)**: Mã nguồn lõi và adapter chưa được đóng gói thành CLI chạy độc lập (như `design-everything-cli`) hoặc phát hành lên npm registry. Hiện tại đang dogfood và chạy thử thông qua Vitest E2E harnesses.
2.  **Kích Hoạt Rules Thủ Công (Manual Agents.md Sync)**: CLI/Harness hiện tại chưa tự động trigger gọi `generateAgentsMd` và ghi đè `AGENTS.md` khi người dùng lưu tiến trình `progress.json`. AI skill wrapper cần tự triển khai cơ chế đồng bộ này.
3.  **Khóa Placeholder Tĩnh (Static Placeholders)**: Các khóa placeholder trong tệp tài liệu mẫu (ví dụ: `{{primary_persona_summary}}`) đang được map cứng trong tệp `emit.ts`. Người dùng không thể cấu hình thay đổi tên khóa mà không đụng vào mã nguồn Typescript.
4.  **Chặn Multi-line input ở client**: Cơ chế chặn rate-limit chỉ đếm số lượng câu trả lời đã commit so với lượt Stamp. Nếu client CLI/harness không giới hạn và gửi lên một tin nhắn chứa nhiều dòng trả lời gộp ở cùng một lượt Submit, engine chỉ coi đó là một câu trả lời duy nhất.
