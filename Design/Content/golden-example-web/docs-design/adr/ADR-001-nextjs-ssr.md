# ADR-001: Chọn Next.js SSR cho ứng dụng công thức

## Tại sao cần file này
Tài liệu ghi nhận quyết định kiến trúc (ADR) lưu lại bối cảnh, động lực, quyết định cụ thể, và các hệ quả đi kèm cho một lựa chọn công nghệ quan trọng. Điều này giúp các thành viên mới hiểu rõ lý do kỹ thuật đằng sau hệ thống và ngăn ngừa việc thay đổi công nghệ không có cơ sở.

---

## 1. Trạng Thái (Status)
Đã chấp nhận (Accepted)
<!-- anchor: id=design-adr/status/ADR-001  src=src/features/adr/ADR-001.ts::status  rev=  status=planned -->
> Nguồn: doc:docs/05-architecture.md#05-architecture/client-rendering

## 2. Bối Cảnh & Vấn Đề (Context & Problem Statement)
Ứng dụng quản lý công thức nấu ăn có các trang công thức công khai cần được người dùng tìm thấy qua công cụ tìm kiếm, nên SEO là yêu cầu quan trọng ngay từ MVP.
<!-- anchor: id=design-adr/context/ADR-001  src=src/features/adr/ADR-001.ts::context  rev=  status=planned -->
> Nguồn: doc:docs/05-architecture.md#05-architecture/client-rendering

## 3. Quyết Định & Giải Pháp (Decision & Solution)
Chọn Next.js dựng theo hướng SSR (Server-Side Rendering) để tối ưu SEO, xác thực bằng NextAuth với Google OAuth.
<!-- anchor: id=design-adr/decision/ADR-001  src=src/features/adr/ADR-001.ts::decision  rev=  status=planned -->
> Nguồn: doc:docs/05-architecture.md#05-architecture/client-rendering

## 4. Lý Do Lựa Chọn & Hệ Quả (Rationale & Consequences)
SSR đánh đổi bằng việc phải chạy một tiến trình server thay vì host tĩnh thuần. Cần xem xét lại quyết định này nếu chi phí vận hành server vượt ngân sách free-tier, hoặc nếu SEO không còn là kênh thu hút người dùng chính.
<!-- anchor: id=design-adr/rationale/ADR-001  src=src/features/adr/ADR-001.ts::rationale  rev=  status=planned -->
> Nguồn: answers:DS3b@adr-001

## 5. Các Phương Án Đã Cân Nhắc & Loại (Alternatives & Rejected)
Đã cân nhắc SPA thuần bằng React + Vite deploy tĩnh, nhưng bị loại vì render hoàn toàn phía client khiến các trang công thức công khai khó được crawler lập chỉ mục, làm mất lợi thế SEO vốn là yêu cầu cốt lõi.
<!-- anchor: id=design-adr/alternatives/ADR-001  src=src/features/adr/ADR-001.ts::alternatives  rev=  status=planned -->
> Nguồn: answers:DS3a@adr-001
