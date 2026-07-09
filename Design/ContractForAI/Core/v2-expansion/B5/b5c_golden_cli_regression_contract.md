# Contract — B5c Golden `cli` mới + giữ web/mobile xanh + regen 06-constraints có kiểm soát

> **Tầng:** Lõi. Nguồn: [V2-ExpansionPlan B5](../../../../RoadMap/V2-ExpansionPlan.md) + golden mẫu [golden-example-mobile](../../../../Content/golden-example-mobile/) + regression tests `test/regression/*`. Phụ thuộc: [B5b](b5b_emit_shape_map_meta_contract.md) `DONE`.

## 1. Micro-task target
Khoá chất lượng đa-shape bằng golden: (a) dựng **golden `cli` mới** (transcript + docs + quality-score) làm fixture regression; (b) xác nhận golden **web/mobile vẫn xanh**; (c) chỉ regen `06-constraints.md` của web/mobile **nếu** B4a trim S6 làm đổi output — regen có kiểm soát, ghi rõ diff.

## 2. Scope
**In scope:**
- `[NEW]` `Design/Content/golden-example-cli/` : `_interview-transcript.md`, `docs/00..06 + 07-distribution.md + README.md` (emit từ answers cli mẫu), `_quality-score.md`.
- `[NEW]` `test/regression/golden-cli.test.ts` — emitTree(answers, 'cli') khớp golden cli.
- Chạy web/mobile/hybrid golden; nếu đỏ **chỉ** ở `06-constraints.md` do S6 trim → regen đúng 2 file đó + ghi diff vào PR/commit; nếu đỏ ở chỗ khác → DỪNG, báo (không tự sửa golden để "cho xanh").

**Out of scope**
- KHÔNG thêm shape golden khác (extension/library).
- KHÔNG đổi emit logic (B5b) để ép golden xanh.
- KHÔNG wiring skill (B6a).

## 3. Checklist
- [x] Golden cli đầy đủ: transcript + cây docs (có `07-distribution.md`) + quality-score.
- [x] `golden-cli.test.ts` xanh.
- [x] web/mobile/hybrid golden xanh (hoặc chỉ regen `06-constraints` có ghi diff, không đổi chỗ khác).
- [x] Không có golden nào bị "sửa cho xanh" ngoài phạm vi S6-trim.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/Content/golden-example-cli/**`
- `[NEW]` `test/regression/golden-cli.test.ts`
- `[MODIFY]` (chỉ nếu S6 trim) `Design/Content/golden-example-web/docs/06-constraints.md`, `golden-example-mobile/docs/06-constraints.md` + note diff

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Dùng golden để che lỗi emit | Cao | Golden cli phải sinh **từ emitTree**, không viết tay; web/mobile chỉ regen phần S6-trim đã biết. |
| Regen lan sang file khác | Cao | So diff từng file; ngoài `06-constraints` mà đỏ → DỪNG báo manager. |
| Golden cli chất lượng kém → fixture yếu | TB | Chấm `_quality-score.md` theo [QualityRubric](../../../../Content/QualityRubric.md). |

## 6. Verification plan
- `npx vitest run` (gồm `golden-cli`, `golden-web`, `golden-mobile`, `emit`, `contentIntegrity`) — **toàn bộ xanh**.
- `npm run typecheck && npm run lint && npm run build` — sạch.
- Diff web/mobile golden (nếu có) chỉ ở `06-constraints.md`, giải thích được bằng S6-trim.

## 7. Status
`DONE`
