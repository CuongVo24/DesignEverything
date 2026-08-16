# Contract — B24a `undo`: hoàn tác câu hỏi vừa commit gần nhất

> Tầng: Lõi.
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24a), [D59](../../../../DecisionLog.md). Phụ thuộc: không (chạy song song B24b/B24c).

## 1. Micro-task target

Cho một lệnh `undo` hoàn tác đúng câu hỏi phỏng vấn vừa commit gần nhất — xoá `answers`/`slots` do
câu đó sinh ra, trả `current_step` về đúng câu đó, thu hồi capability token đang treo — làm cơ chế
bù trừ cho D59 (bỏ thẻ xác nhận dịch ngược làm điều kiện tiên quyết commit).

## 2. Scope

**In scope**

- `selectNextStep(answered, branch, script)` tách ra từ `commitStep`
  ([advanceState.ts](../../../../../src/core/advanceState.ts)) — dùng chung cho `commitStep` và
  (ở B24b) `computeBatch`, không chép lại vòng lặp eligibility hai lần.
- `undoStep(progress, script): Progress` mới — hàm thuần, không I/O, đối xứng với `commitStep`:
  deny `UNDO_DENIED_AFTER_EMIT` nếu `phase !== 'interview'`; deny `UNDO_DENIED_NOTHING_ANSWERED`
  nếu `answered.length === 0`; ngược lại pop câu cuối khỏi `answered`, đặt `current_step` về đúng
  câu đó, gỡ gate câu đó khai (nếu có) khỏi `gates_passed`, reset `branch`/`calibrate_mode` nếu câu
  đó là S7/CAL0, thu hồi `pending_turn_capability` (đặt `null`), đồng bộ lại
  `answered_len_at_last_turn`.
- `undoLastAnswer(workspaceRoot)` trong
  [interviewApplicationServices.ts](../../../../../src/core/interviewApplicationServices.ts) —
  application service khớp khuôn `commitInterviewAnswer`: engine thuần chạy ngoài, một
  `transactInterviewStore` gộp `progress` + xoá `answers[qid]` + xoá mọi `slots[k]` có
  `question_id === qid` + ghi vào `corrections`.
- `interviewStoreCorrectionsSchema` thêm field `answers` (optional, cùng shape với `slots`) —
  additive, không nằm trong `computePayloadChecksum` (giống `corrections.slots` đã có từ trước).
- Wiring CLI: `cliOps/undo.ts`, case `undo` trong `cliOperations.ts`, `classifyCliSubcommand.ts`
  (allow trong pha `interview`, cùng ràng buộc với `commit`), `commandSurface.ts` (`undo: []`).

**Out of scope**

- Không cho undo nhiều hơn một bước — chỉ hoàn tác đúng câu cuối cùng, không phải một chuỗi.
- Không thêm `undo` vào `BOOTSTRAP_CLI_SUBCOMMANDS` (`preAction/shared.ts`) — undo cần progress
  thật để quyết định, không phải lệnh chẩn đoán/khôi phục.
- Không đổi `commitStep`/`checkRate`/`turnCapability.ts` — đó là B24b.
- Không đổi SKILL.md dạy cách dùng `undo` — đó là B24d.

## 3. Checklist

- [x] Undo ngay sau commit CAL0 → `current_step` về `CAL0`, `calibrate_mode = null`,
      `answered` không còn `CAL0`, `pending_turn_capability = null`.
- [x] Token cũ (đã bị undo thu hồi) không còn commit lại được — phải xin token mới.
- [x] Undo sau khi commit S3 (khai `gate: scope-locked`) → gate đó bị gỡ khỏi `gates_passed`.
- [x] Undo sau khi commit S7 → `branch = null`; commit lại S7 với **nhánh khác** phải thành công
      (chứng minh undo mở lại thật, không chỉ cosmetic).
- [x] Undo trên store chưa trả lời câu nào → `UNDO_DENIED_NOTHING_ANSWERED`.
- [x] Undo sau khi `phase` đã rời `interview` → `UNDO_DENIED_AFTER_EMIT`.
- [x] Undo xoá đúng slot do câu bị undo sinh ra (khớp `question_id`), không đụng slot của câu khác;
      giá trị bị xoá được ghi vào `corrections.answers`/`corrections.slots`.
