# Contract — M2-FIX Khóa regression cho 2 cảnh báo M2/M5 ở nhánh mobile

> **Tầng:** Test (e2e). Nguồn: Month 2 review (finding #1, xem [README](README.md)) + [Week-05](../../../../RoadMap/Month2/Week-05.md) DoD ("hai cảnh báo cốt lõi bộc lộ đúng lúc") + [Week-08](../../../../RoadMap/Month2/Week-08.md) ("regression không để vỡ thầm lặng") + [w5a_mobile_warnings_content](../../month2/W5/w5a_mobile_warnings_content_contract.md).

## 1. Micro-task target
Thêm assertion vào e2e mobile để **khóa** việc hai cảnh báo cốt lõi thật sự surface tới người dùng: khi `current_step === 'M2'` thì `injectedContext` phải chứa cảnh báo chi phí offline/sync; khi `current_step === 'M5'` phải chứa cảnh báo quy trình store (App Signing / phí Developer / review). Đóng lỗ "xóa nhầm cảnh báo trong `script.yaml` mà không test nào đỏ".

## 2. Scope
**In scope** — chỉ file test, KHÔNG đụng production code:
- `[MODIFY]` [test/e2e/mobile-flow.test.ts](../../../../../test/e2e/mobile-flow.test.ts) — trong vòng lặp `mobileSteps` ([~dòng 130–142](../../../../../test/e2e/mobile-flow.test.ts)), khi `step === 'M2'`/`'M5'` thêm assert trên `promptResult.injectedContext`.
- Cảnh báo đến từ trường `translate_back` và được [renderInject](../../../../../src/adapters/claude/skill/render-inject.ts:25) nhồi vào context — nên assert đi qua đúng đường thật của sản phẩm.
- Assert theo **marker ổn định** `[CẢNH BÁO]` + một cụm từ khóa ngắn không dễ vô tình đổi:
  - M2: chứa `[CẢNH BÁO]` **và** `offline` (hoặc `đồng bộ`).
  - M5: chứa `[CẢNH BÁO]` **và** `store` (hoặc `ký ứng dụng`/`App Signing`).

**Out of scope**
- KHÔNG sửa `script.yaml`, `renderInject`, `userPromptSubmit`, hay bất kỳ production code nào (cảnh báo đã đúng — đây là test gap, không phải bug logic).
- KHÔNG assert toàn văn cảnh báo (giòn — sẽ vỡ mỗi lần chau chuốt chữ); chỉ marker + từ khóa.
- KHÔNG thêm file test mới nếu chèn được vào mobile-flow hiện có; chỉ tách ra `mobile-edge-cases` nếu vòng lặp trở nên khó đọc.

## 3. Checklist
- [ ] Tại `step === 'M2'`: assert `injectedContext` chứa `[CẢNH BÁO]` và từ khóa offline/đồng bộ.
- [ ] Tại `step === 'M5'`: assert `injectedContext` chứa `[CẢNH BÁO]` và từ khóa store/ký ứng dụng.
- [ ] Thử nghịch đảo (manual sanity, không commit): tạm xóa `[CẢNH BÁO]` khỏi `script.yaml` → test **đỏ**; khôi phục → xanh.
- [ ] Web path không bị ảnh hưởng (web-flow vẫn xanh).
- [ ] Toàn bộ ≥ 57 test xanh.

## 4. Interfaces / Files expected to change
- Không có interface mới.
- `[MODIFY]` `test/e2e/mobile-flow.test.ts` (~+8 dòng trong vòng lặp `mobileSteps`).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Assert toàn văn → giòn, vỡ khi chau chuốt W7 | Cao | Chỉ assert marker `[CẢNH BÁO]` + 1 từ khóa ngắn, không khóa cả câu. |
| Từ khóa quá chung (vd "app") → assert vô nghĩa | TB | Chọn từ khóa đặc trưng cảnh báo: `offline`/`đồng bộ`, `store`/`ký ứng dụng`. |
| Đặt assert sai chỗ (sau commit, step đã trôi) | TB | Assert trên `promptResult` của đúng lượt `turn-mobile-${step}` trước `commitStep`. |

## 6. Verification plan
- `npx vitest run test/e2e/mobile-flow` — assert M2 + M5 surface.
- `npx vitest run test/e2e/web-flow` — web không đổi.
- `npm run typecheck && npm run lint && npm test` — toàn bộ ≥ 57 test xanh.

## 7. Status
`WAITING_FOR_APPROVAL`
