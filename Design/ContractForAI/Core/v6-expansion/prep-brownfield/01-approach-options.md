# Brownfield Prep 01 — Các hướng tiếp cận và khuyến nghị

> Trạng thái: tài liệu chuẩn bị. Mục đích: khi lane brownfield mở, người viết ExpansionPlan không phải bắt đầu từ giấy trắng — trade-off đã được cân ở đây; quyết định cuối vẫn thuộc chủ repo.

## Ba hướng đã cân nhắc

### Hướng A — Reverse-interview thuần (agent đọc code tự do, điền answers, người xác nhận)

Agent của harness tự đọc repo theo cách nó muốn, tự điền bộ answers tầng 1 + DS*, rồi đưa người dùng xác nhận từng câu qua đúng luồng translate-back hiện có.

- **Mạnh:** gần như không cần code lõi mới — tái dùng script + render (a) nguyên vẹn; ship nhanh nhất.
- **Yếu:** chất lượng phụ thuộc hoàn toàn kỷ luật đọc của agent (chính là thứ sản phẩm này vốn không tin); không có bằng chứng máy-kiểm-được là answers bám code; hai lần chạy ra hai kết quả khác nhau; vi phạm tinh thần "engine tự quan sát".

### Hướng B — Static-analysis-first (engine parse code thành model, doc sinh từ model)

Lõi xây bộ phân tích: parse manifest/entrypoint/schema/route thành `CodeInventory` có schema, doc sinh thẳng từ inventory, người chỉ duyệt cuối.

- **Mạnh:** deterministic, evidence máy-kiểm-được, đúng DNA fail-closed.
- **Yếu:** chi phí xây parser đa stack rất lớn (mỗi framework một kiểu route/model); dễ chết vì bảo trì — đúng rủi ro "chết vì nuôi N nền tảng" mà kiến trúc adapter gầy sinh ra để tránh; và vẫn không trả lời được "vì sao" (điểm 2 của [00-problem-statement](00-problem-statement.md)).

### Hướng C — Hybrid ba pha có kỷ luật (khuyến nghị)

```text
Pha 1 INVENTORY (máy, deterministic):
  engine quét lớp vỏ kiểm được bằng luật đơn giản: manifest (package.json,
  requirements...), cây thư mục, entrypoint, script chạy, dependency chính
  → `code-inventory.json` (schema mới, có evidence path cho từng mục).

Pha 2 DRAFT (agent, bị trói vào inventory):
  agent điền draft answers NHƯNG mỗi answer bắt buộc cite mục inventory
  hoặc file:line; engine validate cite tồn tại (fail-closed: answer không
  cite = không nhận). "Vì sao"-type câu hỏi để trống chờ pha 3.

Pha 3 CONFIRM (người, qua luồng phỏng vấn sẵn có):
  người xác nhận/sửa từng draft qua translate-back; câu "vì sao" (ADR,
  trade-off) hỏi trực tiếp người — không suy từ code.

Sau đó: render (a) tái dùng nguyên vẹn; anchor gieo status=live + rev thật.
```

- **Mạnh:** pha máy chỉ làm phần rẻ và bền (manifest — vốn đã có sẵn `inspectProjectProfile` làm mầm); pha agent bị evidence trói đúng triết lý V3; pha người giữ chỗ "vì sao" trung thực. Phân bổ đúng việc cho đúng actor.
- **Yếu:** ba pha = UX dài hơn; cần thiết kế nhịp để người không bỏ cuộc giữa chừng (học từ pilot B18a).

## Bảng so sánh

| Tiêu chí | A | B | C |
|---|---|---|---|
| Chi phí xây | Thấp | Rất cao | Trung bình |
| Tin được bằng chứng | Không | Có | Có (cite-validated) |
| Trung thực về "vì sao" | Rủi ro bịa | Trống | Hỏi người, đúng chỗ |
| Đúng kiến trúc lõi béo/adapter gầy | Trung lập | Rủi ro phình lõi theo stack | Giữ được (inventory chỉ lớp vỏ) |
| Tái dùng phần (a) | Nguyên vẹn | Một phần | Nguyên vẹn |

## Khuyến nghị

**Chọn hướng C.** Nguyên tắc chốt: *inventory rẻ và deterministic; agent chỉ được nói điều cite được; "vì sao" luôn thuộc về người.* Khi viết ExpansionPlan brownfield, tách tối thiểu thành: schema `code-inventory` + quét manifest (mở rộng `inspectProjectProfile`); validator cite; kịch bản confirm; e2e trên DesignEverything (ca dễ nhất, tự có golden).

## Việc phải làm TRƯỚC khi viết plan brownfield

1. Kiểm kê ReportSupport + Univillage theo [02-golden-corpus-protocol](02-golden-corpus-protocol.md) — quyết định hướng nào cũng vô nghĩa nếu chưa nhìn hai repo thật.
2. Lấy số từ pilot B18a: người thật chịu được bao nhiêu câu xác nhận một phiên (quyết định nhịp pha 3).
3. Chốt phạm vi stack đợt đầu (đề xuất: chỉ Node/TS + Python — đúng các recipe đã có).
