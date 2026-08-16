# Contract — B24f QA: invariants xuyên B24a-e + viết lại turn-count đo lượt thật

> Tầng: QA.
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24f). Phụ thuộc: B24a, B24b, B24c, B24d, B24e (đóng lane).

## 1. Micro-task target

Phủ các bất biến xuyên suốt lane 8.2 bằng test chạy trên script.yaml thật + state machine thật
(không fixture giả định), và viết lại `interactive-cards-turn-count.test.ts` để đếm **ranh giới
lượt thật** (số lần `issueTurnCapability` phải phát cho một batch mới) thay vì con số 32/5/84% đã
bị D59 làm mất cơ sở.

## 2. Scope

**In scope**

- `src/core/interviewCadenceInvariants.test.ts` mới:
  - `multi_select` không bao giờ `true` trên CAL0/S7, quét toàn bộ script thật (không chỉ hai id
    cụ thể — quét mọi câu có `recommendation.mode: 'fixed'`).
  - `computeBatch` không vượt ranh giới nhánh, không đưa câu có `option_hints`/critic vào giữa
    batch (chỉ được là head), trần ≤4, S7 luôn chốt batch — đi hết **cả 4 nhánh** (web/mobile/cli/
    hybrid) bằng một vòng lặp thật gọi `computeBatch`+`selectNextStep` liên tiếp, không phải case
    rời rạc.
  - Guard token theo batch: commit câu thứ hai sau khi revision bump → allow; replay câu đã tiêu
    trong batch → `TURN_CAPABILITY_REPLAY`; commit câu ngoài `question_ids` →
    `TURN_CAPABILITY_WRONG_QUESTION`.
  - Regression checksum: viết tay một `pending_turn_capability` đúng shape **trước** B24b (không có
    `question_ids`/`consumed_question_ids`) vào canonical store thật qua `transactInterviewStore`,
    xác nhận `loadInterviewStore` đọc lại không `CHECKSUM_MISMATCH`.
- Viết lại `test/journey/interactive-cards-turn-count.test.ts`: một lượt = một `issueTurnCapability`
  cho một batch (`computeBatch`), đi hết cả hành trình web lẫn cli canonical, so batch thực tế với
  batch chiếu trong `InterviewCadencePlan.md`.
- Cập nhật `v8.1-release-note.md`: nghỉ hưu số 32/5/84% (mô tả thẻ xác nhận dịch ngược đã bị D59 gỡ
  bỏ), thay bằng số turn/batch 16→10 (38%) đo ở tầng Core — kèm cảnh báo tường minh: đây là số đo
  cơ chế Core, **chưa xác nhận** bằng phiên thật (vẫn phụ thuộc R-spike).
- `Design/RoadMap/evidence/interactive-cards-turn-count-report.md` — thêm banner superseded, giữ
  nguyên nội dung làm hồ sơ lịch sử.
- `Design/RoadMap/evidence/interview-cadence-turn-count-report.md` mới — báo cáo đo turn/batch thay
  thế, cùng khuôn với báo cáo cũ.
- `InteractiveQuestionCardsPlan.md` — thêm dòng superseded ở đầu, không viết lại toàn bộ.
- Sửa 2 lint error tồn đọng từ Đợt 1 (H6/H7 commit) phát hiện khi chạy `npm run lint` toàn repo lần
  cuối của lane này — không liên quan trực tiếp B24 nhưng nằm trong phạm vi "verification xanh
  toàn repo" của contract.

**Out of scope**

- Không chạy R-spike thật — vẫn treo, chỉ ghi rõ trong release note đây là số đo Core, không phải
  số đo phiên thật.
- Không đổi `golden-web.test.ts`/`golden-mobile.test.ts` — không đo lượt, ngoài phạm vi B22e/B24f
  từ đầu.

## 3. Checklist

- [x] `multi_select` không `true` trên bất kỳ câu `recommendation.mode: 'fixed'` nào trong script
      thật (không chỉ CAL0/S7 — quét toàn bộ).
- [x] Đi hết cả 4 nhánh (web/mobile/cli/hybrid) bằng `computeBatch` thật: mọi batch ≤4, không vượt
      branch, S7 luôn ở cuối batch nếu có mặt, câu `option_hints`/critic chỉ xuất hiện làm head.
