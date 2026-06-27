# Contract — M1-FIX reconcileState: tính lại phase + gates sau EMIT

> **Tầng:** Lõi. Nguồn: Month 1 review (finding #1 + #2, xem [README](README.md)) + [state-schema.md](../../../../Core/Schemas/state-schema.md) §4–§5 + [advanceState W2C](../../month1/W2/w2c_advance_state_contract.md) + [emit W4A](../../month1/W4/w4a_emit_docs_contract.md).

## 1. Micro-task target
Thêm một hàm thuần `reconcileState(progress, policy, existingDocs)` đồng bộ `gates_passed` + `phase` theo artifact thật **sau khi EMIT ghi docs**. Vá hai lỗi review chung gốc: (1) `phase` kẹt ở `docs-emitted` không bao giờ lên `ready-to-build`; (2) `gates_passed` chỉ cập nhật như side-effect của PreToolUse.

## 2. Scope
**In scope** — `src/core/`:
- `[NEW]` `reconcileState(progress: Progress, policy: GatePolicy, existingDocs: string[]): Progress` — **thuần, idempotent, không I/O**:
  - Với mỗi gate dùng `evaluateGate` (W2D); gate mở → append `gate.id` vào `gates_passed` (append-only, không trùng).
  - Tính lại `phase`: nếu `current_step === null` và đã đủ `requiredDocs` + `requiredGates` của nhánh → `ready-to-build`; còn `current_step === null` mà thiếu → `docs-emitted`; còn lại → `interview`.
- `[NEW]` tách helper `derivePhase(progress, script)` dùng chung cho `commitStep` (đang inline logic phase ở [advanceState.ts:77–104](../../../../../src/core/advanceState.ts)) **và** `reconcileState`, để không nhân đôi điều kiện §4.5.
- Điểm gọi: lớp **skill** gọi `reconcileState` ngay sau khi emit + ghi docs xuống đĩa (chỉ rõ trong e2e/luồng, KHÔNG nhồi I/O vào hàm core).

**Out of scope**
- Đọc/ghi FS, quét cây `docs/` thật (đó là việc của caller adapter — engine vẫn thuần).
- KHÔNG đổi chữ ký `commitStep`/`checkRate`/`stampTurn`. KHÔNG bỏ logic phase trong `commitStep` (refactor sang `derivePhase` nhưng giữ hành vi).
- KHÔNG validate ngữ nghĩa câu trả lời hay tự chọn nhánh (mô hình hai lớp).

## 3. Checklist
- [ ] `reconcileState` append gate mở vào `gates_passed` (append-only, không trùng).
- [ ] Web: sau emit đủ 3 doc bắt buộc + đã xong W5 → `phase === 'ready-to-build'`.
- [ ] Idempotent: gọi `reconcileState` hai lần liên tiếp cùng input → kết quả không đổi.
- [ ] `commitStep` dùng `derivePhase`, hành vi cũ không đổi (test W2C cũ vẫn xanh).
- [ ] e2e [web-flow.test.ts](../../../../../test/e2e/web-flow.test.ts) Phase 6: sau emit + reconcile, assert `phase === 'ready-to-build'` (hiện đang `docs-emitted`).
- [ ] Hàm thuần, không I/O.

## 4. Interfaces / Files expected to change
```ts
export function reconcileState(
  progress: Progress, policy: GatePolicy, existingDocs: string[]
): Progress;
export function derivePhase(progress: Progress, script: Script): Progress['phase'];
```
- `[NEW]` `src/core/reconcileState.ts` (~40 dòng) + `src/core/reconcileState.test.ts`
- `[MODIFY]` `src/core/advanceState.ts` — rút phase logic ra `derivePhase` (~-25/+10 dòng)
- `[MODIFY]` `src/core/index.ts` — export `reconcileState`, `derivePhase`
- `[MODIFY]` `test/e2e/web-flow.test.ts` — gọi reconcile + assert `ready-to-build`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Nhân đôi điều kiện phase (commitStep vs reconcile) | Cao | Tách `derivePhase` dùng chung; chỉ một nơi định nghĩa điều kiện §4.5. |
| Phá hành vi `commitStep` cũ | Cao | Giữ nguyên chữ ký + chạy lại toàn bộ test W2C; refactor thuần. |
| `gates_passed` bị nhân đôi entry | TB | Append-only có guard `!includes(id)`; test idempotency. |
| Caller quên gọi reconcile sau emit | TB | Thể hiện rõ trong e2e; PreToolUse vẫn là lưới an toàn thứ hai (giữ nguyên). |

## 6. Verification plan
- `npx vitest run reconcileState` — gate-open append + 3 nhánh phase + idempotency.
- `npx vitest run advanceState` — test W2C cũ vẫn xanh sau refactor `derivePhase`.
- `npx vitest run test/e2e/web-flow` — Phase 6 assert `ready-to-build`.
- `npm run typecheck && npm run lint && npm test` — toàn bộ ≥ 47 test xanh.

## 7. Status
`WAITING_FOR_APPROVAL`
