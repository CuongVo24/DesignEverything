# Contract — H2 thông đường `--slots-file`: gate ghi khớp gate đọc

> Tầng: Lõi.
> Nguồn: phiên test thật đầu tiên của lane 8.1 — `--slots-file` emit ra `08-build-plan.md` với
> marker `⚠ unknown`. Phụ thuộc: không.

## 1. Micro-task target

Cho đúng một shape đường dẫn `Design/.interview/slots-<slug>.json` được phép ghi (gate ghi ở
`artifactOwnership.ts`), khớp với đúng shape mà `loadSlotsFile.ts` đã đọc — không đổi
`SLOTS_FILE_ROOT`, không nới lỏng vùng `.interview/` nói chung.

## 2. Scope

**In scope**

- `classifyArtifact` ([artifactOwnership.ts](../../../../src/core/artifactOwnership.ts)) — path
  khớp regex `^Design/\.interview/slots-[A-Za-z0-9_-]+\.json$` phân loại `interview-scratch` (kiểm
  **trước** nhánh engine-state substring hiện có, không thì luôn rơi vào engine-state trước khi
  chạm regex này).
- `authorizeMutation` nhánh `interview-scratch` — thêm nhánh riêng cho shape trên: allow, kiểm cỡ
  file qua `MAX_SCRATCH_WRITE_BYTES` sẵn có, KHÔNG áp `scratchContext` session/question match (file
  loại `slots-buildplan.json` sinh sau phỏng vấn không có một câu sở hữu duy nhất).
- `SKILL.md` — sửa câu sai "vùng này không bị gate chặn" thành tên đúng shape được phép.

**Out of scope**

- Không đổi `SLOTS_FILE_ROOT`/`loadSlotsFile.ts` (đọc) — chỉ sửa phía ghi cho khớp.
- Không cho phép file khác trong `.interview/` (`answers.json`, `deepen-answer-history.json`, …) —
  các file đó giữ nguyên `engine-state`, deny ghi trực tiếp.
- Không đổi schema nội dung slots-file (vẫn `Record<string, string>` phẳng, kiểm ở
  `loadSlotsFile.ts` lúc đọc).

## 3. Checklist

- [x] `classifyArtifact('Design/.interview/slots-S1.json')` → `interview-scratch`.
- [x] `classifyArtifact('Design/.interview/slots-buildplan.json')` → `interview-scratch`.
- [x] `classifyArtifact('Design/.interview/answers.json')` / `deepen-answer-history.json` →
      `engine-state` (không đổi).
- [x] `authorizeMutation('write', 'agent-host', 'Design/.interview/slots-S1.json')` → allow,
      `INTERVIEW_SLOTS_FILE_ALLOWED`.
- [x] `authorizeMutation` cho `slots-buildplan.json` với `scratchContext.questionId: null` → vẫn
      allow (không ràng buộc theo câu hỏi).
- [x] `authorizeMutation('write', ..., 'Design/.interview/answers.json')` → vẫn deny
      `PROTECTED_ARTIFACT_MUTATION_DENIED`.
- [x] Ghi vượt `MAX_SCRATCH_WRITE_BYTES` trên đúng shape slots-file → deny
      `SCRATCH_FILE_OVERSIZED`.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/artifactOwnership.ts` — hằng `SLOTS_FILE_PATTERN`, nhánh sớm trong
  `classifyArtifact`, nhánh riêng trong `authorizeMutation`, ~45 dòng.
- [MODIFY] `src/core/artifactOwnership.test.ts` — 6 case trong describe `H2`, ~44 dòng.
- [MODIFY] `adapter/claude-code/skill/SKILL.md` — sửa đoạn hướng dẫn `--slots-file`, nêu đúng shape
  regex thay vì tuyên bố sai "không bị gate chặn", ~7 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Regex quá lỏng, cho ghi file ngoài ý định (path traversal qua slug) | Thấp | `[A-Za-z0-9_-]+` không chứa `/` hay `..`, không thể thoát khỏi `Design/.interview/`. |
| Bỏ sót ràng buộc session/question khiến agent ghi đè slots-file của câu khác | Thấp | Nội dung vẫn bị `loadSlotsFile.ts` kiểm schema lúc đọc; đây là vùng nháp, không phải nguồn sự thật — nguồn sự thật vẫn là `answers[stepId]`/`slots` trong canonical store. |

## 6. Verification plan

```bash
npx vitest run src/core/artifactOwnership.test.ts
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/artifactOwnership.test.ts` = 49/49 pass (gồm 7 case H2 mới). Xác nhận
end-to-end qua H5 (hook-seam test case (c)/(c-contrast)): ghi thật `Design/.interview/slots-CAL0.json`
qua Write tool → hook không deny; ghi `answers.json` → vẫn deny.
