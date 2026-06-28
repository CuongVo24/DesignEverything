# Contract — W12A Đánh giá nhu cầu + ra quyết định taxonomy có căn cứ

> **Tầng:** Nội dung/Adapter (quyết định, chưa thực thi). Nguồn: [Week-12](../../../../RoadMap/Month3/Week-12.md) + [taxonomy](../../../../Content/taxonomy.md) + phản hồi tích luỹ [backlog-month3](../../../../RoadMap/Month3/backlog-month3.md) + [pain-rank](../../../../RoadMap/Month3/dogfood/pain-rank.md) + [Versioning](../../../../Core/Versioning.md). Phụ thuộc: [W11B](../W11/w11b_golden_sync_decisionlog_smoke_contract.md) `DONE`. ⚠️ optional ngoài MVP.

## 1. Micro-task target
Dựa trên dữ liệu thật của W9–W11, **ra một quyết định taxonomy có căn cứ**: giữ nguyên bản tối giản, mở rộng một phần, hay mở rộng đủ sang bản "giống công ty" (ADR / test plan / ContractForAI). Đây là contract **quyết định** — viết rõ căn cứ + tác động, để [W12B](w12b_taxonomy_expansion_or_defer_contract.md) chỉ việc thực thi đúng một nhánh.

## 2. Scope
**In scope**
- Đánh giá: dự án thật có **buộc** cần ADR / test-plan / ContractForAI template không, dựa trên tần suất vấp giống nhau qua nhiều dự án (đọc `pain-rank` + `backlog-month3`).
- Tách rõ "phải mở vì dữ liệu thật chỉ ra" vs "nghe hợp lý nhưng chưa cần".
- Soát sơ bộ tác động nếu mở rộng: adapter, validator, golden, Versioning (MAJOR theo policy).
- Viết `taxonomy-decision.md`: kết luận 1 trong 3 nhánh + bằng chứng + điều kiện kích hoạt lại (nếu hoãn).

**Out of scope**
- KHÔNG sửa [taxonomy.md](../../../../Content/taxonomy.md), KHÔNG thêm template, KHÔNG đụng golden/adapter ở đây — mọi thực thi để [W12B](w12b_taxonomy_expansion_or_defer_contract.md).
- KHÔNG quyết theo "trông giống công ty hơn"; mọi mở rộng phải thắng được chi phí nhận thức cho người mới.

## 3. Checklist
- [x] Quyết định rõ ràng: giữ tối giản / mở một phần / mở đủ — không treo lơ lửng.
- [x] Mỗi đề xuất mở rộng có bằng chứng tần suất (≥N dự án vấp cùng chỗ), không chỉ trực giác.
- [x] Tách rõ "buộc mở" vs "chưa cần"; ghi điều kiện kích hoạt lại nếu hoãn.
- [x] Có sơ bộ tác động lên adapter/validator/golden/versioning nếu chọn mở rộng.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/taxonomy-decision.md` (~60–120 dòng)
- Không sửa `Content/`/golden/code (để W12B thực thi).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Tự thuyết phục "thêm file nào cũng tốt" | Cao | Mỗi mở rộng phải có bằng chứng tần suất + thắng chi phí nhận thức người mới. |
| Quyết định treo → Month 4 tranh lại từ đầu | TB | Bắt buộc kết luận 1/3 nhánh + (nếu hoãn) điều kiện kích hoạt lại cụ thể. |
| Bỏ sót tác động lan toả của taxonomy | TB | Soát sơ bộ adapter/validator/golden/versioning ngay ở bước quyết định. |

## 6. Verification plan
- `npm test` — xanh (chưa thực thi gì lên `Content/`/code).
- Review thủ công: `taxonomy-decision.md` có kết luận dứt khoát + bằng chứng truy ngược về `pain-rank`/backlog.
- Quyết định đủ rõ để W12B chọn đúng một nhánh thực thi mà không phải đoán.

## 7. Status
`DONE`
