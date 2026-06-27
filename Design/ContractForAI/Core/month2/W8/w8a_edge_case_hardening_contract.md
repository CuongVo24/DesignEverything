# Contract — W8A Hardening ca biên gate/state/anchor

> **Tầng:** Lõi + test. Nguồn: [Week-08](../../../../RoadMap/Month2/Week-08.md) §"bug bash ca biên" + [TestStrategy](../../../../Conventions/TestStrategy.md) §GATE/state + [state-schema](../../../../Core/Schemas/state-schema.md). Phụ thuộc: W5–W7. Nên làm **sau** [break_task M1 reconcile](../../break_task/Month1/m1_fix_state_reconcile_after_emit_contract.md).

## 1. Micro-task target
Khóa lại các ca biên chính của gate/state/anchor bằng test hoặc fixture: state lỗi, version lệch, double-advance, xin code khi mới xong S1/S2, nhập lan man/nhảy chủ đề. Mục tiêu: thay đổi nội dung/adapter không làm vỡ thầm lặng.

## 2. Scope
**In scope** — `test/` + fixture:
- Ca biên gate: thiếu một trong 3 doc → vẫn `deny`; đủ 3 → `allow`; doc thừa ngoài taxonomy không mở gate sai.
- Ca biên state: `progress.json` version lệch/field thiếu → loader báo lỗi rõ (đã có fixture invalid/ — mở rộng phủ); double-advance (answered tăng >1) → `checkRate` block; duplicate `userTurnId` → `commitStep` throw.
- Ca biên anchor: mọi doc emit mang `status=planned` đúng chuẩn ở **cả hai nhánh**; EMIT đúng taxonomy (web→07-deployment, mobile→07-release, đúng 9 file).
- Ca nhập xấu: xin code khi mới xong S1/S2 → gate chặn; nhảy chủ đề → vẫn 1 bước/lượt.

**Out of scope**
- KHÔNG thêm tính năng mới (tuần hardening, không mở scope — nghiệm thu Week-08).
- KHÔNG sửa engine trừ khi test lộ bug thật → khi đó DỪNG, mở break_task riêng.

## 3. Checklist
- [x] Test gate: thiếu/đủ/thừa doc phủ đủ 3 nhánh kết quả.
- [x] Test state: version lệch + field thiếu + double-advance + duplicate turn.
- [x] Test anchor: `status=planned` đúng ở web + mobile; EMIT đúng taxonomy 9 file/nhánh.
- [x] Test nhập xấu: xin code sớm → deny; nhảy chủ đề → nhịp 1 bước giữ.
- [x] Toàn bộ suite xanh (web + mobile cùng lúc).

## 4. Interfaces / Files expected to change
- `[NEW]/[MODIFY]` `test/e2e/web-edge-cases.test.ts`, `test/e2e/mobile-edge-cases.test.ts`
- `[NEW]` fixture bổ sung trong `test/fixtures/progress/invalid/` (version lệch)
- Không đổi API core/adapter.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Test chỉ chạy "đường bằng" | Cao | Bắt buộc phủ ca nhập xấu + version lệch theo Week-08. |
| Hardening biến thành mở scope | TB | Out of scope rõ; chỉ thêm test/fixture, không tính năng. |
| Lộ bug engine giữa chừng | TB | DỪNG + break_task, không vá lén trong contract test. |

## 6. Verification plan
- `npx vitest run` — toàn bộ test files xanh, gồm edge-cases web + mobile.
- `npm run typecheck && npm run lint` — sạch.
- Kiểm số test tăng so với baseline Month 1 (47) — ghi con số mới.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt bổ sung các ca kiểm thử biên cứng cáp nhằm bảo vệ toàn diện các logic lõi tại **[web-edge-cases.test.ts](file:///e:/DesignEverything/test/e2e/web-edge-cases.test.ts)** và **[mobile-edge-cases.test.ts](file:///e:/DesignEverything/test/e2e/mobile-edge-cases.test.ts)**:
  - **Kiểm thử Gate**: Xác thực việc thiếu một trong ba tài liệu (ví dụ: thiếu `02-scope.md`) vẫn giữ trạng thái chặn `deny` khi ghi code; đủ cả ba tài liệu sẽ lập tức mở khóa `allow`; các tệp tài liệu thừa ngoài cây taxonomy (như `08-unknown.md`) được bỏ qua và không làm sai lệch logic.
  - **Kiểm thử State**:
    - Thêm fixture `invalid-version-format.json` tại **[test/fixtures/progress/invalid/](file:///e:/DesignEverything/test/fixtures/progress/invalid)**. Xác thực việc nạp tệp progress có phiên bản lệch/định dạng sai hoặc thiếu trường bắt buộc bị Zod chặn đứng và ném lỗi rõ ràng thông qua `loadProgress.test.ts`.
    - Xác thực chặn đứng double-advance (ngăn nhảy cóc câu trả lời qua `checkRate`) và duplicate turn (ném lỗi `Duplicate commit` nếu gửi trùng `userTurnId`).
  - **Kiểm thử Anchor & Taxonomy**: Xác thực tất cả tài liệu mẫu được sinh ra chứa mỏ neo `status=planned` đúng định dạng, cây 9 file phân phối chính xác theo nhánh hoạt động (nhánh Web sinh `07-deployment.md` và không sinh `07-release.md`; nhánh Mobile sinh `07-release.md` và không sinh `07-deployment.md`).
  - **Kiểm thử Nhập xấu**: Chặn cứng yêu cầu sinh mã nguồn sớm khi mới chỉ hoàn thành bước S1/S2; bảo vệ nhịp độ tương tác 1-bước/lượt khi người dùng cố ý nhảy chủ đề.
- Chạy `npm test` thành công toàn bộ **55 tests** (tăng 8 tests so với baseline 47 tests trước đó). Lint và Typecheck hoàn toàn sạch lỗi.
