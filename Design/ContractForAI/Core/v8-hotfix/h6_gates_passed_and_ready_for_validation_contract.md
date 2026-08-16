# Contract — H6 `gates_passed` không bao giờ được ghi + `emit` không bao giờ reachable

> Tầng: Lõi.
> Nguồn: phát hiện khi đi tay trọn một nhánh `cli` qua CLI thật (không phải test in-process) —
> `emit` không bao giờ chạy được qua một interview thật, dù mọi câu đã trả lời đủ. Phụ thuộc: không.

## 1. Micro-task target

Cho `commitStep` (1) thực sự ghi `question.gate` vào `gates_passed` khi câu đó khai gate (S3 →
`scope-locked`), và (2) đánh giá "đã đủ tài liệu" dựa trên `answered` (cái commit flow thực sự ghi)
thay vì `emitted_docs` (cái chỉ `emit` mới ghi, sau khi đã chạy) — hai lỗi cùng nằm trong
`commitStep`, cùng tạo thành một vòng khoá kín: `emit` cần `ready-for-validation`, cần
`emitted_docs`, mà chỉ `emit` mới ghi `emitted_docs`.

## 2. Scope

**In scope**

- `commitStep` bước 3b (mới) — sau khi push `currentStepId` vào `answered`, nếu câu đó khai
  `gate` và gate đó chưa có trong `gates_passed` → push vào.
- `commitStep` bước 6 (sửa) — khi `nextStepId === null`: `hasAllDocs` tính từ
  `requiredDocQuestions.every(q => nextProgress.answered.includes(q.id))` thay vì
  `requiredDocs` đối chiếu `emitted_docs`.

**Out of scope**

- Không đổi ý nghĩa của `emitted_docs` — nó vẫn chỉ được `emit` ghi, dùng cho mục đích khác (theo
  dõi doc đã sinh ra thật).
- Không đổi `emit.ts`/`emitTier1.ts` — chỉ sửa phía tạo điều kiện để chúng reachable.

## 3. Checklist

- [x] Commit S3 (khai `gate: scope-locked`) qua real commit flow (không hand-seed) →
      `gates_passed` chứa `scope-locked` ngay sau commit đó.
- [x] Commit lại S4, S5 (không khai gate) → `gates_passed` không bị nhân đôi entry.
- [x] Đi trọn một nhánh `cli` thật (`CAL0...S7(cli)...C5`), không hand-seed `gates_passed`/
      `emitted_docs` ở đâu cả → commit câu cuối (`C5`) → `phase === 'ready-for-validation'` ngay,
      `emitted_docs` vẫn `[]` (emit thật sự chưa chạy).
- [x] Trường hợp một gate declared nhưng không được ghi (store hỏng/sửa tay) vẫn còn đường:
      `gates_passed = []` giả lập → phase rơi về `docs-emitted`, không crash.
- [x] `newbie-shapes.test.ts` (4 shape: web/mobile/cli/hybrid) đi hết interview thật → phase
      `ready-for-validation` (trước đây kỳ vọng sai `docs-emitted`, giờ sửa lại đúng).

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/advanceState.ts` — bước 3b mới (~17 dòng) + đổi `hasAllDocs` bước 6
  (~28 dòng, phần lớn là comment giải thích vòng khoá kín).
- [MODIFY] `src/core/advanceState.test.ts` — viết lại 1 test cũ + thêm 2 test mới (H6/H7), ~95 dòng.
- [MODIFY] `test/journey/newbie-shapes.test.ts` — sửa assertion phase kỳ vọng, ~12 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Đổi tiêu chí `hasAllDocs` làm phase advance sớm hơn ý định thiết kế | TB | Vòng eligibility-loop ở bước 5 đã đảm bảo mọi câu branch-compatible + dependency-satisfied đều nằm trong `answered` tại đúng thời điểm `nextStepId` về `null` — tiêu chí mới hỏi đúng câu hỏi commit flow trả lời được, không nới lỏng gì thêm. |
| Test cũ dựa vào hand-seed `emitted_docs`/`gates_passed` để đạt `ready-for-validation` không còn cần thiết | Thấp | Giữ nguyên một nhánh test mô phỏng gate thiếu (`docs-emitted` vẫn đạt được khi cố tình xoá `gates_passed`) — chứng minh nhánh cũ không chết hẳn, chỉ không còn là đường duy nhất. |

## 6. Verification plan

```bash
npx vitest run src/core/advanceState.test.ts test/journey/newbie-shapes.test.ts
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/advanceState.test.ts test/journey/newbie-shapes.test.ts` = 17/17 pass
(12 + 5). Đây là lỗi có ảnh hưởng lớn nhất trong đợt: trước bản vá này, **không có đường thật nào**
(chỉ test hand-seed) từng đi tới `emit` được — `npx vitest run` toàn repo = 135 file / 1040 pass /
2 skip, `npm run typecheck` xanh.
