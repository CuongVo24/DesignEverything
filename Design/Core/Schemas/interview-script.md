# Schema — interview-script

> Định dạng trung tính (YAML/markdown) cho kịch bản phỏng vấn. **Cả Lõi lẫn mọi Adapter đều đọc file này** → chốt sớm, đổi cẩn thận ([Versioning.md](../Versioning.md)).

## Tại sao cần file này
Kịch bản phỏng vấn là sản phẩm, nhưng nó phải có **hình dạng máy đọc được** để adapter render và để gate-policy biết câu nào neo vào doc nào. File này định nghĩa hình dạng đó.

## 1. Một câu hỏi (question) gồm

| Field | Bắt buộc | Ý nghĩa |
|---|---|---|
| `id` | ✓ | Định danh vĩnh viễn (vd `S3`, `W1`). Không tái dùng cho nghĩa khác. |
| `ask` | ✓ | Câu hỏi đời thường (ngôn ngữ người mới). |
| `default` | ✓ | "Mặc định thông minh" khi người dùng nói "không biết". |
| `target_doc` | ✓ | Ô tài liệu câu này điền vào (vd `02-scope.md`). |
| `branch` | | Nhánh kích hoạt: `core` \| `web` \| `mobile`. |
| `gate` | | Điều kiện gate liên quan (trỏ tới [gate-policy.md](gate-policy.md)). |
| `translate_back` | | Ghi chú cách agent tóm lại bằng ngôn ngữ chuẩn. |
| `depends_on` | | id câu hỏi phải xong trước. |

## 2. Bốn quy tắc vàng (agent PHẢI tuân khi chạy script)
1. **Hỏi từng câu một** — không bắn nhiều câu cùng lúc.
2. **Luôn có mặc định thông minh** — "không biết → chọn giúp" vẫn đi tiếp được.
3. **Dịch ngược** — tóm câu trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận.
4. **Mỗi câu neo vào 1 ô doc** — không hỏi câu không biết điền vào đâu.

## 3. Cấu trúc: 1 Khung Lõi + nhánh
- **S0–S6** (`branch: core`) — dùng chung. Web & mobile giống ~70%.
- **W1–W5** (`branch: web`), **M1–M5** (`branch: mobile`) — rẽ sau S6.

Nội dung đầy đủ các câu: [../../Content/interview-script/](../../Content/interview-script/).

## 4. Ví dụ (DRAFT)
```yaml
version: 0.1.0
questions:
  - id: S0
    branch: core
    ask: "Mô tả dự án trong 1 câu, như kể cho bạn thân."
    default: null   # bắt buộc — mỏ neo
    target_doc: 00-vision.md
    translate_back: "Tóm thành elevator pitch 1 dòng."
  - id: S3
    branch: core
    ask: "Liệt kê việc người dùng làm được (kể lộn xộn)."
    default: "Agent đề xuất bộ MVP tối thiểu."
    target_doc: 02-scope.md
    gate: scope-locked
    translate_back: "Xếp thành Must / Should / Could (MoSCoW)."
```

> **S3 là câu khó & quan trọng nhất** — agent là người phân loại Must/Should/Could, người mới không tự ưu tiên được.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khởi tạo skeleton |
