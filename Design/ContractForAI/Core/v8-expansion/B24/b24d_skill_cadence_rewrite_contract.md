# Contract — B24d viết lại nhịp lượt trong SKILL.md + render-inject.ts

> Tầng: Adapter (Claude).
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24d), [D59](../../../../DecisionLog.md)/[D60](../../../../DecisionLog.md)/[D61](../../../../DecisionLog.md).
> Phụ thuộc: B24a, B24b, B24c.

## 1. Micro-task target

Cho agent (Claude Code) đọc đúng nhịp lượt mới từ ngữ cảnh được inject và SKILL.md: bỏ bước thẻ
xác nhận dịch ngược chặn trước commit (D59), biết đọc và tuân thủ batch `question_ids` của token
(D60), đọc `multiSelect` từ card thay vì viết cứng `false` (D61), và biết dùng lệnh `undo`.

## 2. Scope

**In scope**

- `render-inject.ts` — capability section nêu rõ danh sách `question_ids` token bao phủ, hướng dẫn
  gọi `status --json` giữa các lần commit trong cùng batch (không cần `UserPromptSubmit` mới); 4
  quy tắc vàng viết lại đúng D59/D60; `multiSelect` đọc từ `interaction.multiSelect` thay vì viết
  cứng `false`; hướng dẫn nối nhiều `--answer` bằng `"; "` khi multi-select (khớp
  `deriveMultiAnswerText`); bỏ tiền điều kiện "chỉ commit SAU KHI xác nhận dịch ngược".
- `SKILL.md` — 4 quy tắc vàng viết lại (rule 1: batch, rule 3: commit trước/dịch ngược sau); xoá
  bước "Thẻ dịch ngược" (bước 3 cũ) khỏi mục thẻ tương tác, đánh số lại; `multiSelect = false` viết
  cứng → đọc từ card; gỡ mâu thuẫn "bắn ngay thẻ câu kế" ↔ "không giữ/prefetch qua lượt" (giải
  bằng: chỉ bắn thẻ câu kế nếu nó nằm trong batch đang cầm, qua `status --json`, không qua token
  mới); thêm mục "Hoàn tác — lệnh `undo`"; cập nhật "Điều cấm" theo nhịp batch.

**Out of scope**

- Không đổi nhịp `deepen` (tầng 2) — batch chỉ áp cho `operation_kind: 'interview'`
  ([turnCapability.ts](../../../../../src/core/turnCapability.ts)), deepen vẫn "hỏi từng câu và
  chờ xác nhận" như cũ.
- Không đổi nội dung câu hỏi/`translate_back`/thứ tự — chỉ đổi nhịp thu câu trả lời.
- Không đổi `generateAgentsMd.ts`/`AGENTS.sample.md` — đó là B24e.

## 3. Checklist

- [x] `render-inject.ts`: capability section nêu `question_ids` đầy đủ, hướng dẫn `status --json`
      giữa batch khi còn hơn 1 câu.
- [x] 4 quy tắc vàng trong `render-inject.ts` và `SKILL.md` khớp nội dung nhau (rule 1 = batch,
      rule 3 = commit-trước-dịch-ngược-sau, không còn "hỏi từng câu một"/"dịch ngược rồi mới commit").
- [x] `multiSelect` trong cả `render-inject.ts` (AskUserQuestion hướng dẫn) lẫn SKILL.md đọc từ
      `interaction.multiSelect`, không viết cứng `false`.
- [x] Không còn dòng nào trong SKILL.md nhắc "Thẻ dịch ngược" như bước chặn trước commit, hay
      3-lựa-chọn `Đúng rồi/Sửa lại/Giải thích thêm`.
- [x] SKILL.md dạy lệnh `undo --json` (subcommand mới trong `CLI_COMMAND_SURFACE` từ B24a) — bắt
      buộc theo [skill-truth.test.ts](../../../../../test/docs/skill-truth.test.ts).
- [x] `render-inject.test.ts` (14 case sẵn có) chạy lại xanh — không cần sửa test, chỉ sửa hàm; test
      "should NOT render Capability Token khi không có token" phát hiện một rò rỉ tham chiếu
      `[Capability Token]` trong text tĩnh (đã sửa: bỏ bracket-reference khỏi câu văn luôn render).
- [x] Critic-pass vẫn là ngoại lệ duy nhất chặn trước commit — không bị D59 xoá theo.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/adapters/claude/skill/render-inject.ts` — capability section, golden rules,
  hướng dẫn Skill, multiSelect, ~55 dòng đổi.
- [MODIFY] `adapter/claude-code/skill/SKILL.md` — 4 quy tắc vàng, nhịp commit, thẻ tương tác, mục
  `undo` mới, điều cấm, ~90 dòng đổi/thêm.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Text tĩnh (luôn render bất kể có token hay không) vô tình chứa chuỗi `[Capability Token` khiến test "no token → no section" fail dương tính giả | Thấp (đã bắt) | `render-inject.test.ts` bắt ngay lập tức; sửa bằng bỏ bracket-reference khỏi câu văn tĩnh, giữ nguyên ý nghĩa. |
| Agent hiểu nhầm "gọi status --json giữa batch" là cần user turn mới | TB | SKILL.md nói rõ "KHÔNG cần chờ người dùng gõ thêm — đây vẫn là cùng một lượt" ở cả nhịp commit lẫn thẻ tương tác. |
| Critic-pass vô tình bị cuốn theo "commit ngay" của D59 | Cao nếu xảy ra | Giữ nguyên tường minh: "Đây là ngoại lệ duy nhất vẫn chặn trước commit" — xuất hiện ở cả golden rule 3, mục thẻ tương tác bước 3, và mục "Câu đặc biệt". |

## 6. Verification plan

```bash
npx vitest run src/adapters/claude/skill/render-inject.test.ts test/docs/skill-truth.test.ts src/core/scriptOptionsInvariants.test.ts
npm run typecheck
npm run build:bundle && npx vitest run
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 5, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/adapters/claude/skill/render-inject.test.ts test/docs/skill-truth.test.ts
src/core/scriptOptionsInvariants.test.ts` = 14 + 39 + 6 = 59/59 pass (`skill-truth.test.ts` lên
37 → 39 test vì thêm 2 dòng `cli.mjs" undo` được dạy). `npm run typecheck` xanh. Sau
`build:bundle`, `npx vitest run` toàn repo = 139/139 file, 1077 pass / 2 skip.
