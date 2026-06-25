# Guideline — Mục lục Design

> Đọc theo đúng thứ tự này. Cây `Design/` của DesignEverything **vừa là tài liệu nền móng, vừa là bản mẫu vàng** mà chính sản phẩm này hướng tới sinh ra (dogfooding).

## Tại sao cần file này
Người mới (kể cả chính mình sau 3 tháng) mở thư mục `Design/` sẽ không biết đọc từ đâu. File này là cửa vào: nói rõ thứ tự đọc và mỗi nhánh dùng để làm gì.

## Thứ tự đọc

0. [VibeCode.md](VibeCode.md) — **Khung Kim Cô**: đọc TRƯỚC TIÊN, luật bắt buộc cho mọi AI Agent.
1. [ProductPRD.md](ProductPRD.md) — sản phẩm là gì, cho ai, thắng bằng cái gì.
2. [Core/Contract.md](Core/Contract.md) — hợp đồng Lõi↔Adapter (xương sống kiến trúc).
3. [Core/Schemas/](Core/Schemas/) — các định dạng dữ liệu trung tính (interview-script, state, gate).
4. [Core/AnchorFormat.md](Core/AnchorFormat.md) — format mỏ neo truy vết (quyết sớm).
5. [Core/Versioning.md](Core/Versioning.md) — chính sách version để không vỡ adapter.
6. [Content/](Content/) — **sản phẩm thật**: kịch bản phỏng vấn + template doc + taxonomy.
7. [Adapters/](Adapters/) — cách phủ từng harness + ma trận conformance.
8. [Conventions/](Conventions/) — chuẩn code/git + chiến lược test.
9. [RoadMap/MasterRoadMap.md](RoadMap/MasterRoadMap.md) — mốc thời gian & phạm vi.

## Bản đồ nhanh

| Thư mục | Vai trò | Tính chất |
|---|---|---|
| `Core/` | Hợp đồng + schema + version + anchor | **Portable, viết một lần** |
| `Content/` | Kịch bản phỏng vấn, template, taxonomy | **Đây là sản phẩm** |
| `Adapters/` | INJECT/GATE/EMIT theo từng harness | **Gầy, xuống bậc theo nền tảng** |
| `Conventions/` | Chuẩn làm việc | Quy ước |
| `RoadMap/` | Lộ trình | Kế hoạch |

> Kỷ luật sống còn: **Lõi phải béo, Adapter phải gầy.**
