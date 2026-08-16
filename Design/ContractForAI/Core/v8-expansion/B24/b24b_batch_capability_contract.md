# Contract — B24b gộp nhiều câu vào một lượt: Core quyết batch, không phải agent

> Tầng: Lõi.
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24b), [D60](../../../../DecisionLog.md). Phụ thuộc: không (chạy song song B24a/B24c).

## 1. Micro-task target

Cho `turnCapability.ts` mang một danh sách câu hỏi (`question_ids`) thay vì đúng một câu, cho
`computeBatch(progress, script)` tính danh sách đó theo luật cố định (không phải agent chọn), và
cho `checkRate`/`commitStep` chấp nhận tối đa đúng số câu trong batch trong một lượt.

## 2. Scope

**In scope**

- `turnCapabilityRecordSchema` thêm `question_ids?: string[]` và
  `consumed_question_ids?: string[]` — **`.optional()`, không `.default()`** (xem cảnh báo checksum
  ở §5). `question_id` (số ít) giữ nguyên required, luôn bằng `question_ids[0]`.
- `verifyTurnCapability` sửa đúng 3/10 guard, giữ nguyên thứ tự bước (thứ tự này bị ghim bởi
  [b3b-g0-interface-note.md](../../../v1-fix-bugs/b3b-g0-interface-note.md)): guard replay kiểm
  thêm `consumed_question_ids` trước khi kiểm `status`; guard wrong-question kiểm câu hỏi có nằm
  trong `question_ids` không; guard wrong-revision cộng thêm `consumed_question_ids.length` vào vế
  so sánh.
- `commitStep` ([advanceState.ts](../../../../../src/core/advanceState.ts)) tiêu thụ token theo
  phần: chỉ chuyển `status: 'consumed'` khi toàn bộ batch đã được commit hết.
- `checkRate` đọc trần cho phép từ `pending_turn_capability.question_ids.length` (mặc định 1 khi
  vắng, giữ nguyên luật cũ cho token/store trước lane này).
- `computeBatch(progress, script): string[]` mới — thuật toán cố định (§4), không có input từ
  agent.
- `issuePromptCapability` gọi `computeBatch` **trong** CAS mutator, phát token cho cả batch.

**Out of scope**

- Không đổi SKILL.md/render-inject.ts để hiển thị batch cho agent — đó là B24d.
- Không đổi `multi_select` — đó là B24c.
- Không đổi `deepenState.ts`/capability của lane deepen — batch chỉ áp cho `operation_kind:
  'interview'`.

## 3. Checklist

- [x] `computeBatch` cho CAL0 → `['CAL0', 'S0']` (không câu nào có `option_hints`/critic, cùng
      branch `core`).
- [x] `computeBatch` cho S1/S2/S4/S5 (có `option_hints`) → mỗi câu một mình.
- [x] `computeBatch` cho S3 (có critic) → một mình dù không có `option_hints`.
- [x] `computeBatch` cho S6 → `['S6', 'S7']`; S7 luôn chốt batch (không câu nào nối sau).
- [x] `computeBatch` cho R1 (sau S7, nhánh đã biết) → `['R1', 'S8']`, dừng trước khi vượt sang
      nhánh web/mobile/cli.
- [x] `computeBatch` cho W1/C1 → gộp tới trần cứng 4 câu (`[W1,W2,W3,W4]`/`[C1,C2,C3,C4]`), dừng
      trước W5/C5 (có critic).
- [x] Một token batch `[CAL0, S0]`: commit CAL0 → batch vẫn `status: 'active'`,
      `consumed_question_ids: ['CAL0']`; commit S0 bằng **cùng token** → thành công, không cần token
      mới. Commit lần ba (đã tiêu hết) → `TURN_CAPABILITY_REPLAY`.
- [x] Verify lại token đã tiêu CAL0 cho đúng CAL0 → `TURN_CAPABILITY_REPLAY`; verify cho S0 (chưa
      tiêu) → vẫn `valid: true`.
- [x] Store/token phát trước lane này (không có `question_ids`) đọc lại không `CHECKSUM_MISMATCH`.

## 4. Thuật toán `computeBatch`

Bắt đầu ở `progress.current_step` (head). Head có `option_hints` hoặc có mục trong `script.critics`
hoặc là `S7` → batch chỉ có head. Ngược lại, mô phỏng `selectNextStep` (advanceState.ts, dùng lại
nguyên, không chép lại) trên một tập `answered` ảo, nhận thêm câu kế tiếp khi và chỉ khi: cùng
`branch` với head, không có `option_hints`, không có critic; dừng ngay sau khi nhận `S7` vào batch
(không đánh giá tiếp vì nhánh chưa xác định); trần cứng 4 câu.

## 5. Cảnh báo kỹ thuật (đọc trước khi động vào schema)

