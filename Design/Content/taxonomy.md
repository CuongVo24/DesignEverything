# Taxonomy — Cây thư mục đầu ra

> Đây là cây doc mà DesignEverything **sinh ra cho dự án của người dùng** (không phải cây Design này). Bản tối giản cho người mới.

## Tại sao cần file này
Taxonomy là một phần của hợp đồng lõi ([../Core/Contract.md](../Core/Contract.md)): EMIT phải rơi đúng cây này ở mọi harness. Đổi cây = đổi MAJOR ([../Core/Versioning.md](../Core/Versioning.md)).

## Cây đầu ra (bản tối giản)
```
docs/
  00-vision.md          ← S0, S1
  01-personas.md        ← S2
  02-scope.md           ← S3 (Must/Should/Could)
  03-data-model.md      ← S4
  04-flows.md           ← S5
  05-architecture.md    ← câu nhánh theo hình-hài
  06-constraints.md     ← S6 (+ S7 chọn hình-hài)
  07-*.md               ← file phát hành tuỳ hình-hài (xem Registry)
  README.md             ← mục lục + "đọc theo thứ tự này"
```

> File `07-*` **tuỳ hình-hài dự án** (xem Registry bên dưới): `web` → `07-deployment.md`; `mobile` → `07-release.md`; `cli` → `07-distribution.md`; `hybrid` → emit **cả** `07-deployment.md` lẫn `07-release.md`. Validator/adapter coi mỗi tên file là một entry hợp lệ riêng, không phải một chuỗi bracket. Đổi/thêm hình-hài = MAJOR ([DecisionLog D21](../DecisionLog.md)).

## Registry hình-hài dự án (single source)
> **Nguồn chân lý** cho `<shape-id>` hợp lệ. Schema, loader, validator đọc từ đây — KHÔNG hardcode danh sách shape. Thêm shape mới = MAJOR + cập nhật [ConformanceMatrix](../Adapters/ConformanceMatrix.md) cùng commit.

| `shape-id` | Hình-hài dự án | Bộ câu nhánh | File phát hành `07-*` | Trạng thái |
|---|---|---|---|---|
| `web` | Ứng dụng web | W1–W5 | `07-deployment.md` | ✅ code |
| `mobile` | App di động | M1–M5 | `07-release.md` | ✅ code |
| `hybrid` | Web + Mobile (opt-in) | W1–W5 + M1–M5 | `07-deployment.md` + `07-release.md` | ✅ code (v1.2.0) |
| `cli` | Công cụ dòng lệnh / tool dev | C-series (định nghĩa ở B4) | `07-distribution.md` | 📐 spec khoá (B2), chưa code |

> Câu chọn hình-hài **S7** (`branch: core`) set `branch` thành đúng một `shape-id` trong bảng này. Shape ngoài MVP (extension, library, desktop, bot…) chỉ thêm khi nhu cầu thật đòi — xem [V2-ExpansionPlan](../RoadMap/V2-ExpansionPlan.md).

## Quy tắc
- Mỗi file kèm đoạn **"Tại sao cần file này"** (insight HCMUS: vừa có sản phẩm vừa học nghề).
- Mỗi phiên đi qua **khung lõi** (câu `meta` calibrate nếu có → S0–S6 → S7 chọn hình-hài) **rồi bộ câu của một hình-hài**. Số câu tuỳ shape; thư viện định nghĩa bộ câu cho từng `shape-id` trong registry.
- Mỗi file mang mỏ neo truy vết theo [../Core/AnchorFormat.md](../Core/AnchorFormat.md).

## Map câu hỏi → file
| Câu | File đích |
|---|---|
| S0, S1 | `00-vision.md` |
| S2 | `01-personas.md` |
| S3 | `02-scope.md` |
| S4 | `03-data-model.md` |
| S5 | `04-flows.md` |
| S6 | `06-constraints.md` |
| S7 (chọn hình-hài, `branch: core`) | `06-constraints.md` |
| W1, W2, W4, W5 / M1, M2, M3, M4 | `05-architecture.md` |
| W3 / M5 | `07-deployment.md` / `07-release.md` |
| C-series (cli, định nghĩa ở B4) | `05-architecture.md` + `07-distribution.md` |

> Câu `kind=meta` (vd calibrate) KHÔNG có dòng ở đây vì không neo doc.

## Mở rộng tương lai (KHÔNG trong MVP)
Bản "giống công ty": ADR, test plan, ContractForAI (đã có mỏ neo truy vết sẵn → đầu đề-pa cho maintain).
