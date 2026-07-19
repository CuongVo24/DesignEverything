# Brownfield Prep 00 — Bài toán: sinh bộ thiết kế chi tiết cho dự án ĐÃ có code

> Trạng thái: tài liệu chuẩn bị (không phải contract). Lane brownfield chỉ mở khi đủ điều kiện ở [03-risks-open-questions](03-risks-open-questions.md). Đọc sau [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md).

## Tại sao cần file này

Phần (a) của V6 sinh bộ thiết kế chi tiết cho dự án **greenfield** — nơi mọi câu trả lời đến từ phỏng vấn người dùng. Nhưng nhu cầu thật tiếp theo (từ chính chủ dự án) là các dự án **đã có code**: ReportSupport, Univillage, và cả DesignEverything — sinh cho chúng bộ tài liệu cỡ cây `Design/` mà chúng đáng có. File này định nghĩa bài toán cho rõ trước khi ai đó viết một dòng code, đúng kỷ luật "tài liệu trước code" của chính sản phẩm.

## Phát biểu bài toán

> Cho một repo đã có code (và có thể có ít/không tài liệu), sinh bộ `docs/` tầng 1 + `docs/design/` tầng 2 **đúng với code đang chạy**, trong đó mọi khẳng định truy được nguồn (code, git history, hoặc câu xác nhận của người thật), và mọi chỗ không truy được nguồn bị gắn cờ thay vì bịa.

## Vì sao brownfield KHÁC hẳn greenfield (5 điểm)

1. **Nguồn sự thật đảo chiều.** Greenfield: người nói → doc → code. Brownfield: code là sự thật đã đông cứng; phỏng vấn chuyển vai từ *khai thác ý định* sang *xác nhận suy luận* — agent đề xuất "tôi đọc code thấy X, đúng không?", người thật xác nhận/sửa.
2. **"Vì sao" không nằm trong code.** Code cho biết *cái gì*, không cho biết *vì sao chọn nó thay vì cái khác*. ADR/decisions không thể mine tự động — phần đó hoặc hỏi người, hoặc gắn cờ `unknown`. Đây là ranh giới đạo đức của sản phẩm: **không bịa lý do** (nối dài "thà gắn cờ nghi ngờ, không âm thầm bảo chứng").
3. **Scope là khảo cổ, không phải lựa chọn.** Must/Should/Won't của greenfield là quyết định tương lai; brownfield phải phân biệt "đang có", "đang có nhưng chết", "đang thiếu so với ý định" — cần inventory code trước khi hỏi bất kỳ câu nào.
4. **Anchor sống ngay từ ngày đầu.** Greenfield gieo anchor `status=planned`; brownfield gieo `status=live` với `src`/`rev` thật ngay khi emit — tức là bước vào thẳng địa hạt maintain/drift (FirstIdea §12), sớm hơn roadmap cũ dự kiến.
5. **Quy mô đọc vượt context.** Repo thật không nhét vừa một context window; cần chiến lược đọc có chọn lọc (manifest, entrypoint, schema, route/command surface) thay vì "đọc hết rồi tóm tắt".

## Quan hệ với phần (a) — chốt kiến trúc quan trọng nhất

Phần (a) xây **tầng render + template + rubric + eval** (B19a, B20b, B21b). Brownfield **không xây lại tầng đó**: nó chỉ thay *nguồn answers* — từ "người trả lời phỏng vấn" thành "suy luận từ code + người xác nhận". Nói bằng sơ đồ:

```text
Greenfield:  interview ──► answers ──► render (a) ──► docs/ + docs/design/
Brownfield:  INGEST code ─► draft answers ─► người xác nhận ─► render (a) ──► docs/ + docs/design/
                    (mới)        (mới)            (mới)          (tái dùng nguyên vẹn)
```

Hệ quả: chất lượng phần (a) là trần chất lượng phần (b). Đó là lý do lane brownfield bị khoá sau khi (a) ship và eval B21b đạt.

## Ba dự án đích đầu tiên (golden corpus — D51 đề xuất)

| Dự án | Vai trò | Cái đã có sẵn |
|---|---|---|
| DesignEverything | Ca dễ nhất: repo mở tại chỗ, docset tay đầy đủ | Cây `Design/` + FirstIdea + DecisionLog |
| ReportSupport | Ca thật thứ nhất, cùng hệ Node/TS (D10) | Docset tay theo cùng phương pháp (mức độ cần kiểm kê) |
| Univillage | Ca thật thứ hai, kiểm tra khác quy mô/stack | Docset tay theo cùng phương pháp (mức độ cần kiểm kê) |

Việc đầu tiên khi mở lane: **kiểm kê** hai repo ngoài (đường dẫn, stack, trạng thái docset tay) — xem [02-golden-corpus-protocol](02-golden-corpus-protocol.md).

## Ngoài phạm vi của cả lane brownfield tương lai

- Migrate/viết lại tài liệu legacy có sẵn của dự án đích (chỉ *đối chiếu*, không nuốt).
- Enterprise governance, monorepo đa sản phẩm (ghi ở open questions).
- Tự sửa code cho khớp doc — chiều đó là sản phẩm maintain (FirstIdea §12), không phải lane này.
