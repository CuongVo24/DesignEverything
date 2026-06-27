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
- [ ] Test gate: thiếu/đủ/thừa doc phủ đủ 3 nhánh kết quả.
- [ ] Test state: version lệch + field thiếu + double-advance + duplicate turn.
- [ ] Test anchor: `status=planned` đúng ở web + mobile; EMIT đúng taxonomy 9 file/nhánh.
- [ ] Test nhập xấu: xin code sớm → deny; nhảy chủ đề → nhịp 1 bước giữ.
- [ ] Toàn bộ suite xanh (web + mobile cùng lúc).

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
`WAITING_FOR_APPROVAL`