`loadInterviewStore` zod-parse **trước**, tính checksum **sau**, trên envelope đã parse
([interviewStore.ts:239-256](../../../../../src/core/interviewStore.ts:239)). `.default([])` trên
field mới sẽ nhồi giá trị vào mọi record cũ trước khi tính lại checksum → `CHECKSUM_MISMATCH` trên
toàn bộ store đang sống. Cả hai field mới dùng `.optional()` thuần; đọc bằng
`cap.question_ids ?? [cap.question_id]`, không bao giờ đọc trần.

## 6. Interfaces / Files expected to change

- [MODIFY] `src/core/turnCapability.ts` — 2 field schema + 3 guard trong `verifyTurnCapability`,
  ~35 dòng.
- [MODIFY] `src/core/advanceState.ts` — `commitStep` tiêu thụ từng phần (~15 dòng), `checkRate` đọc
  trần theo batch (~8 dòng).
- [NEW] `src/core/computeBatch.ts` — ~90 dòng.
- [NEW] `src/core/computeBatch.test.ts` — 14 case, ~150 dòng.
- [MODIFY] `src/core/interviewApplicationServices.ts` — `issuePromptCapability` load script + gọi
  `computeBatch` trong mutator, ~25 dòng; thêm case `SCRIPT_MISSING` vào
  `IssuePromptCapabilityFail`.
- [MODIFY] `src/core/interviewApplicationServices.test.ts` — describe `B24b`, 2 case.
- [MODIFY] `src/core/index.ts` — export `computeBatch`.
- [MODIFY] `src/core/canonicalAuthority.test.ts`, `test/e2e/web-edge-cases.test.ts`,
  `test/e2e/mobile-edge-cases.test.ts` — cập nhật fixture/assertion cho đúng ngữ nghĩa batch mới
  (xem §7 Deviation).

## 7. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| `.default()` thay vì `.optional()` gây `CHECKSUM_MISMATCH` toàn bộ store cũ | Cao nếu xảy ra | Cả hai field mới `.optional()` thuần; test `interviewApplicationServices.test.ts` xác nhận round-trip write+read không vỡ checksum. |
| Batch cho token chết sớm vì `expected_revision` lệch sau commit đầu tiên trong batch | Cao nếu không sửa | Công thức so khớp `expected_revision + consumed_question_ids.length === currentRevision`, xác nhận bằng test commit hai câu liên tiếp cùng một token. |
| `computeBatch` gộp nhầm câu khác nhánh (vd core + web) | TB | Check `nextQuestion.branch !== headQuestion.branch` tường minh trong vòng lặp, dù `selectNextStep`/`isQuestionCompatible` đã lọc phần lớn trường hợp này qua `progress.branch`. |

## 8. Verification plan

```bash
npx vitest run src/core/turnCapability.test.ts src/core/advanceState.test.ts src/core/computeBatch.test.ts src/core/interviewApplicationServices.test.ts src/core/canonicalAuthority.test.ts test/e2e/web-edge-cases.test.ts test/e2e/mobile-edge-cases.test.ts
npm run typecheck
npm run build:bundle && npx vitest run
```

## 9. Status

DONE (2026-08-16, Đợt 2 Phase 3, nhánh `codex/lane-8-1-interactive-cards`).

**Deviation từ mục 3 (ghi lại, không sửa lén):** ba test hiện có (`canonicalAuthority.test.ts`,
`test/e2e/web-edge-cases.test.ts` case (e), `test/e2e/mobile-edge-cases.test.ts` case (d)) giả định
"token dùng lại lần hai luôn là replay" — giả định đúng trước D60, sai sau D60 (batch CAL0 phủ luôn
S0). Ba test này được sửa để phản ánh đúng ngữ nghĩa mới: commit lần hai (S0) bằng cùng token phải
**thành công**, chỉ commit lần ba (đã tiêu hết batch) mới là replay. `canonicalAuthority.test.ts`
còn thiếu fixture `Design/Content/interview-script/` (trước lane này `issuePromptCapability` chưa
bao giờ cần đọc script) — đã bổ sung `cpSync` giống khuôn `interviewApplicationServices.test.ts`.

`npx vitest run src/core/turnCapability.test.ts src/core/advanceState.test.ts
src/core/computeBatch.test.ts src/core/interviewApplicationServices.test.ts
src/core/canonicalAuthority.test.ts test/e2e/web-edge-cases.test.ts
test/e2e/mobile-edge-cases.test.ts` = 5+12+12+15+7+5+4 = 60/60 pass. `npm run typecheck` xanh. Sau
`build:bundle`, `npx vitest run` toàn repo = 136/137 file (1 flaky, xác nhận pass khi chạy riêng —
`installer-interrupted.test.ts`, không liên quan lane này), 1061 pass / 2 skip.
