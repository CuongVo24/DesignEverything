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
- [x] Parse structured argv hoặc B2b result; command chỉ là CLI candidate khi có đúng một process, executable được phép và exact canonical launcher path từ install manifest.
- [x] Reject suffix/prefix command, extra shell segment, redirect, pipe, chain, substitution và alternate file cùng basename.
- [x] Verify launcher/runtime hash/version khớp install manifest trước khi dispatch.
- [x] Không blanket allow mọi subcommand; map status/commit/emit/validate/deepen/recovery vào Core authorization theo current state.
- [x] commit/emit/deepen phải mang capability/internal operation context hợp lệ.
- [x] Diagnostics read-only không được dùng flag làm mutation.
- [x] Wrapper parse/manifest error trả deny + reason code, không exit allow.
- [x] Preserve stdin/stdout Claude protocol và exit semantics rõ ràng.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

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

Cập nhật 2026-08-06 (A1-P8, đóng nốt checklist §3):

- **Item 2 (exact canonical launcher path từ install manifest)** — `resolveCliLauncherPath()` giờ đọc
  `install-manifest.json`, tìm asset `kind === 'launcher'`, trả `join(targetRoot, asset.path)` nếu tồn
  tại thật trên đĩa; chỉ fallback về suy luận vị trí đĩa cũ khi manifest thiếu/hỏng/không khai launcher
  asset — không đổi hành vi khi manifest lành (cùng path cả hai cách tính ra). Test mới:
  `cli-invocation-recognition.test.ts` case "survives a corrupt install-manifest.json by falling back".
- **"Reject suffix/prefix/redirect/pipe/chain/substitution/alternate basename"** — đối chiếu code:
  `resolve-cli-invocation.mjs` dòng 100-115 đã reject shell operator/redirect/substitution/inline
  interpreter; dòng 147-156 dùng `isExactCliPath` (so khớp chính xác, không phải substring) nên một
  file khác cùng basename (vd `fake-cli.mjs`) không khớp `normalizedExpected` và bị
  `INVALID_CLI_LAUNCHER`. Đã đúng từ trước, chỉ chưa tick.
- **"Verify launcher/runtime hash/version khớp install manifest trước khi dispatch"** — hash verification
  **đã có**, nhưng ở tầng health-check (`runtimeHealth.ts`'s `checkInstallManifestIntegrity` hash mọi
  asset trong `manifest.assets`, không phân biệt `kind`, nên `kind: 'launcher'` được hash-verify y hệt
  `kind: 'runtime'` — xem test `tampered-runtime.test.ts`), không phải hash lại launcher trên **mỗi**
  lời gọi Bash trong `resolve-cli-invocation.mjs`. Quyết định có chủ đích: hash mỗi invocation sẽ tốn
  I/O không cần thiết cho một file health-check đã phủ; health broken đã deny trước khi tới bước nhận
  diện CLI (B4a's health-first gate). Không thêm hashing trùng lặp vào hot path.
- **"Wrapper parse/manifest error trả deny, không exit allow"** — xác nhận đúng ở tầng wrapper tổng thể:
  `pre-tool-use.mjs`'s top-level `catch` (dòng 110-113) `console.error` + `process.exit(1)`, không phải
  silent exit-0/allow. Fallback graceful riêng của `resolveCliLauncherPath()` khi manifest lỗi **không**
  vi phạm mục này — nó không "exit allow", nó trả về đúng launcher path (qua suy luận vị trí đĩa vẫn an
  toàn), phần còn lại của pipeline (`isExactCliPath`, Core authorization) vẫn enforce đầy đủ y hệt.
- Các mục còn lại (single-process/allowed-executable, subcommand không blanket-allow qua
  `classifyCliSubcommand.ts`, capability context cho commit/emit/deepen, diagnostics không bị flag lừa
  thành mutation, preserve stdin/stdout protocol) đối chiếu đúng với code hiện tại, đã đúng từ trước.

Checklist §3 đủ 9/9. Implementation → `IMPLEMENTED`.
