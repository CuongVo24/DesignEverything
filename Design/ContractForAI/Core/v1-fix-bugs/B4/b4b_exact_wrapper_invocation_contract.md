# B4b — Exact Claude wrapper invocation contract

## 1. Micro-task target

Xóa bypass “command có chứa adapter/claude-code/cli.mjs thì allow” và chỉ công nhận đúng launcher, argv, subcommand và state-authorized operation.

## 2. Scope

### In scope

- adapter/claude-code/hooks/pre-tool-use.mjs command handling.
- Exact runtime launcher identity.
- Compound/nested command rejection.

### Out of scope

- General shell classifier; thuộc B2b.
- CLI subcommand behavior; thuộc B4c.

## 3. Implementation checklist

- [x] Bỏ regex/substring includes cho cli.mjs.
- [ ] Parse structured argv hoặc B2b result; command chỉ là CLI candidate khi có đúng một process, executable được phép và exact canonical launcher path từ install manifest.
- [ ] Reject suffix/prefix command, extra shell segment, redirect, pipe, chain, substitution và alternate file cùng basename.
- [ ] Verify launcher/runtime hash/version khớp install manifest trước khi dispatch.
- [ ] Không blanket allow mọi subcommand; map status/commit/emit/validate/deepen/recovery vào Core authorization theo current state.
- [ ] commit/emit/deepen phải mang capability/internal operation context hợp lệ.
- [ ] Diagnostics read-only không được dùng flag làm mutation.
- [ ] Wrapper parse/manifest error trả deny + reason code, không exit allow.
- [ ] Preserve stdin/stdout Claude protocol và exit semantics rõ ràng.

## 4. Interfaces / Files expected to change

- [MODIFY] adapter/claude-code/hooks/pre-tool-use.mjs.
- [NEW] adapter/claude-code/hooks/resolve-cli-invocation.mjs — giữ dưới 200 dòng.
- [MODIFY] adapter/claude-code/hooks/hook-utils.mjs nếu có.
- [NEW] adapter/claude-code/hooks/pre-tool-use.wrapper.test.ts.

Interface đích:

- resolveCliInvocation(event, installManifest, commandClassification) → exact operation | not-cli | rejection
- authorizeCliOperation(operation, runtimeSnapshot) → Core decision

## 5. Risks & mitigations

- Quote/path có space trên Windows: canonical argv fixtures và không split raw bằng whitespace.
- Node executable nhiều đường dẫn: allow identity theo packaged launcher, không theo node basename.
- Dev workflow chạy CLI repo: dev manifest/profile explicit, không nới production rule.

## 6. Verification plan

- Exact launcher + safe subcommand pass tới Core; mọi biến thể substring đều không bypass.
- Negative: echo cli path, node cli && mutation, copied cli basename, quoted suffix, redirect, PowerShell nested command.
- Tamper launcher/runtime hash bị deny.
- Wrong-state commit/emit/deepen bị Core deny dù invocation exact.
- Protocol snapshot cho allow/deny không in secret capability.

## 7. Status

Spec: APPROVED | Implementation: PARTIAL | Proof: SEAM_PARTIAL

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. Bug X18/CLI-launcher-path — hook từng chỉ nhận diện literal đường dẫn dev-mode
(`adapter/claude-code/cli.mjs`), khiến target đã cài tự deny lệnh CLI tuyệt đối chính SKILL.md của
nó dạy — đã FIXED (0f9945b) và có test `cli-invocation-recognition.test.ts`. X03 (wrapper allow
command chỉ vì chứa substring adapter CLI) vẫn PARTIAL — Core còn `includes('cli.mjs')`.

Cập nhật 2026-08-05 (A1-P8, sửa ghi chú sai lệch, không phải implementation mới): dòng trên "Core
còn `includes('cli.mjs')`" đã **sai** kể từ 2026-07-26 — commit `561a543` thay
`request.command_argv.includes('cli.mjs')` bằng `isCliInvocation()` (khớp chính xác `node <cli.mjs|
cli.js>` là script argument, xem `src/core/preAction/shared.ts` sau A1-P8 split), tức là *trước* ngày
ghi chú 2026-07-30 ở trên chứ không phải sau. finding-coverage-matrix.md đã ghi X03 = `FIXED` đúng
(dòng 33, ref `014b6ff`); chỉ riêng ghi chú trong contract này bị trôi khỏi cả code lẫn matrix. Checklist
item "Bỏ regex/substring includes cho cli.mjs" CLOSED, khớp code + matrix hiện tại. `adapter/claude-code/
hooks/resolve-cli-invocation.mjs:129` vẫn còn `tokens[0].includes('cli.mjs')`, nhưng đó chỉ để chọn token
nào kiểm tra tiếp — quyết định allow/deny thật nằm ở exact-match `isExactCliPath` (dòng 147-148) sau đó,
không phải bypass. Checklist item 2 ("...exact canonical launcher path từ install manifest") CHƯA
CLOSED: `resolveCliLauncherPath()` (`_shared.mjs:37`) suy ra đường dẫn launcher từ vị trí hook trên đĩa
(kiểm tra `SIBLING_BUNDLE` tồn tại), không đọc trực tiếp từ `install-manifest.json`'s declared launcher
path — an toàn về mặt thực tế (khớp binary thật đang chạy) nhưng không đúng nghĩa đen "từ install
manifest" của checklist. B4b giữ PARTIAL.
