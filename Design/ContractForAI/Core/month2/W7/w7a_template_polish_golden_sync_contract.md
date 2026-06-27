# Contract — W7A Chau chuốt doc-templates + đồng bộ golden + rubric

> **Tầng:** Nội dung. Nguồn: [Week-07](../../../../RoadMap/Month2/Week-07.md) + [doc-templates](../../../../Content/doc-templates/) + [QualityRubric](../../../../Content/QualityRubric.md) + golden [web](../../../../Content/golden-example-web/)/[mobile](../../../../Content/golden-example-mobile/) + [taxonomy](../../../../Content/taxonomy.md).

## 1. Micro-task target
Rà và chau chuốt toàn bộ `doc-templates` để output v1 **pass QualityRubric có chủ ý**: phần "Tại sao cần file này" đủ rõ cho người mới, heading gọn, branch note nhất quán, và template **parity** với cả hai golden (không drift). Đây là tuần nội dung — không thêm tính năng/code.

## 2. Scope
**In scope** — `Design/Content/doc-templates/*` + 2 golden:
- Rà từng template: heading, placeholder `{{...}}`, anchor `status=planned`, mục "## Tại sao cần file này".
- Chau chuốt giọng văn người-mới-đọc-hiểu, cắt thừa chữ; giữ độ dài heading ngắn.
- Đồng bộ `golden-example-web/` và `golden-example-mobile/` khớp template mới nhất (không để golden lệch template).
- Cập nhật bảng điểm rubric cho cả hai golden ([_quality-score.md](../../../../Content/golden-example-web/_quality-score.md) tương ứng).

**Out of scope**
- KHÔNG thêm file mới ngoài taxonomy chỉ để "trông đầy đủ" (nghiệm thu Week-07).
- KHÔNG đổi `{{placeholder}}` keys mà [emit.ts](../../../../../src/core/emit.ts) đang map (đổi key sẽ vỡ emit — nếu cần đổi → DỪNG, mở contract code riêng).
- KHÔNG đụng schema/script logic/adapter.

## 3. Checklist
- [ ] Mọi template có "## Tại sao cần file này" rõ cho người mới.
- [ ] Heading gọn, nhất quán; branch note web/mobile nhất quán.
- [ ] Placeholder keys **không đổi** (parity với emit.ts mapping).
- [ ] golden web + mobile khớp template mới, không drift cấu trúc.
- [ ] Bảng điểm rubric cập nhật, pass có lý do ghi rõ.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/doc-templates/*.md`
- `[MODIFY]` `Design/Content/golden-example-web/docs/*`, `golden-example-mobile/docs/*`
- `[MODIFY]` 2 file `_quality-score.md`
- Không đổi code.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Đổi placeholder key làm vỡ emit | Cao | Khóa danh sách key từ emit.ts; chỉ sửa văn xung quanh placeholder. |
| Sửa "hay" quá mức → template dài/nặng | TB | Ưu tiên dễ đọc + nhất quán; cắt thừa, không văn vẻ. |
| Golden drift khỏi template sau khi sửa | TB | Đồng bộ golden ngay trong cùng contract; assert ở W8 regression. |

## 6. Verification plan
- `npx vitest run emit` — emit vẫn ra đúng nội dung (placeholder không vỡ).
- `npx vitest run test/e2e` — web + mobile e2e vẫn xanh với template mới.
- Review thủ công 2 golden theo QualityRubric, ghi điểm.

## 7. Status
`WAITING_FOR_APPROVAL`
