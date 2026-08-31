# Contract — H4 trả question card về `status`, một nguồn dữ liệu cho cả hai bề mặt

> Tầng: Lõi + Adapter (một đơn vị triển khai được xuyên hai file cùng đọc chung một hàm Core mới —
> tách rời sẽ để lại một nửa vô nghĩa; xem §7 tiền lệ dual-layer ở lane trước).
> Nguồn: phiên test thật đầu tiên của lane 8.1 — câu đầu tiên sau `init` luôn bị hỏi mù vì
> `status --json` không mang `ask`/`options`/`recommendation`. Phụ thuộc: không.

## 1. Micro-task target

Cho `status --json` trả về đúng dữ liệu câu hỏi hiện tại (`ask`, `default`, `target_doc`,
`translate_back`, `interaction`, `critic`) mà trước đó chỉ `UserPromptSubmit` mới có — qua một hàm
Core duy nhất mà cả `render-inject.ts` (Claude Code) và `status.ts` (mọi adapter) cùng gọi, để hai
bề mặt không thể lệch nhau (D53).

## 2. Scope

**In scope**

- `buildQuestionCard(currentStepId, script, committedAnswers)` mới trong Core — trả `QuestionCard`:
  `id, kind, ask, default, target_doc, translate_back, interaction` (từ `resolveQuestionInteraction`
  sẵn có), `critic`.
- `render-inject.ts` — render từ card đó thay vì tự đọc `question`/`critics` trực tiếp.
- `cliOps/status.ts` — nhánh mid-interview mới (`!execState && progress.current_step !== null`):
  build card, trả `data.questionCard`; đồng thời sửa `nextStepCard` để trỏ đúng trạng thái
  `'interview'` (state mới trong `NextStepCard`) thay vì rơi vào `renderNextStep(null, null, null)`
  → luôn ra `'needs-profile'` sai.

**Out of scope**

- Không đổi nội dung câu hỏi, `translate_back`, hay thứ tự câu.
- Không đổi `resolveQuestionInteraction`/`deriveAnswerText` — dùng nguyên như đã có.

## 3. Checklist

- [x] `buildQuestionCard(null, script)` → `null`.
- [x] `buildQuestionCard('CAL0', script)` → card có `interaction.kind: 'static'`,
      `interaction.recommendation.mode: 'fixed'`, `interaction.recommendation.value: 'fast'`.
- [x] `status --json` trên workspace vừa `init` → `data.questionCard.ask` khớp CAL0,
      `data.questionCard.interaction.recommendation.value === 'fast'`.
- [x] `render-inject.ts` build ra cùng `ask`/`options`/`translate_back` như `status --json` cho
      cùng `current_step` (chứng minh gián tiếp: cả hai gọi chung `buildQuestionCard`).
- [x] `NextStepCard.state` có thêm `'interview'`, không phá vỡ các state cũ.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/buildQuestionCard.ts` — `QuestionCard` interface + hàm, ~55 dòng.
- [MODIFY] `src/core/index.ts` — export `buildQuestionCard`, `QuestionCard`, ~2 dòng.
- [MODIFY] `src/adapters/claude/skill/render-inject.ts` — build/dùng card thay vì tự tra script,
  ~44 dòng đổi.
- [MODIFY] `src/adapters/shared/cliOps/status.ts` — nhánh mid-interview mới, ~55 dòng thêm.
- [MODIFY] `src/adapters/shared/cliOps/status.test.ts` — case cho `questionCard`, ~mới hoàn toàn.
- [MODIFY] `src/adapters/shared/renderNextStep.ts` — thêm `'interview'` vào union `state`, ~8 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Hai bề mặt (inject vs status) đọc hai hàm khác nhau, âm thầm lệch dữ liệu theo thời gian | Cao nếu không sửa | Chính là lý do gộp — cả hai giờ gọi cùng `buildQuestionCard`, không đường nào tự suy diễn lại. |
| `buildQuestionCard` throw khi `current_step` không khớp câu nào trong script (script hỏng) | Thấp | `status.ts` bọc try/catch, fallback về `renderNextStep(null, execState, null)` — không sập cả lệnh `status`. |

## 6. Verification plan

```bash
npx vitest run src/adapters/shared/cliOps/status.test.ts src/core/index.test.ts
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/adapters/shared/cliOps/status.test.ts` = 3/3 pass. Xác nhận e2e qua H5
(`init --json` trên workspace thật rồi gọi hook/cli thật). `npm run typecheck` xanh — không nơi
nào khác trong repo còn tự đọc `resolveQuestionInteraction`/`script.critics` song song với
`buildQuestionCard` cho cùng mục đích hiển thị câu hỏi.
