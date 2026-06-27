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
- [x] Phiên mobile chạy trọn S0→M5, `current_step` kết `null`.
- [x] `emitTree('mobile')` ra `07-release.md`, không `07-deployment.md`, đúng 9 file.
- [x] Anchor planned mobile dùng `apps/mobile/src/`.
- [x] Gate chặn→mở đồng nhất với web.
- [x] web-flow.test.ts cũ vẫn xanh (không phá web Month 1).

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
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt kịch bản kiểm thử tích hợp E2E cho nhánh Mobile tại **[mobile-flow.test.ts](file:///e:/DesignEverything/test/e2e/mobile-flow.test.ts)**:
  - Giả lập trọn vẹn chu kỳ phỏng vấn Mobile (12 lượt tương tác S0->S6->M1->M5) kết hợp `onSessionStart`, `onUserPromptSubmit` và lệnh lõi `commitStep`.
  - Xác thực việc chọn nhánh `branchChoice='mobile'` tại S6 khóa chặt nhánh hoạt động và chuyển hướng bước tiếp theo sang `M1`.
  - Kiểm thử cơ chế chặn cứng gating: chặn ghi code ngoài docs `apps/mobile/src/index.ts` khi chưa sinh tài liệu (bị chặn bởi gate `scope-locked`).
  - Sinh cây 9 file tài liệu bằng `emitTree` sau khi hoàn thành phỏng vấn ở M5 và lưu xuống đĩa.
  - Xác thực sinh đúng file `07-release.md` và không tạo ra `07-deployment.md`.
  - Xác thực tất cả các mỏ neo planned tự động mang tiền tố source path của nhánh mobile `apps/mobile/src/` (ví dụ: `src=apps/mobile/src/features/vision/vision.ts::projectVision`).
  - Kiểm tra mở cổng chặn thành công sau khi đã lưu tài liệu.
- Đã chạy kiểm chứng độc lập đảm bảo kịch bản `web-flow.test.ts` cũ vẫn xanh 100%, bảo vệ tuyệt đối thành quả Web của Month 1.
- Chạy `npm test` thành công toàn bộ 48 tests. Lint và Typecheck hoàn toàn sạch lỗi.
