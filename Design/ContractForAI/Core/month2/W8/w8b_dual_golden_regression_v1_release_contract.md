# Contract — W8B Regression 2 golden + chốt v1 (release note)

> **Tầng:** Test + tài liệu. Nguồn: [Week-08](../../../../RoadMap/Month2/Week-08.md) §"regression 2 golden" + [MasterRoadMap](../../../../RoadMap/MasterRoadMap.md) + [Versioning](../../../../Core/Versioning.md). Phụ thuộc: [W8A](w8a_edge_case_hardening_contract.md), W5–W7.

## 1. Micro-task target
Khóa bộ regression chính thức chạy **web + mobile xanh cùng lúc** đối chiếu hai golden, cập nhật MasterRoadMap + Versioning changelog, và viết một **ghi chú chốt v1**: scope, setup, known limitations, cách demo lại. Đóng mốc "v1 dùng được".

## 2. Scope
**In scope**:
- `[NEW]` `test/regression/golden-web.test.ts` + `golden-mobile.test.ts`: emit từ transcript/answers golden → so output với cây docs golden tương ứng (so cấu trúc + sự hiện diện anchor + đúng file 07; cho phép so structural, không cứng nhắc từng ký tự nếu golden ghi rõ).
- `[NEW]` `RUNBOOK-mobile.md` (song song [RUNBOOK-web.md](../../../../../RUNBOOK-web.md)) — cách tái lập demo mobile.
- `[NEW]` `Design/RoadMap/Month2/v1-release-note.md`: scope v1 (web+mobile+AGENTS.md), setup, **known limitations** (làm dữ liệu backlog Month 3), cách demo lại web/mobile/harness mềm.
- `[MODIFY]` `Design/RoadMap/MasterRoadMap.md` — đóng mốc v1; `Design/Core/Versioning.md` changelog.

**Out of scope**
- KHÔNG mở tính năng mới. KHÔNG sửa engine (lộ bug → break_task).
- KHÔNG đóng gói npm/phân phối (ngoài scope tới Month sau).

## 3. Checklist
- [x] Regression web + mobile chạy xanh cùng lúc trong CI cục bộ.
- [x] Golden web + mobile được đối chiếu tự động (structural).
- [x] RUNBOOK-mobile đủ để tái lập demo mobile không cần nhớ.
- [x] v1-release-note có: scope, setup, known limitations, cách demo.
- [x] MasterRoadMap đóng mốc v1 + Versioning changelog cập nhật.
- [x] Smoke Claude Code + ≥1 harness mềm vẫn chấp nhận được sau chỉnh nội dung W7.

## 4. Interfaces / Files expected to change
- `[NEW]` `test/regression/golden-web.test.ts`, `test/regression/golden-mobile.test.ts`
- `[NEW]` `RUNBOOK-mobile.md`, `Design/RoadMap/Month2/v1-release-note.md`
- `[MODIFY]` `Design/RoadMap/MasterRoadMap.md`, `Design/Core/Versioning.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| "Đủ tính năng" nhầm là "đủ dùng" | Cao | Release note buộc liệt kê known limitations thật, không tô hồng. |
| Regression so cứng từng ký tự → giòn | TB | So structural + anchor + file-set; golden là nguồn, ghi rõ tiêu chí so. |
| Đóng mốc khi mobile/web chưa xanh đồng thời | Cao | Nghiệm thu chặn: cả hai phải xanh cùng một lần chạy. |

## 6. Verification plan
- `npx vitest run test/regression` — web + mobile golden xanh cùng lúc.
- `npm test` — toàn bộ suite xanh (web/mobile/edge/regression).
- Review thủ công v1-release-note + RUNBOOK-mobile đủ tái lập.
- Đối chiếu MasterRoadMap mốc v1 đã đóng đúng.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt bộ kiểm thử hồi quy đối chiếu cấu trúc tự động (headings và anchors) cho cả hai dự án mẫu tại **[golden-web.test.ts](file:///e:/DesignEverything/test/regression/golden-web.test.ts)** và **[golden-mobile.test.ts](file:///e:/DesignEverything/test/regression/golden-mobile.test.ts)**. Toàn bộ các mỏ neo ẩn và tiêu đề được so khớp tự động, phát hiện và sửa đổi hoàn chỉnh các sai khác cấu trúc.
- Đã viết cẩm nang vận hành đầy đủ cho nhánh di động tại **[RUNBOOK-mobile.md](file:///e:/DesignEverything/RUNBOOK-mobile.md)** để người dùng dễ dàng tái lập demo phỏng vấn và kiểm chứng các cổng chặn.
- Đã tạo ghi chú phát hành **[v1-release-note.md](file:///e:/DesignEverything/Design/RoadMap/Month2/v1-release-note.md)** nêu bật phạm vi tính năng (web + mobile + AGENTS.md), quy trình cài đặt và liệt kê các giới hạn đã biết (known limitations) làm dữ liệu tồn đọng cho Month 3.
- Đã đóng mốc **v1 dùng được** trong **[MasterRoadMap.md](file:///e:/DesignEverything/Design/RoadMap/MasterRoadMap.md)** và cập nhật changelog của **[Versioning.md](file:///e:/DesignEverything/Design/Core/Versioning.md)** lên phiên bản `1.0.0`.
- Chạy `npm test` xanh hoàn toàn 57/57 tests bao gồm cả Edge Cases và Regression. Lint và Typecheck hoàn toàn sạch lỗi.
