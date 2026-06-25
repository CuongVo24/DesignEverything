# Interview Script — Nội dung kịch bản phỏng vấn

> **Đây là SẢN PHẨM thật của DesignEverything.** Code (adapter) chỉ là vỏ; chất lượng nằm ở đây. Hình dạng máy đọc: [../../Core/Schemas/interview-script.md](../../Core/Schemas/interview-script.md).

## Tại sao cần file này
Toàn bộ giá trị dồn vào chất lượng phương pháp gốc (người mới không phân biệt được doc tốt/tệ để tự cứu). Đây là nơi mài từng câu hỏi.

## File trong thư mục này
- [S0-S6-core.md](S0-S6-core.md) — bản đầy đủ cho khung lõi dùng chung trước khi rẽ nhánh.
- [W-web.md](W-web.md) — bản đầy đủ cho nhánh web W1-W5.
- [M-mobile.md](M-mobile.md) — bản đầy đủ cho nhánh mobile M1-M5.
- [script.yaml](script.yaml) — bản máy đọc đã khóa ở Batch 6, dùng cho adapter và validator.

## KHUNG LÕI — S0 → S6 (dùng chung)

| # | Câu hỏi đời thường | Nếu "không biết" → mặc định | Điền vào doc |
|---|---|---|---|
| **S0** | Mô tả dự án trong **1 câu**, như kể cho bạn thân. | (bắt buộc — mỏ neo) | `00-vision.md` |
| **S1** | Người ta đang **khổ vì chuyện gì**? Hiện xoay xở ra sao? | Suy từ S0, hỏi xác nhận | `00-vision.md` |
| **S2** | **Ai** sẽ dùng? Kể 1–2 người cụ thể & việc họ muốn làm xong. | "Người dùng phổ thông" + 1 admin | `01-personas.md` |
| **S3** | Liệt kê việc người dùng **làm được** → agent xếp Phải/Nên/Để sau. | Agent đề xuất MVP tối thiểu | `02-scope.md` |
| **S4** | Sản phẩm cần **nhớ những gì**? (user, bài viết, đơn hàng...) | Suy entity từ S3 | `03-data-model.md` |
| **S5** | Kể **một lần dùng điển hình** từ mở app đến xong việc. | Dựng flow từ tính năng "Phải có" #1 | `04-flows.md` |
| **S6** | **Một mình/nhóm**? **deadline**? **ngân sách**? **web hay app**? | Solo / không deadline cứng / free-tier / → rẽ nhánh | `06-constraints.md` + chọn nhánh |

> **S3 khó & quan trọng nhất.** Người dùng kể bừa, agent phân loại Must/Should/Could.

## NHÁNH WEB — W1 → W5

| # | Câu hỏi | Mặc định | Điền vào doc |
|---|---|---|---|
| **W1** | Người lạ trên Google có cần **tìm thấy** nội dung? | Cần SEO → SSR/SSG (Next.js); chỉ sau login → SPA | `05-architecture.md` |
| **W2** | Dùng chủ yếu **máy tính, điện thoại, hay cả hai**? | Cả hai → responsive, mobile-first | `05-architecture.md` |
| **W3** | Muốn người khác **vào bằng link** lúc nào? Tên miền riêng? | Vercel/Netlify free + subdomain | `07-deployment.md` |
| **W4** | Cần **tài khoản**? Đăng nhập kiểu gì? | OAuth Google + email/password | `05-architecture.md` |
| **W5** | Có chỗ **cập nhật tức thì**? Cần **trang admin** riêng? | Không realtime; admin nếu S2 có vai admin | `05-architecture.md` |

## NHÁNH MOBILE — M1 → M5

| # | Câu hỏi | Mặc định | Điền vào doc |
|---|---|---|---|
| **M1** | **iPhone, Android, hay cả hai**? | Cả hai → cross-platform (React Native/Flutter) | `05-architecture.md` |
| **M2** | **Mất mạng** còn dùng được phần nào? | Không → online-first; Có → offline-first + sync (đắt, cảnh báo sớm) | `05-architecture.md` |
| **M3** | Cần **camera, GPS, danh bạ, micro, ảnh**? | Liệt kê quyền cần xin → ảnh hưởng store review | `05-architecture.md` |
| **M4** | Cần **push notification**? | Có → FCM (Firebase) | `05-architecture.md` |
| **M5** | **Kiếm tiền** kiểu gì? Phát hành **store thật hay bản thử**? | Free trước; IAP (store thu 15–30%); TestFlight/Internal test trước | `07-release.md` |

> **2 bẫy mobile người mới luôn dính** — bới ra sớm: (a) offline/sync M2 đội chi phí gấp đôi; (b) quy trình lên store M5.

## Trạng thái hiện tại
- Batch 2 đã mở rộng khung lõi thành bản chi tiết trong [S0-S6-core.md](S0-S6-core.md).
- Batch 3 đã điền nhánh web trong [W-web.md](W-web.md).
- Batch 4 đã điền nhánh mobile trong [M-mobile.md](M-mobile.md).
- Batch 6 đã khóa bản máy đọc trong [script.yaml](script.yaml).
- Batch 7 đã dùng bộ này để dựng golden example hoàn chỉnh cho một dự án mobile mẫu.
