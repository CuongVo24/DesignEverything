# Contract — W12B Thực thi quyết định taxonomy: mở rộng đồng bộ HOẶC ghi hoãn

> **Tầng:** Nội dung/Adapter. Nguồn: [Week-12](../../../../RoadMap/Month3/Week-12.md) + quyết định [W12A](w12a_taxonomy_decision_assessment_contract.md) + [taxonomy](../../../../Content/taxonomy.md) + [doc-templates](../../../../Content/doc-templates/) + [Versioning](../../../../Core/Versioning.md) + [DecisionLog](../../../../DecisionLog.md). Phụ thuộc: [W12A](w12a_taxonomy_decision_assessment_contract.md) `DONE`. ⚠️ optional ngoài MVP.

## 1. Micro-task target
Thực thi **đúng một nhánh** quyết định ở W12A. Nếu mở rộng: thêm template mới + map câu hỏi/anchor + cập nhật taxonomy + golden liên quan + bump Versioning MAJOR, **đồng bộ tất cả nơi liên quan**. Nếu hoãn: ghi "hoãn" + điều kiện kích hoạt lại vào DecisionLog. Kết thúc Month 3 với taxonomy có kỷ luật hoặc một quyết định hoãn rõ ràng — không thêm file chỉ vì thói quen enterprise.

## 2. Scope
**In scope — NHÁNH A (mở rộng), chỉ làm nếu W12A chọn mở:**
- Thiết kế template mới (vd ADR/test-plan/ContractForAI) trong [doc-templates/](../../../../Content/doc-templates/) + map câu hỏi tới placeholder + anchor `status=planned`.
- Cập nhật [taxonomy.md](../../../../Content/taxonomy.md) (đánh dấu đổi **MAJOR**) + đồng bộ golden web/mobile + soát adapter/validator.
- Bump [Versioning.md](../../../../Core/Versioning.md) MAJOR + ghi [DecisionLog.md](../../../../DecisionLog.md).

**In scope — NHÁNH B (hoãn), chỉ làm nếu W12A chọn giữ tối giản:**
- Ghi "hoãn mở rộng taxonomy" + lý do + **điều kiện kích hoạt lại** cụ thể vào [DecisionLog.md](../../../../DecisionLog.md), trỏ về `taxonomy-decision.md`.

**Out of scope**
- KHÔNG làm cả hai nhánh. KHÔNG mở rộng vượt phạm vi W12A đã chốt ("buộc mở" mới làm, "chưa cần" để lại).
- KHÔNG sửa logic script S0–S6 lõi (đó là W11). KHÔNG đụng schema engine trừ khi taxonomy MAJOR buộc (ghi rõ ở DecisionLog).

## 3. Checklist
- [x] Chỉ một nhánh (A hoặc B) được thực thi, đúng quyết định W12A.
- [ ] **Nhánh A:** template mới + taxonomy + golden + adapter/validator + Versioning MAJOR **đồng bộ**, không nơi nào lệch.
- [x] **Nhánh B:** DecisionLog ghi hoãn + điều kiện kích hoạt lại đủ cụ thể để Month 4 không tranh lại mơ hồ.
- [x] Không thêm file chỉ vì "giống công ty"; mọi file thêm thắng được chi phí nhận thức người mới.

## 4. Interfaces / Files expected to change
**Nhánh A:**
- `[NEW]` `Design/Content/doc-templates/<new-template>.md`
- `[MODIFY]` `Design/Content/taxonomy.md`, golden web+mobile, `_quality-score.md`
- `[MODIFY]` adapter/validator nếu taxonomy đổi (vd map trong [emit.ts](../../../../../src/core/emit.ts) / [contentIntegrity.test.ts](../../../../../src/core/contentIntegrity.test.ts))
- `[MODIFY]` `Design/Core/Versioning.md`, `Design/DecisionLog.md`

**Nhánh B:**
- `[MODIFY]` `Design/DecisionLog.md` (entry hoãn + điều kiện kích hoạt lại)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Mở rộng nhưng quên đồng bộ 1 nơi (golden/adapter/version) | Cao | Checklist "đồng bộ tất cả"; `contentIntegrity` + golden regression phải xanh mới đóng. |
| Phình "giống công ty" vượt W12A | Cao | Chỉ làm phần "buộc mở" đã chốt; phần "chưa cần" cấm tự thêm. |
| Hoãn nhưng lý do mờ → Month 4 tranh lại | TB | Bắt buộc điều kiện kích hoạt lại cụ thể, đo được. |

## 6. Verification plan
- **Nhánh A:** `npx vitest run` (emit, golden regression web+mobile, `contentIntegrity`) + `npm run typecheck && npm run lint && npm test` — **toàn bộ xanh**; template mới render đúng, anchor `status=planned`, taxonomy nhất quán.
- **Nhánh B:** `npm test` xanh (không đổi gì ngoài DecisionLog); review thủ công entry hoãn có điều kiện kích hoạt lại.
- Cả hai: Month 3 đóng với một quyết định taxonomy không treo.

## 7. Status
`DONE`
