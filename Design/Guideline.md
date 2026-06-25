# Guideline — Mục lục Design

> Đọc theo đúng thứ tự này. Cây `Design/` của DesignEverything **vừa là tài liệu nền móng, vừa là bản mẫu vàng** mà chính sản phẩm này hướng tới sinh ra (dogfooding).

## Tại sao cần file này
Người mới (kể cả chính mình sau 3 tháng) mở thư mục `Design/` sẽ không biết đọc từ đâu. File này là cửa vào: nói rõ thứ tự đọc và mỗi nhánh dùng để làm gì.

## Thứ tự đọc

0. [VibeCode.md](VibeCode.md) — **Khung Kim Cô**: đọc TRƯỚC TIÊN, luật bắt buộc cho mọi AI Agent.
1. [ProductPRD.md](ProductPRD.md) — sản phẩm là gì, cho ai, thắng bằng cái gì.
2. [Glossary.md](Glossary.md) — từ vựng chuẩn (đọc để gọi tên mọi thứ giống nhau).
3. [Core/Contract.md](Core/Contract.md) — hợp đồng Lõi↔Adapter (xương sống kiến trúc).
4. [Core/Schemas/](Core/Schemas/) — các định dạng dữ liệu trung tính (interview-script, state, gate).
5. [Core/AnchorFormat.md](Core/AnchorFormat.md) — format mỏ neo truy vết (đã chốt).
6. [Core/Versioning.md](Core/Versioning.md) — chính sách version để không vỡ adapter.
7. [Content/](Content/) — **sản phẩm thật**: kịch bản phỏng vấn + template + taxonomy + [QualityRubric](Content/QualityRubric.md).
8. [Adapters/](Adapters/) — cách phủ từng harness + ma trận conformance.
9. [Conventions/](Conventions/) — [TechStack](Conventions/TechStack.md) + chuẩn code/git + chiến lược test.
10. [RoadMap/MasterRoadMap.md](RoadMap/MasterRoadMap.md) — mốc thời gian & phạm vi.
11. [DecisionLog.md](DecisionLog.md) — nhật ký quyết định + lý do (tra khi phân vân).

## Bản đồ nhanh

| Thư mục | Vai trò | Tính chất |
|---|---|---|
| `Core/` | Hợp đồng + schema + version + anchor | **Portable, viết một lần** |
| `Content/` | Kịch bản phỏng vấn, template, taxonomy | **Đây là sản phẩm** |
| `Adapters/` | INJECT/GATE/EMIT theo từng harness | **Gầy, xuống bậc theo nền tảng** |
| `Conventions/` | Chuẩn làm việc | Quy ước |
| `RoadMap/` | Lộ trình | Kế hoạch |

> Kỷ luật sống còn: **Lõi phải béo, Adapter phải gầy.**
