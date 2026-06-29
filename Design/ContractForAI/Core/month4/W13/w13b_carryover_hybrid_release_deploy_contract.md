# Contract — W13B (carry-over F-07) Nhánh `hybrid` emit cả `07-deployment.md` và `07-release.md`

> **Tầng:** Lõi/Nội dung. Nguồn: [pain-rank F-07](../../../../RoadMap/Month3/dogfood/pain-rank.md) (điểm 2, proj-03) + [backlog-month3 F-07](../../../../RoadMap/Month3/backlog-month3.md) + [taxonomy-decision §5](../../../../RoadMap/Month3/taxonomy-decision.md) (đề xuất chưa thực thi) + [emit.ts](../../../../../src/core/emit.ts) + [taxonomy](../../../../Content/taxonomy.md) + [Versioning](../../../../Core/Versioning.md). Phụ thuộc: [W13A](w13a_carryover_anchor_prefix_flex_contract.md) `DONE` (tránh xung đột `emit.ts`).

## 1. Micro-task target
Thêm nhánh thứ ba `hybrid` cho `emitTree`: dự án web+mobile emit **cả hai** file `07-deployment.md` và `07-release.md` (thay vì ép chọn một). Thực thi đúng đề xuất [taxonomy-decision §5](../../../../RoadMap/Month3/taxonomy-decision.md) — đóng lệch "văn bản hứa vá nhưng W12B không làm". Giữ kỷ luật: chỉ thêm **một** giá trị nhánh opt-in, **không** mở taxonomy enterprise (ADR/Test-Plan) đã hoãn ở [D17](../../../../DecisionLog.md).

## 2. Scope
**In scope:**
- `emitTree` nhận `branch: 'web' | 'mobile' | 'hybrid'`. Với `hybrid`: danh sách file gồm **cả** `07-deployment.md` lẫn `07-release.md`; populate cả slot web (W1–W5) lẫn mobile (M1–M5); `docs_readme_file_map` liệt kê cả hai file `07-*`.
- Cập nhật [taxonomy.md](../../../../Content/taxonomy.md): ghi rõ `hybrid` là nhánh hợp lệ emit cả hai `07-*`; nhánh web/mobile vẫn emit đúng một.
- Versioning **MINOR** (additive: web/mobile không đổi cây → không phá tương thích ngược); DecisionLog **D19**.
- Unit test `hybrid`: khẳng định output chứa cả hai `07-*` với slot đúng.

**Out of scope**
- KHÔNG đổi cây của nhánh web/mobile hiện có (giữ một file `07-*` mỗi nhánh).
- KHÔNG thêm template/golden Hybrid đầy đủ (golden hybrid là việc *build* tách riêng, không phải lỗ hổng — ghi vào backlog Month 4 nếu cần, đừng làm ở đây).
- KHÔNG mở rộng taxonomy enterprise (vẫn theo D17).
- KHÔNG đụng `srcPrefix` (W13A đã sở hữu).

## 3. Checklist
- [x] `branch` chấp nhận thêm `'hybrid'`; web/mobile hành vi y nguyên.
- [x] `hybrid` emit cả `07-deployment.md` + `07-release.md`, không trùng/thiếu slot.
- [x] `docs_readme_file_map` của `hybrid` liệt kê cả hai file `07-*`.
- [x] [taxonomy.md](../../../../Content/taxonomy.md) ghi `hybrid` + làm rõ ghi chú "mỗi phiên emit một `07-*`" áp dụng cho web/mobile, hybrid là ngoại lệ opt-in.
- [x] Versioning MINOR + changelog; D19 ghi lý do + **đánh dấu giải quyết lệch taxonomy-decision §5**.
- [x] Test hybrid xanh; golden web/mobile vẫn xanh (không đổi).

## 4. Interfaces / Files expected to change
- `[MODIFY]` `src/core/emit.ts` (~+20 dòng): mở rộng type `branch`; nhánh `hybrid` cho danh sách `files` (chèn cả hai `07-*`) + gộp populate slot web & mobile + `docs_readme_file_map` biến thể hybrid. Cẩn thận thứ tự file: `...06-constraints.md, 07-deployment.md, 07-release.md, README.md`.
- `[MODIFY]` `src/core/emit.test.ts` (~+25 dòng): ca `hybrid` khẳng định 2 file `07-*` + 1 slot web + 1 slot mobile có nội dung.
- `[MODIFY]` `Design/Content/taxonomy.md`: ghi chú nhánh hybrid.
- `[MODIFY]` `Design/Core/Versioning.md` (MINOR + changelog), `Design/DecisionLog.md` (D19).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Hybrid coi như "mở taxonomy" → phình về enterprise | TB | Chỉ thêm 1 giá trị nhánh opt-in; D17 (hoãn enterprise) vẫn Active; ghi rõ ranh giới ở D19. |
| Đổi type `branch` làm đỏ chỗ khác (schema/skill) | Cao | `grep "'web' | 'mobile'"` toàn repo; chỗ nào ép union 2 giá trị thì mở rộng nhất quán; `npm run typecheck`. |
| Quên slot khiến hybrid render rỗng nửa file | TB | Test khẳng định cả slot web (vd `hosting_strategy`) lẫn mobile (vd `store_readiness_notes`) có nội dung. |
| Bump nhầm MAJOR | Thấp | web/mobile bất biến → không phá tương thích → MINOR; lý do ở D19. |

## 6. Verification plan
- `npx vitest run emit` — ca hybrid + web + mobile đều xanh.
- `npx vitest run` (gồm golden web+mobile, `contentIntegrity`) — **toàn bộ xanh**.
- `npm run typecheck && npm run lint` — type `branch` mới nhất quán toàn repo.
- Review thủ công: [taxonomy.md](../../../../Content/taxonomy.md) + D19 đọc xong không còn thấy lệch với [taxonomy-decision §5](../../../../RoadMap/Month3/taxonomy-decision.md).

## 7. Status
`DONE`
