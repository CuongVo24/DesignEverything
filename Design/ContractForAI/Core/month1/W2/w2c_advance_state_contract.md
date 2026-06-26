# Contract — W2C advanceState + rate-limit (mô hình hai lớp)

> **Tầng:** Lõi. Nguồn: [Week-02](../../../../RoadMap/Month1/Week-02.md) + [state-schema.md](../../../../Core/Schemas/state-schema.md) §3–§5 (**đọc kỹ mô hình hai lớp**) + [DecisionLog D14](../../../../DecisionLog.md).

## 1. Micro-task target
Hàm thuần tính bước kế tiếp (lớp **skill** = commit ngữ nghĩa) và hàm kiểm nhịp (lớp **hook**). Đây là nơi mô hình hai lớp D14 thành code — tách bạch rõ hai trách nhiệm.

## 2. Scope
**In scope** — `src/core/advanceState.ts`:
- `commitStep(progress, script, { userTurnId, branchChoice? }): Progress` — **lớp skill**. Thuần. Append `current_step` vào `answered`; set `last_user_turn_id = userTurnId`; nếu `current_step === 'S6'` thì set `branch = branchChoice` (bắt buộc truyền `branchChoice ∈ {web,mobile}` khi commit S6, throw nếu thiếu); tính `current_step` kế theo `script` + `depends_on`; cập nhật `phase`/`updated_at` theo §4. **Chỉ commit khi `userTurnId !== progress.last_user_turn_id`** (nếu trùng → throw "đã commit cho lượt này").
- `checkRate(progress, incomingAnsweredLen): { ok: boolean; reason?: string }` — **lớp hook**. Kiểm `incomingAnsweredLen - progress.answered_len_at_last_turn <= 1`. Không mutate.
- `stampTurn(progress, answeredLen): Progress` — cập nhật `answered_len_at_last_turn = answeredLen` (hook gọi đầu lượt).

**Out of scope**
- Đọc/ghi file (W2B). Đánh giá gate (W2D). Logic hook thật trên Claude Code (W3) — ở đây chỉ là hàm thuần.
- KHÔNG nhồi logic Must/Should/Could hay wording phỏng vấn vào đây (đó là nội dung lõi, không phải engine).

## 3. Checklist
- [ ] `commitStep` đi đúng `S0→S1→...→S6→(W1|M1)→...` theo `branch`.
- [ ] Commit `S6` bắt buộc `branchChoice`; thiếu → throw; set `branch` một chiều (throw nếu `branch` đã khác null mà cố đổi).
- [ ] `commitStep` throw khi `userTurnId === last_user_turn_id`.
- [ ] `checkRate` trả `ok=false` khi answered tăng > 1.
- [ ] Chuyển `phase` sang `ready-to-build` + `current_step=null` đúng điều kiện §4.5.
- [ ] Hàm thuần (không I/O); test xanh.

## 4. Interfaces / Files expected to change
```ts
export function commitStep(
  progress: Progress, script: Script,
  args: { userTurnId: string; branchChoice?: 'web' | 'mobile' }
): Progress;
export function checkRate(progress: Progress, incomingAnsweredLen: number): { ok: boolean; reason?: string };
export function stampTurn(progress: Progress, answeredLen: number): Progress;
```
- `[NEW]` `src/core/advanceState.ts`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Lẫn trách nhiệm hook/skill | Cao | Tách 3 hàm rõ; `commitStep`=skill, `checkRate`/`stampTurn`=hook. Bám D14. |
| Đổi nhánh giữa chừng | TB | `branch` một chiều: throw nếu cố đổi sau khi đã set. |
| Nhồi logic nội dung vào engine | TB | Chỉ đọc `script`; không hardcode câu/phân loại. |

## 6. Verification plan
- Chuỗi commit S0..S6 + branchChoice='web' → current_step='W1'; tiếp đến W5 → phase chuyển đúng.
- `commitStep` cùng `userTurnId` hai lần → throw.
- `checkRate` với answered tăng 2 → `ok=false`.
- Nhánh mobile: S6 + branchChoice='mobile' → 'M1' → ... → 'M5'.

## 7. Status
`WAITING_FOR_APPROVAL`
