# Contract — W5B Mobile end-to-end + regression phân biệt web/mobile

> **Tầng:** Adapter + test. Nguồn: [Week-05](../../../../RoadMap/Month2/Week-05.md) + [emit W4A](../../month1/W4/w4a_emit_docs_contract.md) + [advanceState W2C](../../month1/W2/w2c_advance_state_contract.md) + golden mobile [Design/Content/golden-example-mobile/](../../../../Content/golden-example-mobile/). Phụ thuộc: [W5A](w5a_mobile_warnings_content_contract.md).

## 1. Micro-task target
Chạy được một phiên Claude Code trọn tuyến **S0→S6→M1–M5** trên cùng engine đã dùng cho web, emit đúng **`07-release.md`** (không `07-deployment.md`), và khóa lại bằng regression test phân biệt rõ web path vs mobile path. KHÔNG được phá demo web Month 1.

## 2. Scope
**In scope** — `test/e2e/`:
- `[NEW]` `test/e2e/mobile-flow.test.ts`: SessionStart → commit S0..S6 với `branchChoice='mobile'` → M1..M5 → emit. Mô phỏng song song cấu trúc [web-flow.test.ts](../../../../../test/e2e/web-flow.test.ts) nhưng nhánh mobile, workspace cô lập.
- Assert: `progress.branch === 'mobile'`, `current_step` đi `M1→...→M5→null`.
- Assert `emitTree(answers, 'mobile', templatesDir)`: có `07-release.md`, **không** có `07-deployment.md`; đúng 9 file; anchor planned dùng tiền tố `apps/mobile/src/` (đã hỗ trợ ở emit.ts).
- Assert gate `scope-locked` vẫn chặn `Write src/x.ts` trước đủ doc, cho qua sau emit (đồng nhất web).
- `[MODIFY]` nếu cần: bổ sung regression nhỏ cho `05-architecture.md` nhánh mobile (device capabilities) + "07-release là file 07 duy nhất".

**Out of scope**
- KHÔNG đổi `emit.ts`/`advanceState.ts` (nhánh mobile đã hoạt động ở Month 1 — nếu phát hiện bug thật → DỪNG, mở break_task).
- KHÔNG đụng wording M2/M5 (W5A). KHÔNG đụng AGENTS.md (W6).

## 3. Checklist
- [ ] Phiên mobile chạy trọn S0→M5, `current_step` kết `null`.
- [ ] `emitTree('mobile')` ra `07-release.md`, không `07-deployment.md`, đúng 9 file.
- [ ] Anchor planned mobile dùng `apps/mobile/src/`.
- [ ] Gate chặn→mở đồng nhất với web.
- [ ] web-flow.test.ts cũ vẫn xanh (không phá web Month 1).

## 4. Interfaces / Files expected to change
- `[NEW]` `test/e2e/mobile-flow.test.ts` (~150 dòng, mirror web-flow)
- Không đổi API core/adapter (chỉ tiêu thụ API đã có).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Emit nhầm `07-deployment.md` ở mobile | Cao | Assert tường minh file 07 = release, phủ định deployment. |
| Mobile path chỉ là web đổi tên câu | Cao | Assert device_capabilities + 07-release đặc thù mobile, đối chiếu golden mobile. |
| Phá test web cũ | Cao | Workspace cô lập riêng; chạy full suite trước khi DONE. |
| Lộ bug engine mobile thật | TB | Out of scope sửa — DỪNG, mở break_task ghi rõ. |

## 6. Verification plan
- `npx vitest run test/e2e/mobile-flow` — phiên mobile + emit 07-release + gate.
- `npx vitest run test/e2e/web-flow` — web cũ vẫn xanh.
- `npm run typecheck && npm test` — toàn bộ xanh.

## 7. Status
`WAITING_FOR_APPROVAL`
