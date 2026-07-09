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
| `critics` | map\<question-id → critic\> | — (optional) | Nội dung critic phản biện, key = `id` câu mà critic chạy **sau** (điểm fire). Mỗi entry: `challenge` (câu thách thức) + `ack_prompt` (câu bắt xác nhận). Optional. Xem [Contract.md](../Contract.md) §3, [DecisionLog D24](../../DecisionLog.md). |

## 2. Shape của một `question`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `id` | string | ✓ | Định danh vĩnh viễn. Regex khuyến nghị: `^[A-Z][A-Za-z0-9-]*$`. Không tái dùng cho nghĩa khác. |
| `ask` | string | ✓ | Câu hỏi đời thường, đã trim, không rỗng. Không nhét thuật ngữ nội bộ vào đây. |
| `default` | string \| null | ✓ | `null` nghĩa là câu bắt buộc, agent không tự điền. String nghĩa là "mặc định thông minh" khi user nói "không biết". |
| `kind` | `anchored` \| `meta` | — (default `anchored`) | Loại câu. `anchored` = câu neo vào doc (mặc định khi thiếu field → giữ tương thích ngược). `meta` = câu hiệu chỉnh chế độ phỏng vấn (vd độ sâu giải thích), KHÔNG neo doc, KHÔNG sinh anchor. |
| `target_doc` | string \| null | ✓ | Khi `kind=anchored`: tên file đích (vd `02-scope.md`), phải tồn tại trong [../../Content/taxonomy.md](../../Content/taxonomy.md). Khi `kind=meta`: bắt buộc `null`. |
| `branch` | `core` \| `<shape-id>` | ✓ | `core` = câu dùng chung mọi dự án. `<shape-id>` = câu thuộc một hình-hài dự án có thật trong registry [taxonomy.md](../../Content/taxonomy.md) (vd `web`, `mobile`, `hybrid`, `cli`). Không còn enum đóng — xem [DecisionLog D21](../../DecisionLog.md). |
| `gate` | string \| null | ✓ | `id` của gate liên quan trong [gate-policy.md](gate-policy.md), hoặc `null` nếu câu này không nối gate. |
| `translate_back` | string | ✓ | Mẫu/ghi chú dịch ngược để agent tóm trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận. Không được rỗng. |
| `depends_on` | array\<string\> | ✓ | Danh sách `id` phải hoàn tất trước khi câu này được hỏi. Có thể rỗng. |

## 3. Bốn quy tắc vàng (agent PHẢI tuân khi chạy script)
1. **Hỏi từng câu một** — không bắn nhiều câu cùng lúc.
2. **Luôn có mặc định thông minh** — `default` là đường đi tiếp khi user không biết trả lời.
3. **Dịch ngược** — dùng `translate_back` để tóm câu trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận.
4. **Mỗi câu `anchored` neo vào 1 ô doc** — với `kind=anchored`, `target_doc` phải chỉ tới đúng file taxonomy; câu nào không biết rót vào đâu thì không được tồn tại. Ngoại lệ duy nhất: câu `kind=meta` (vd hiệu chỉnh độ sâu giải thích) cố ý KHÔNG neo doc — xem [DecisionLog D23](../../DecisionLog.md).

## 4. Cấu trúc nhánh và thứ tự thực thi (v2)
- **Khung lõi `branch: core`** chạy trước, gồm: (tuỳ chọn) câu `kind=meta` hiệu chỉnh chế độ giải thích → **S0–S6** (vision…constraints) → **S7 câu chọn hình-hài dự án** (set `branch` cho phần còn lại).
- **Câu chọn hình-hài (S7)** là `branch: core`; nó là điểm rẽ nhánh **duy nhất**. Trước v2 việc chọn nhánh nằm lẫn trong S6 — nay tách riêng ([DecisionLog D22](../../DecisionLog.md)).
- **Câu nhánh theo shape** (`branch: <shape-id>`, vd `web`, `mobile`, `hybrid`, `cli`) rẽ **sau S7**; mỗi shape có bộ câu riêng định nghĩa ở `Content/interview-script/*`.
- Trong file YAML, `questions` giữ thứ tự thực thi chuẩn: toàn bộ `core` trước, rồi các nhóm shape theo registry taxonomy.
- Một câu shape tối thiểu phải `depends_on` câu chọn hình-hài (S7) để chỉ rẽ sau khi đã chốt shape.
- `depends_on` chỉ trỏ tới `id` khai báo trước đó; không trỏ vòng, không tự phụ thuộc.
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

