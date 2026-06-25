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
  05-architecture.md    ← S6 + nhánh
  06-constraints.md     ← S6
  07-[deployment|release].md  ← W3 / M5
  README.md             ← mục lục + "đọc theo thứ tự này"
```

## Quy tắc
- Mỗi file kèm đoạn **"Tại sao cần file này"** (insight HCMUS: vừa có sản phẩm vừa học nghề).
- Tổng ~15–16 câu phỏng vấn → đủ dựng nền móng, chưa làm người mới bỏ cuộc.
- Mỗi file mang mỏ neo truy vết theo [../Core/AnchorFormat.md](../Core/AnchorFormat.md).

## Map câu hỏi → file
| Câu | File đích |
|---|---|
| S0, S1 | `00-vision.md` |
| S2 | `01-personas.md` |
| S3 | `02-scope.md` |
| S4 | `03-data-model.md` |
| S5 | `04-flows.md` |
| S6 + nhánh | `05-architecture.md`, `06-constraints.md` |
| W3 / M5 | `07-deployment.md` / `07-release.md` |

## Mở rộng tương lai (KHÔNG trong MVP)
Bản "giống công ty": ADR, test plan, ContractForAI (đã có mỏ neo truy vết sẵn → đầu đề-pa cho maintain).
