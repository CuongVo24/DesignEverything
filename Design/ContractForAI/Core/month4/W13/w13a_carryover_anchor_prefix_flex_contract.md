# Contract — W13A (carry-over F-04) Cấu hình tiền tố anchor, bỏ ép cứng `apps/mobile/src/`

> **Tầng:** Lõi. Nguồn: [pain-rank F-04](../../../../RoadMap/Month3/dogfood/pain-rank.md) (điểm 4, 2/2 mobile) + [backlog-month3 F-04](../../../../RoadMap/Month3/backlog-month3.md) + [emit.ts](../../../../../src/core/emit.ts) + [AnchorFormat](../../../../Core/AnchorFormat.md) + [Versioning](../../../../Core/Versioning.md). Phụ thuộc: không (carry-over, làm đầu Month 4).

## 1. Micro-task target
Cho `emitTree` nhận **tiền tố `src` cấu hình được** cho mỏ neo `status=planned`, thay cho hằng số `apps/mobile/src/` đang ép cứng ở [emit.ts:161](../../../../../src/core/emit.ts). Mục tiêu: dự án Expo standalone (gốc `src/` hoặc `app/`) không còn nhận anchor sai đường dẫn, **mà không đổi hành vi mặc định** của hai nhánh hiện có.

## 2. Scope
**In scope** — chỉ tầng Lõi, một file logic + test:
- Thêm tham số tuỳ chọn cuối cho `emitTree`: `options?: { srcPrefix?: string }`.
- Nếu `options.srcPrefix` được truyền → dùng nó làm tiền tố cho mọi `planned_src_*`.
- Nếu không truyền → giữ nguyên mặc định hiện tại (`'src/'` cho web, `'apps/mobile/src/'` cho mobile) ⇒ **backward-compatible tuyệt đối**.
- Thêm 1 unit test khẳng định override hoạt động + 1 khẳng định mặc định không đổi.

**Out of scope**
- KHÔNG đổi danh sách file `07-*` / logic nhánh (đó là [W13B](w13b_carryover_hybrid_release_deploy_contract.md)).
- KHÔNG đổi taxonomy (anchor prefix là gợi ý code-vị-trí, không phải cây doc) → **không MAJOR**.
- KHÔNG đổi golden web/mobile (chúng dùng mặc định, phải vẫn xanh).
- KHÔNG sửa skill/adapter để *gọi* options ở đây (chỉ mở API; nối dây để Month sau nếu cần).

## 3. Checklist
- [ ] `emitTree(answers, branch, templatesDir, options?)` — thêm param tuỳ chọn cuối, không phá chữ ký cũ.
- [ ] `srcPrefix` lấy từ `options.srcPrefix` nếu có; nếu không → mặc định theo nhánh như cũ.
- [ ] Mọi `planned_src_*` dùng đúng prefix đã chọn.
- [ ] Golden web + mobile regression vẫn xanh (mặc định không đổi).
- [ ] Có test override (vd `srcPrefix: 'app/'`) + test mặc định mobile vẫn ra `apps/mobile/src/...`.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `src/core/emit.ts` (~+6 dòng): chữ ký `emitTree(answers: InterviewAnswers, branch: 'web' | 'mobile', templatesDir: string, options?: { srcPrefix?: string }): EmittedDoc[]`; thay dòng 161 thành `const srcPrefix = options?.srcPrefix ?? (branch === 'web' ? 'src/' : 'apps/mobile/src/');`
- `[MODIFY]` `src/core/emit.test.ts` (~+15 dòng): 1 ca override + 1 ca mặc định.
- `[MODIFY]` `Design/Core/Versioning.md`: bump **MINOR** (API additive, không phá tương thích) + changelog.
- `[MODIFY]` `Design/DecisionLog.md`: **D18** — anchor prefix cấu hình được, lý do F-04, mặc định giữ nguyên nên không MAJOR.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Đổi chữ ký làm vỡ caller hiện tại | TB | Param tuỳ chọn cuối → mọi caller cũ vẫn hợp lệ; chạy `npm test` toàn bộ. |
| Vô tình đổi default → golden đỏ | Cao | Giữ nguyên biểu thức mặc định; test khẳng định mobile vẫn `apps/mobile/src/`. |
| Bump nhầm MAJOR cho thay đổi additive | Thấp | Taxonomy không đổi → MINOR; ghi rõ lý do ở D18. |

## 6. Verification plan
- `npx vitest run emit` — emit + ca override + ca mặc định đều xanh.
- `npx vitest run` (gồm `test/regression/golden-web`, `golden-mobile`) — **toàn bộ xanh, không golden nào đỏ**.
- `npm run typecheck` — chữ ký mới hợp lệ.

## 7. Status
`WAITING_FOR_APPROVAL`