- [x] Batch token: allow-giữa-batch, replay-trong-batch, wrong-question-ngoài-batch — cả ba đường
      đều có test riêng.
- [x] Store fixture viết tay theo shape pre-B24b đọc lại không `CHECKSUM_MISMATCH`.
- [x] `interactive-cards-turn-count.test.ts` đếm đúng 10 batch cho cả web và cli (16 câu mỗi
      nhánh), khớp batch chiếu trong `InterviewCadencePlan.md` §5.
- [x] `v8.1-release-note.md` không còn khẳng định "84% reduction" như số hiện hành — đánh dấu
      nghỉ hưu, số thay thế có cảnh báo phụ thuộc R-spike.
- [x] `npm run lint` xanh toàn repo.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/interviewCadenceInvariants.test.ts` — 10 case, ~190 dòng.
- [MODIFY] `test/journey/interactive-cards-turn-count.test.ts` — viết lại hoàn toàn, ~150 dòng.
- [MODIFY] `Design/RoadMap/v8.1-release-note.md` — Evidence section viết lại, ~45 dòng.
- [MODIFY] `Design/RoadMap/evidence/interactive-cards-turn-count-report.md` — banner superseded,
  ~6 dòng.
- [NEW] `Design/RoadMap/evidence/interview-cadence-turn-count-report.md` — ~55 dòng.
- [MODIFY] `Design/RoadMap/InteractiveQuestionCardsPlan.md` — banner superseded, ~5 dòng.
- [MODIFY] `src/core/advanceState.test.ts` — sửa 2 lint error (`no-unused-vars`) không liên quan
  logic, chỉ đổi `for...of` vô dụng thành `for (let i...)`.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Con số turn mới (38%) bị đọc nhầm là số đo phiên thật, lặp lại đúng lỗi mà 84% từng mắc (số mô hình hoá tưởng là số đo) | Cao nếu không cảnh báo | Cả `v8.1-release-note.md` lẫn báo cáo evidence mới đều nói rõ: đây là số đo **Core**, phụ thuộc giả định "gọi `status --json` giữa batch không cần `UserPromptSubmit` mới" — đúng câu hỏi R-spike đang treo, chưa xác nhận bằng phiên thật. |
| Test invariant đi 4 nhánh có thể che giấu lỗi vì guard `guard > 40` quá lỏng | Thấp | 40 là biên an toàn xa so với 16 câu/nhánh thật — nếu vòng lặp không hội tụ (bug thật ở `selectNextStep`), test throw rõ ràng thay vì treo mãi. |
| Sửa lint error ở `advanceState.test.ts` vô tình đổi số lần commit thật | Thấp | Đổi `for...of` thành `for (let i...)` giữ nguyên đúng số vòng lặp (8 và 6) — xác nhận lại bằng chạy test, không chỉ đọc code. |

## 6. Verification plan

```bash
npx vitest run src/core/interviewCadenceInvariants.test.ts test/journey/interactive-cards-turn-count.test.ts src/core/advanceState.test.ts
npm run lint
npm run typecheck
npm run build:bundle && npx vitest run
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 7, nhánh `codex/lane-8-1-interactive-cards`). Đóng lane
`v8-expansion` B24a-B24f — 8/8 contract DONE (B24a, B24b, B24c-1, B24c-2, B24d, B24e, B24f).

`npx vitest run src/core/interviewCadenceInvariants.test.ts
test/journey/interactive-cards-turn-count.test.ts src/core/advanceState.test.ts` = 10 + 5 + 12 =
27/27 pass. `npm run lint` xanh (2 lỗi tồn đọng từ Đợt 1 đã sửa). `npm run typecheck` xanh. Sau
`build:bundle`, `npx vitest run` toàn repo = **140 file / 1089 pass / 2 skip** — không hồi quy nào
qua cả 7 phase của lane này.

**Còn treo, chuyển giao cho chủ repo (ghi ở §"Verification" của
[InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md)):** R-spike thật (một phiên
Claude Code thật, trả lời một thẻ `AskUserQuestion`, xác nhận `UserPromptSubmit` có bắn không) —
hành động sống không tự động hoá được trong phiên đối chiếu tài liệu này, cùng lớp với Gate A3/B1
trong `MasterSequencingPlan.md`.