- [x] `classifyCliSubcommand('undo', 'interview')` → allow; `classifyCliSubcommand('undo',
      'docs-emitted')` → deny `UNDO_NOT_ALLOWED`.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/advanceState.ts` — export `selectNextStep`, `isQuestionCompatible`;
  `commitStep` gọi `selectNextStep` thay vì vòng lặp tại chỗ, ~25 dòng đổi (net giảm dòng).
- [NEW] `src/core/undoStep.ts` — ~80 dòng.
- [NEW] `src/core/undoStep.test.ts` — 5 case, ~110 dòng.
- [MODIFY] `src/core/interviewApplicationServices.ts` — `undoLastAnswer` + type
  `UndoLastAnswerResult`, ~95 dòng.
- [MODIFY] `src/core/interviewApplicationServices.test.ts` — describe `B24a`, 3 case, ~115 dòng.
- [MODIFY] `src/core/schemas/interviewStore.ts` — field `answers` trên
  `interviewStoreCorrectionsSchema` + comment sửa lại tiền đề cũ, ~15 dòng.
- [NEW] `src/adapters/shared/cliOps/undo.ts` — ~55 dòng.
- [MODIFY] `src/adapters/shared/cliOperations.ts` — case `undo` + chuỗi liệt kê surface, ~3 dòng.
- [MODIFY] `src/core/classifyCliSubcommand.ts` — nhánh `undo`, ~13 dòng.
- [MODIFY] `src/adapters/shared/cliOps/commandSurface.ts` — `undo: []`, ~1 dòng.
- [MODIFY] `src/adapters/shared/renderNextStep.ts` — cập nhật comment ghim danh sách dispatcher.
- [MODIFY] `src/core/index.ts` — export `undoLastAnswer`, `undoStep`, `selectNextStep`,
  `isQuestionCompatible`.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Token cũ (trước undo) vẫn dùng được để commit lại câu vừa hoàn tác, cho phép replay bỏ qua một lượt người thật | Cao nếu xảy ra | `undoStep` đặt `pending_turn_capability = null` — mọi lần verify sau đó fail `TURN_CAPABILITY_MISSING`, có test xác nhận trực tiếp (`interviewApplicationServices.test.ts`). |
| `answered_len_at_last_turn` không đồng bộ sau undo, làm `checkRate` tính sai ở lượt kế tiếp | TB | Đặt lại `answered_len_at_last_turn = answered.length` (sau pop) trong `undoStep` — `checkRate` một chiều (`<= 1`) nên một delta âm không tự nó gây fail, nhưng để baseline trôi sẽ làm sai phép tính ở lượt commit thật tiếp theo nếu không đồng bộ. |
| `selectNextStep` tách ra làm lệch hành vi `commitStep` cũ | Thấp | Hành vi giữ nguyên 1:1 (cùng logic, chỉ đổi vị trí) — toàn bộ `advanceState.test.ts` (17 test, gồm H6/H7 walk trọn nhánh cli) chạy lại xanh không sửa gì. |

## 6. Verification plan

```bash
npx vitest run src/core/undoStep.test.ts src/core/interviewApplicationServices.test.ts src/core/advanceState.test.ts src/core/classifyCliSubcommand.test.ts test/docs/skill-truth.test.ts src/adapters/shared/renderNextStep.test.ts
npm run typecheck
npm run build:bundle && npx vitest run
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 2, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/undoStep.test.ts src/core/interviewApplicationServices.test.ts
src/core/advanceState.test.ts src/core/classifyCliSubcommand.test.ts test/docs/skill-truth.test.ts
src/adapters/shared/renderNextStep.test.ts` = 5 + 13 + 12 + 21 + 37 + 27 = 115/115 pass.
`npm run typecheck` xanh. Sau `npm run build:bundle`, `npx vitest run` toàn repo = 136 file / 1048
pass / 2 skip (không hồi quy).
