# Contract — W11B Đồng bộ golden + rubric + DecisionLog/Versioning + smoke pass

> **Tầng:** Nội dung. Nguồn: [Week-11](../../../../RoadMap/Month3/Week-11.md) + golden [web](../../../../Content/golden-example-web/)/[mobile](../../../../Content/golden-example-mobile/) + [QualityRubric](../../../../Content/QualityRubric.md) + [DecisionLog](../../../../DecisionLog.md) + [Versioning](../../../../Core/Versioning.md). Phụ thuộc: [W11A](w11a_content_iteration_s3_defaults_contract.md) `DONE`.

## 1. Micro-task target
Đồng bộ **golden web + mobile** với `Content/` đã mài ở W11A (không để golden drift), chấm lại **rubric**, ghi **quyết định** vào DecisionLog và **bump Versioning** nếu có đổi hợp đồng, rồi chạy **một smoke pass ngắn** trên ít nhất một dự án đã đo (W9/W10) để xác nhận ma sát thật giảm — không chỉ "trông hay hơn".

## 2. Scope
**In scope**
- Cập nhật `golden-example-web/docs/*` + `golden-example-mobile/docs/*` khớp `Content/` mới (đóng các golden test W11A để đỏ).
- Chấm lại 2 `_quality-score.md` theo [QualityRubric](../../../../Content/QualityRubric.md), ghi lý do điểm.
- Ghi quyết định sửa nội dung vào [DecisionLog.md](../../../../DecisionLog.md); **bump** [Versioning.md](../../../../Core/Versioning.md) chỉ khi W11A buộc đổi schema/hợp đồng (PATCH cho nội dung, MINOR/MAJOR theo policy nếu đổi taxonomy/schema).
- Smoke pass: chạy lại nhanh ≥1 dự án đã đo, ghi `smoke-after-w11.md` so ma sát trước/sau (định tính + nếu được, số).

**Out of scope**
- KHÔNG sửa thêm `Content/` nguồn (đó là W11A — tránh hai contract cùng sửa một tầng). Thấy cần sửa nguồn → quay lại mở rộng W11A.
- KHÔNG mở rộng taxonomy (W12). KHÔNG đụng code lõi/adapter.

## 3. Checklist
- [x] golden web + mobile khớp `Content/` mới, không drift cấu trúc; mọi golden test xanh trở lại.
- [x] 2 `_quality-score.md` cập nhật, pass có lý do ghi rõ.
- [x] DecisionLog có entry cho vòng sửa nội dung W11 (D16); Versioning bump PATCH → 1.0.1.
- [x] `smoke-after-w11.md` cho thấy ma sát thật giảm trên ≥1 dự án đã đo, không chỉ "đẹp hơn".

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/golden-example-web/docs/*`, `Design/Content/golden-example-mobile/docs/*`
- `[MODIFY]` 2 file `_quality-score.md`
- `[MODIFY]` `Design/DecisionLog.md`, (có điều kiện) `Design/Core/Versioning.md`
- `[NEW]` `Design/RoadMap/Month3/dogfood/smoke-after-w11.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Golden drift khỏi `Content/` sau sửa | Cao | Đồng bộ golden ngay trong contract này; golden regression test phải xanh mới đóng. |
| Bump version sai cấp | TB | Theo [Versioning.md](../../../../Core/Versioning.md): wording=PATCH, đổi taxonomy/schema=MINOR/MAJOR; ghi lý do vào DecisionLog. |
| "Smoke pass" chỉ là cảm giác | TB | Bắt buộc so trước/sau trên dự án đã có số ở W10, ghi điểm ma sát cụ thể. |

## 6. Verification plan
- `npx vitest run` (đặc biệt `emit`, golden regression web+mobile, `contentIntegrity`) — **toàn bộ xanh** (đóng các đỏ tạm của W11A).
- `npm run typecheck && npm run lint && npm test` — xanh sạch.
- Review thủ công 2 golden theo QualityRubric; đọc `smoke-after-w11.md` thấy ma sát giảm có dẫn chứng.

## 7. Status
`DONE`
