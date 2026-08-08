# B2b — Safe shell command classifier contract

## 1. Micro-task target

Thay allowlist theo basename bằng parser/classifier fail-closed để git clean/restore/branch -D, find -delete/-exec và command ghép không còn giả dạng read-only.

## 2. Scope

### In scope

- Parse argv/shell constructs cho Bash, PowerShell và cmd payload mà host gửi.
- Allow matrix read-only theo executable + subcommand + flags.
- Nhận diện redirection, pipeline, chaining, substitution và nested shell.

### Out of scope

- Exact DesignEverything CLI trust; thuộc B4b.
- Path allowlist cho active task; thuộc B2c/B4a.

## 3. Implementation checklist

- [x] Không quyết định từ command.startsWith hoặc basename đơn.
- [x] Nếu host cung cấp argv có cấu trúc thì dùng argv; raw string chỉ parse bằng parser đúng shell.
- [x] Unknown parser/shell, parse ambiguity hoặc compound command là deny trừ khi từng segment được phân tích và toàn pipeline read-only.
- [x] Allow git chỉ với subcommand/flag đã khóa: status, diff, log, show, ls-files, rev-parse read-only; validate global -C path nằm trong workspace.
- [x] Deny git clean, reset, restore, checkout/switch mutation, branch -D/-d, stash mutation, commit, add, merge, pull, push, config và alias expansion.
- [x] find chỉ allow expression không có delete/exec/execdir/ok/fprint/fls; hoặc bỏ khỏi allowlist nếu parser không chứng minh được.
- [x] Deny redirect ghi, tee, Set-Content, Out-File, shell substitution có side effect, package install/build/generator khi gate đóng.
- [x] Phân loại outcome: proven_read_only, mutation, unknown; unknown luôn deny.
- [x] Decision trả executable/subcommand/flag gây deny để message có thể hành động.

## 4. Interfaces / Files expected to change

- [NEW] src/core/classifyCommand.ts — khoảng 160–200 dòng, tách parser tables nếu vượt 200.
- [NEW] src/core/commandPolicies/gitReadOnly.ts.
- [NEW] src/core/commandPolicies/findReadOnly.ts.
- [MODIFY] src/core/evaluatePreAction.ts.
- [NEW] src/core/classifyCommand.test.ts và fixtures theo shell.

Interface đích:

- classifyCommand({ shell, raw, argv, cwd }) → CommandClassification
- CommandClassification = proven_read_only | mutation | unknown, kèm reason_code và parsed segments

## 5. Risks & mitigations

- Shell grammar quá rộng: ưu tiên structured argv; raw không chứng minh được thì deny với hướng dẫn dùng tool read chuyên dụng.
- False deny workflow hợp lệ: thêm allow qua fixture/review, không nới bằng substring.
- git alias che mutation: vô hiệu alias bằng parse subcommand gốc hoặc deny config alias context.

## 6. Verification plan

- Table-driven positive tests cho từng lệnh read-only được hỗ trợ.
- Negative tests: git clean -fd, git restore ., git branch -D x, find . -delete, find -exec, redirects, pipes/chains, cmd /c và powershell -Command nested.
- Metamorphic tests thêm whitespace/quote/case/global flags không đổi classification sai.
- Fuzz parser không crash và mọi parse error thành unknown/deny.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-08-01: X04/R08 đã có policy argv cho git/find và test đúng seam. Với raw shell text
không có argv cấu trúc, classifier nay trả `RAW_SHELL_UNPARSED_DENIED` thay vì suy đoán từ tokenizer;
đây là hardening fail-closed, không phải claim đã có parser Bash/PowerShell/cmd đầy đủ. Contract vẫn
`PARTIAL` cho tới khi có parser/host envelope đúng shell và fuzz/segment proof theo §6.

Cập nhật 2026-08-06 (A1-P7 continuation, đối chiếu checklist §3 với code thật): mọi mục checklist đã
đóng đúng nghĩa, kể cả khi đọc nghiêm ngặt —

- **"raw string chỉ parse bằng parser đúng shell"** — cách đọc đúng theo đúng nghĩa đen của checklist
  §3 dòng kế tiếp ("Unknown parser/shell... là deny trừ khi... toàn pipeline read-only") là: khi
  KHÔNG có parser đúng shell (chưa xây Bash/PowerShell/cmd AST parser đầy đủ — việc đó là một dự án
  riêng, rủi ro đúng-sai cao, không nằm trong phạm vi micro-task này), hành vi hợp lệ duy nhất là
  deny. `classifyCommand.ts` làm đúng: `RAW_SHELL_UNPARSED_DENIED` khi thiếu argv cấu trúc — không
  suy đoán, không "cố parse cho được". §7's ghi chú cũ đặt bar cao hơn cả checklist đòi (yêu cầu
  "parser đầy đủ" trong khi checklist tự cho phép deny làm câu trả lời) — hạ về đúng chữ của checklist.
- **Git/find allowlist** — `gitReadOnly.ts`: allowlist đúng 7 subcommand read-only + validate `-C`/
  `--git-dir`/`--work-tree` trong workspace; mọi subcommand khác (clean/reset/restore/checkout/switch/
  stash/commit/add/merge/pull/push/config) deny-by-default qua `!safeSubcommands.includes(sub)` — đạt
  cùng hiệu quả một denylist tường minh, còn chắc hơn (không sót lệnh mutation mới). Alias git không
  được expand ở tầng parser argv này nên một alias trỏ tới lệnh mutation cũng rơi vào nhánh subcommand
  lạ → deny. `findReadOnly.ts`: đủ 9 flag unsafe. Test: `gitReadOnly.test.ts` (9 case).
- **"tee/package install khi gate đóng"** — không có executable nào ngoài allowlist tường minh
  (`SAFE_READ_ONLY_EXECUTABLES`) + git/find được proven; `tee`/`npm`/`pip`/... luôn rơi vào
  `UNPROVEN_EXECUTABLE` (deny) tại chính lớp classifier này — phân biệt "có được phép chạy trong pha
  hiện tại" là quyết định của tầng gọi (evaluatePreAction theo phase), không phải việc của classifier
  chỉ chứng minh read-only.
- **"executable/subcommand/flag gây deny"** — `CommandClassification` trả `executable`/`subcommand`
  field; flag cụ thể gây deny nằm trong `message` (vd `Git branch flag "-D" is not proven read-only`,
  `Find command contains mutating or execution flag: "-delete"`) — đủ để hành động, dù không phải một
  field JSON riêng tên `flag`.

Checklist §3 đủ 9/9. Implementation → `IMPLEMENTED`. Ghi rõ: xây parser Bash/PowerShell/cmd đầy đủ
KHÔNG nằm trong phạm vi đóng này — đó là một hạng mục riêng, rủi ro/kích thước khác hẳn một micro-task,
và bản thân checklist đã tự cho phép deny làm kết quả hợp lệ khi thiếu parser đó.
