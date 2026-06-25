# Schema — interview-script

> Định dạng trung tính (YAML/markdown) cho kịch bản phỏng vấn. **Cả Lõi lẫn mọi Adapter đều đọc file này** → chốt sớm, đổi cẩn thận ([Versioning.md](../Versioning.md)).

## Tại sao cần file này
Kịch bản phỏng vấn là sản phẩm, nhưng nó phải có **hình dạng máy đọc được** để adapter render và để gate-policy biết câu nào neo vào doc nào. File này định nghĩa hình dạng đó.

## 1. Top-level shape

```yaml
version: 0.1.0
questions:
  - id: S0
    ask: "Mô tả dự án trong 1 câu, như kể cho bạn thân."
    default: null
    target_doc: 00-vision.md
    branch: core
    gate: null
    translate_back: "Tóm lại thành elevator pitch 1-2 câu rồi hỏi xác nhận."
    depends_on: []
```

Top-level bắt buộc có:

| Field | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `version` | string | ✓ | Phiên bản schema đang áp dụng. Batch 1 khoá ở `0.1.0`. |
| `questions` | array\<question\> | ✓ | Danh sách câu hỏi theo thứ tự thực thi chuẩn. Không được rỗng. |

## 2. Shape của một `question`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `id` | string | ✓ | Định danh vĩnh viễn. Regex khuyến nghị: `^[A-Z][A-Za-z0-9-]*$`. Không tái dùng cho nghĩa khác. |
| `ask` | string | ✓ | Câu hỏi đời thường, đã trim, không rỗng. Không nhét thuật ngữ nội bộ vào đây. |
| `default` | string \| null | ✓ | `null` nghĩa là câu bắt buộc, agent không tự điền. String nghĩa là "mặc định thông minh" khi user nói "không biết". |
| `target_doc` | string | ✓ | Tên file đích trong taxonomy, ví dụ `02-scope.md`. Phải tồn tại trong [../../Content/taxonomy.md](../../Content/taxonomy.md). |
| `branch` | `core` \| `web` \| `mobile` | ✓ | Nhánh thực thi của câu hỏi. |
| `gate` | string \| null | ✓ | `id` của gate liên quan trong [gate-policy.md](gate-policy.md), hoặc `null` nếu câu này không nối gate. |
| `translate_back` | string | ✓ | Mẫu/ghi chú dịch ngược để agent tóm trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận. Không được rỗng. |
| `depends_on` | array\<string\> | ✓ | Danh sách `id` phải hoàn tất trước khi câu này được hỏi. Có thể rỗng. |

## 3. Bốn quy tắc vàng (agent PHẢI tuân khi chạy script)
1. **Hỏi từng câu một** — không bắn nhiều câu cùng lúc.
2. **Luôn có mặc định thông minh** — `default` là đường đi tiếp khi user không biết trả lời.
3. **Dịch ngược** — dùng `translate_back` để tóm câu trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận.
4. **Mỗi câu neo vào 1 ô doc** — `target_doc` phải chỉ tới đúng file taxonomy; câu nào không biết rót vào đâu thì không được tồn tại.

## 4. Cấu trúc nhánh và thứ tự thực thi
- **S0–S6** (`branch: core`) — dùng chung. Web & mobile giống ~70%.
- **W1–W5** (`branch: web`), **M1–M5** (`branch: mobile`) — rẽ sau S6.
- Trong file YAML, `questions` phải giữ thứ tự thực thi chuẩn: toàn bộ `core` trước, rồi `web`, rồi `mobile`.
- Một câu `web` hoặc `mobile` tối thiểu phải phụ thuộc vào `S6` để bảo đảm chỉ rẽ nhánh sau khi chốt bối cảnh.
- `depends_on` chỉ được trỏ tới `id` đã khai báo trước đó; không trỏ vòng, không tự phụ thuộc vào chính nó.
- Nội dung câu hỏi nằm ở `Content/interview-script/*`; schema này chỉ khoá **hình dạng**, không hardcode logic phỏng vấn chi tiết.

Nội dung đầy đủ các câu: [../../Content/interview-script/](../../Content/interview-script/).

## 5. Ví dụ hợp lệ tối thiểu
```yaml
version: 0.1.0
questions:
  - id: S0
    ask: "Mô tả dự án trong 1 câu, như kể cho bạn thân."
    default: null
    target_doc: 00-vision.md
    branch: core
    gate: null
    translate_back: "Tóm thành elevator pitch 1 dòng."
    depends_on: []
  - id: S3
    ask: "Liệt kê việc người dùng làm được (kể lộn xộn)."
    default: "Agent đề xuất bộ MVP tối thiểu."
    target_doc: 02-scope.md
    branch: core
    gate: scope-locked
    translate_back: "Xếp thành Must / Should / Could (MoSCoW)."
    depends_on: [S0, S1, S2]
```

> **S3 là câu khó & quan trọng nhất** — agent là người phân loại Must/Should/Could, người mới không tự ưu tiên được.

## 6. Luật validate

Validator cho Batch 6 và test sau này phải kiểm được tối thiểu các luật dưới đây:

1. `version` là string hợp lệ theo SemVer rút gọn và hiện tại phải bằng `0.1.0`.
2. `questions` là mảng không rỗng; mọi phần tử đều chứa đủ 8 field đã khoá ở mục 2.
3. `id` là duy nhất toàn file; không tái dùng cho nghĩa khác ở version tương thích.
4. `ask` và `translate_back` là string không rỗng sau khi trim.
5. `default` chỉ được là string không rỗng hoặc `null`; `null` được hiểu là câu bắt buộc, không phải "thiếu field".
6. `target_doc` phải khớp một file có thật trong taxonomy tối giản của lõi. Với họ file `07-*`, validator phải coi `07-deployment.md` và `07-release.md` là hai tên file hợp lệ riêng biệt theo nhánh, không parse cây taxonomy như một chuỗi bracket duy nhất.
7. `branch` chỉ nhận `core`, `web`, hoặc `mobile`.
8. `gate` là `null` hoặc trỏ tới một `id` có thật trong `gate-policy`.
9. `depends_on` là mảng `id` có thật, không trùng lặp, không chứa chính `id` hiện tại, và không trỏ tới câu xuất hiện sau nó.
10. Câu `web`/`mobile` không được đứng trước `S6`; file phải giữ thứ tự thực thi chuẩn để state machine đi tuần tự.

## 7. Bất biến tương thích

- Không bao giờ đổi nghĩa một `id` đã phát hành.
- Đổi tên hoặc xoá field là thay đổi phá tương thích → bump MAJOR theo [Versioning.md](../Versioning.md).
- Thêm field mới chỉ được phép nếu là optional hoặc có mặc định rõ ràng để adapter cũ không vỡ âm thầm.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt field, ràng buộc, thứ tự thực thi và luật validate. |
