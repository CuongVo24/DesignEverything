# Contract — H5 test tại đúng chỗ đang vỡ: real hook processes, không in-process

> Tầng: QA.
> Nguồn: bộ test hiện tại xanh vì gọi Core in-process (TypeScript function calls); chỗ thật sự vỡ
> trong phiên test đầu tiên nằm ở ranh giới Core↔host — `.mjs` hook script Claude Code thật sự
> spawn. Phụ thuộc: H1, H2, H3 (test này là bằng chứng cho cả ba).

## 1. Micro-task target

Spawn thật `pre-tool-use.mjs`/`cli.mjs` như child process bằng stdin JSON đúng shape Claude Code
gửi, trên một workspace vừa được `install.mjs` thật tạo ra — chứng minh H1/H2/H3 đúng ở đúng ranh
giới đã vỡ trong phiên test thật, không chỉ đúng khi gọi hàm TypeScript trực tiếp.

## 2. Scope

**In scope**

- Helper `installFreshTarget()` — chạy `install.mjs` thật vào một thư mục tmp, đọc
  `install-manifest.json` để lấy đường dẫn runtime thật (`cli.mjs`, `hooks/pre-tool-use.mjs`).
- Helper `runHook()` — spawn `pre-tool-use.mjs` bằng `execFileSync`, truyền `cwd` + stdin JSON
  (`tool_name`, `tool_input`), parse stdout (rỗng = allow, JSON = deny).
- 4 ca bắt buộc: (a) `init` không bị deny trên workspace `install.mjs` vừa tạo (H1); (b) lệnh
  PowerShell ghi file bị deny khi đang phỏng vấn (H3); (c) ghi
  `Design/.interview/slots-<qid>.json` được allow (H2); (c-contrast) ghi
  `Design/.interview/answers.json` trực tiếp vẫn deny.

**Out of scope**

- Không test `UserPromptSubmit`/`SessionStart` hook thật (nằm ngoài phạm vi bốn lỗi H1-H3 đang xác
  minh) — để lane khác nếu cần.
- Không thay thế bộ test in-process hiện có — bổ sung một tầng test mới, không xoá tầng cũ.

## 3. Checklist

- [x] (a) `init --json` trên workspace `install.mjs` vừa tạo, chưa có canonical store → hook không
      deny (stdout rỗng).
- [x] (b) `tool_name: 'PowerShell'`, lệnh `Set-Content` ghi file, giữa phỏng vấn → hook deny.
- [x] (c) `Write` vào `Design/.interview/slots-CAL0.json` → hook không deny.
- [x] (c-contrast) `Write` vào `Design/.interview/answers.json` → hook deny.

## 4. Interfaces / Files expected to change

- [NEW] `test/integration/installed-runtime/hook-seam.test.ts` — 4 test case + 2 helper, ~135 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Test chậm (spawn process + install thật mỗi lần) | Thấp | `beforeAll`/`afterAll` dùng chung một workspace cho nhóm case (b)/(c)/(c-contrast); chỉ case (a) cần workspace riêng vì test đúng trạng thái "chưa init". |
| Test phụ thuộc thứ tự build runtime bundle | TB | Gọi thẳng `install.mjs` thật (không mock), giống hệt cách CI/dev build đã xác nhận qua `runtime-bundle.test.ts` — nếu bundle hỏng, test này tự nhiên phát hiện sớm hơn field session. |

## 6. Verification plan

```bash
npx vitest run test/integration/installed-runtime/hook-seam.test.ts
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run test/integration/installed-runtime/hook-seam.test.ts` = 4/4 pass, ~7.3s. Đây là
test đầu tiên trong repo spawn `pre-tool-use.mjs` như một process thật thay vì gọi
`evaluatePreAction` in-process — xác nhận cả ba bản vá H1/H2/H3 sống sót qua đúng ranh giới đã vỡ
trong phiên test thật.
