# Contract — B24c-1 `multi_select`: schema + hàm derive văn xuôi

> Tầng: Lõi.
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24c), [D61](../../../../DecisionLog.md). Phụ thuộc: không (chạy song song B24a/B24b).

## 1. Micro-task target

Cho câu hỏi khai được `multi_select: boolean` (additive, mặc định `false`), với hai luật máy-check
chặn CAL0/S7 ở tầng schema (không chỉ ở tầng test), và một hàm `deriveMultiAnswerText` nối văn xuôi
nhiều lựa chọn — giữ đúng D58 (không bao giờ commit `value` thô).

## 2. Scope

**In scope**

- `questionSchema` ([interviewScript.ts](../../../../../src/core/schemas/interviewScript.ts))
  thêm `multi_select: z.boolean().optional()` **vào trong object gốc** (không thể `.extend()` từ
  ngoài — export đã bị bọc `.superRefine`/`.refine` thành `ZodEffects`).
- `superRefine` thêm hai luật: (1) `multi_select === true` bắt buộc có `options` hoặc
  `option_hints`; (2) `multi_select === true` cấm `recommendation.mode === 'fixed'` — tự động chặn
  CAL0/S7 (cả hai đều `fixed`) vì engine cần đúng một token cho `--calibrate`/`--branch`.
- `deriveMultiAnswerText(options)` mới cạnh `deriveAnswerText`
  ([interactionChoices.ts](../../../../../src/core/interactionChoices.ts)) —
  `options.map(deriveAnswerText).join('; ')`.
- `QuestionInteraction` (`static`/`hints`) thêm field `multiSelect: boolean`, đọc từ
  `question.multi_select ?? false`. `buildQuestionCard` mang theo qua `interaction`, không cần sửa
  gì thêm (đã đọc từ `resolveQuestionInteraction`).

**Out of scope**

- Không bật `multi_select: true` trên bất kỳ câu nào trong `script.yaml` — đó là B24c-2.
- Không đổi `commit --answer` để nhận mảng — commit vẫn nhận một chuỗi văn xuôi duy nhất (đã nối
  sẵn bởi caller qua `deriveMultiAnswerText`), giữ nguyên `answers: Record<string, string>`.
- Không đổi `render-inject.ts`/SKILL.md để hiển thị multi-select cho agent — đó là B24d.

## 3. Checklist

- [x] `multi_select: true` trên câu không có `options` lẫn `option_hints` → schema reject.
- [x] `multi_select: true` trên câu có `option_hints` → schema accept.
- [x] `multi_select: true` trên câu có `options` + `recommendation: {mode: contextual}` → accept.
- [x] `multi_select: true` trên câu có `options` + `recommendation: {mode: fixed, ...}` (đúng shape
      CAL0/S7) → schema reject.
- [x] `multi_select: false` luôn được chấp nhận, kể cả trên câu `fixed`.
- [x] `deriveMultiAnswerText([a, b])` = `"${deriveAnswerText(a)}; ${deriveAnswerText(b)}"`, không
      chứa `value` thô.
- [x] `deriveMultiAnswerText([single])` thu về đúng `deriveAnswerText(single)`.
- [x] `resolveQuestionInteraction` cho câu có `multi_select: true` trong script thật (S1) →
      `interaction.multiSelect === true`; cho CAL0/S7 → `false`.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/interviewScript.ts` — field `multi_select` + 2 luật `superRefine`,
  ~20 dòng.
- [NEW] `src/core/schemas/interviewScript.test.ts` — 6 case, ~85 dòng.
- [MODIFY] `src/core/interactionChoices.ts` — `deriveMultiAnswerText` + `multiSelect` trên
  `QuestionInteraction`, ~20 dòng.
- [NEW] `src/core/interactionChoices.test.ts` — 7 case, ~65 dòng.
- [MODIFY] `src/core/index.ts` — export `deriveMultiAnswerText`.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| `multi_select` bị âm thầm bỏ qua vì zod mặc định `strip` mode | Thấp (đã xử lý) | Field khai tường minh trong object gốc — không phải property lạ bị strip; test xác nhận `result.data.multi_select` giữ nguyên giá trị đã set. |
| CAL0/S7 lọt qua kiểm tra chỉ vì content quên đặt `multi_select` | Không áp dụng | Ràng buộc là **cấm**, không phải theo nội dung — luật 2 chặn bất kỳ câu `fixed` nào khai `multi_select: true`, độc lập với content thật. |

## 6. Verification plan

```bash
npx vitest run src/core/schemas/interviewScript.test.ts src/core/interactionChoices.test.ts
npm run typecheck
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 4, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/schemas/interviewScript.test.ts src/core/interactionChoices.test.ts` =
6 + 7 = 13/13 pass. `npm run typecheck` xanh.