1. `version` là string hợp lệ theo SemVer rút gọn, khớp version Lõi hiện hành ([Versioning.md](../Versioning.md)); từ v2 là dòng `2.x`.
2. `questions` là mảng không rỗng; mọi phần tử chứa đủ field bắt buộc ở mục 2 (`kind` được phép thiếu → hiểu là `anchored`).
3. `id` là duy nhất toàn file; không tái dùng cho nghĩa khác ở version tương thích.
4. `ask` và `translate_back` là string không rỗng sau khi trim.
5. `default` chỉ được là string không rỗng hoặc `null`; `null` được hiểu là câu bắt buộc, không phải "thiếu field".
6. Khi `kind=anchored`: `target_doc` phải khớp một file có thật trong taxonomy lõi (theo registry hình-hài; vd `07-distribution.md` cho `cli`, `07-deployment.md`/`07-release.md` cho web/mobile — mỗi tên file là một entry hợp lệ riêng, không parse cây như chuỗi bracket). Khi `kind=meta`: `target_doc` phải là `null`.
7. `branch` là `core` hoặc một `<shape-id>` có khai báo trong registry hình-hài của [taxonomy.md](../../Content/taxonomy.md). Validator KHÔNG hardcode danh sách shape — đọc từ registry.
8. `gate` là `null` hoặc trỏ tới một `id` có thật trong `gate-policy`.
9. `depends_on` là mảng `id` có thật, không trùng lặp, không chứa chính `id` hiện tại, và không trỏ tới câu xuất hiện sau nó.
10. Câu thuộc shape không được đứng trước câu chọn hình-hài (S7); file giữ thứ tự thực thi chuẩn (core trước, shape sau) để state machine đi tuần tự.
11. Câu `kind=meta` không có `gate` ràng buộc artifact và không xuất hiện trong `emitted_docs` (không sinh doc).
12. `critics` (nếu có) là map; mọi key phải là `id` câu có thật; mỗi entry có `challenge` và `ack_prompt` không rỗng.

## 7. Bất biến tương thích

- Không bao giờ đổi nghĩa một `id` đã phát hành.
- Đổi tên hoặc xoá field là thay đổi phá tương thích → bump MAJOR theo [Versioning.md](../Versioning.md).
- Thêm field mới chỉ được phép nếu optional hoặc có default rõ ràng (vd `kind` default `anchored`) để adapter cũ không vỡ âm thầm.
- Mở `branch` khỏi enum đóng + thêm hình-hài mới (đổi cây taxonomy) là thay đổi **MAJOR** — v2.0.0 ([DecisionLog D21](../../DecisionLog.md)); phải cập nhật [ConformanceMatrix](../../Adapters/ConformanceMatrix.md) cùng commit.
- Danh sách hình-hài hợp lệ là **single source** ở registry trong [taxonomy.md](../../Content/taxonomy.md); schema/loader tham chiếu, không tự chế.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt field, ràng buộc, thứ tự thực thi và luật validate. |
| 2.0.0 | 2026-07-09 | Mở `branch` thành hình-hài dự án (registry ở taxonomy); thêm field `kind: anchored\|meta` (`target_doc` null khi meta); tách câu chọn hình-hài (S7) khỏi S6; câu nhánh `depends_on` S7; thêm top-level `critics:` map theo điểm fire. MAJOR: D21–D24. |
