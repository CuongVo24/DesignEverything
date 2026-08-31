# Contract — B24e đồng bộ degradation path: AGENTS.md + ConformanceMatrix

> Tầng: Adapter (degradation, bậc B theo [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md)).
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24e), [D37](../../../../DecisionLog.md). Phụ thuộc: B24a, B24b, B24c, B24d.

## 1. Micro-task target

Cho harness bậc B (Codex, Cursor, mọi thứ đọc `AGENTS.md`) nhận đúng prose mô tả nhịp mới (batch,
commit-trước-dịch-ngược-sau, `multi_select`), và công bố đúng mức chênh lệch enforcement: Claude
Code có `checkRate`/token thật ép batch; AGENTS.md chỉ có chỉ dẫn best-effort, không có cơ chế nào
tương đương.

## 2. Scope

**In scope**

- `generateAgentsMd.ts` §3 ("Cách hỏi từng bước") — viết lại theo D59/D60: ghi nhận ngay rồi dịch
  ngược, không chặn trước; batch là chỉ dẫn best-effort (không có `checkRate` ép). Disclaimer nhịp
  độ (blockquote cuối §3) cập nhật cùng tinh thần.
- `generateAgentsMd.ts` §3a (catalog `options`/`option_hints`) — mỗi câu có `multi_select: true`
  thêm ghi chú degradation: chấp nhận nhiều lựa chọn, nối bằng `"; "` (khớp `deriveMultiAnswerText`
  ở Core, không tự nối kiểu khác).
- `Design/Adapters/generated/AGENTS.sample.md` — regenerate qua
  `REGENERATE_ARTIFACTS=1 npx vitest run ...artifact.test.ts`, không sửa tay.
- `ConformanceMatrix.md` — cột `interactive_choice` đổi tên `(8.1)` → `(8.1–8.2)`, nội dung ô Claude
  Code/AGENTS.md nêu rõ batch/`multi_select`/`undo` và mức enforcement khác nhau (Claude Code: thật,
  ép bằng `turnCapability.ts`/`checkRate`; AGENTS.md: prose, không có cơ chế); đoạn giải thích dưới
  bảng cập nhật theo D59/D60/D61; thêm mục `## Trạng thái v8.1.0 / v8.1.1 / v8.2.0` ở cuối file.

**Out of scope**

- Không đổi Codex pre/post-tool-use hook — chỉ đổi nội dung text sinh ra trong `AGENTS.md`.
- Không đổi `adapter/codex-plugin/skills/design-everything-build/SKILL.md` — file đó là Build &
  Verify (Tier-1 execution), không phủ nhịp phỏng vấn CAL0→W5; nhịp `deepen` (tầng 2, dòng 74) giữ
  nguyên "hỏi từng câu, dịch ngược + chờ xác nhận" — batch không áp cho deepen (đúng scope B24d).
- Không thêm hook/lệnh mới cho Codex — không có CLI invocation cụ thể nào trong
  `generateAgentsMd.ts` (nó chỉ sinh prose trừu tượng, không như `SKILL.md` của Claude Code).

## 3. Checklist

- [x] `generateAgentsMd()` §3 không còn câu "hỏi đúng một câu tại một thời điểm... luôn dịch ngược
      ... rồi hỏi xác nhận" — thay bằng ghi-nhận-trước/dịch-ngược-sau + batch best-effort.
- [x] Câu có `multi_select: true` trong catalog §3a có ghi chú "được chọn NHIỀU mục... nối bằng ;".
- [x] Câu không có `multi_select` không đổi output so với trước (regression — `generateAgentsMd.test.ts`
      test khác vẫn xanh).
- [x] `AGENTS.sample.md` regenerate khớp `generateAgentsMd()` (artifact test tự xác nhận).
- [x] `ConformanceMatrix.md`: cột đổi tên, `check-matrix.mjs` (vocabulary/dependency-order linter)
      vẫn exit 0.
- [x] `## Trạng thái v8.1.0 / v8.1.1 / v8.2.0` mới ở cuối `ConformanceMatrix.md`, trỏ đúng
      `v8-hotfix/` (6/6 DONE) và `v8-expansion/B24/` (đang chạy).

## 4. Interfaces / Files expected to change

- [MODIFY] `src/adapters/agents/generateAgentsMd.ts` — §3 + catalog §3a, ~30 dòng.
- [MODIFY] `src/adapters/agents/generateAgentsMd.test.ts` — 1 assertion cập nhật theo text mới.
- [MODIFY] `Design/Adapters/generated/AGENTS.sample.md` — regenerate, không sửa tay (17 dòng thêm,
  9 dòng đổi).
- [MODIFY] `Design/Adapters/ConformanceMatrix.md` — bảng Ma trận + đoạn giải thích + mục trạng thái
  mới, ~25 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Đổi text §3 làm `generateAgentsMd.test.ts` vỡ vì assertion cắt ngang dòng (template literal xuống dòng thật) | Thấp (đã bắt) | Chọn substring nằm trọn trên một dòng nguồn thay vì bắc qua line break — xác nhận lại bằng chạy test trước khi regen artifact. |
| Công bố sai mức enforcement, khiến người dùng tưởng AGENTS.md có cùng độ an toàn Claude Code | Cao nếu sai | Câu chữ tường minh: "harness này KHÔNG có checkRate/token multi-câu nào ép buộc" — không dùng ngôn ngữ mập mờ. |
| `check-matrix.mjs` linter chặn vocabulary lạ trong bảng mới thêm | Thấp | Chạy `node scripts/check-matrix.mjs` ngay sau khi sửa, xác nhận exit 0 trước khi coi DONE. |

## 6. Verification plan

```bash
npx vitest run src/adapters/agents/generateAgentsMd.test.ts src/adapters/agents/generateAgentsMd.artifact.test.ts
node scripts/check-matrix.mjs
npm run typecheck
npm run build:bundle && npx vitest run
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 6, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/adapters/agents/generateAgentsMd.test.ts
src/adapters/agents/generateAgentsMd.artifact.test.ts` = 5 + 1 = 6/6 pass.
`node scripts/check-matrix.mjs` → "finding matrix and contract dependency order OK." `npm run
typecheck` xanh. Sau `build:bundle`, `npx vitest run` toàn repo = 139/139 file, 1077 pass / 2 skip.
