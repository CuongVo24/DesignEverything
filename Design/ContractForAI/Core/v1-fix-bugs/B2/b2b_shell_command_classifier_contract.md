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

- [ ] Không quyết định từ command.startsWith hoặc basename đơn.
- [ ] Nếu host cung cấp argv có cấu trúc thì dùng argv; raw string chỉ parse bằng parser đúng shell.
- [ ] Unknown parser/shell, parse ambiguity hoặc compound command là deny trừ khi từng segment được phân tích và toàn pipeline read-only.
- [ ] Allow git chỉ với subcommand/flag đã khóa: status, diff, log, show, ls-files, rev-parse read-only; validate global -C path nằm trong workspace.
- [ ] Deny git clean, reset, restore, checkout/switch mutation, branch -D/-d, stash mutation, commit, add, merge, pull, push, config và alias expansion.
- [ ] find chỉ allow expression không có delete/exec/execdir/ok/fprint/fls; hoặc bỏ khỏi allowlist nếu parser không chứng minh được.
- [ ] Deny redirect ghi, tee, Set-Content, Out-File, shell substitution có side effect, package install/build/generator khi gate đóng.
- [ ] Phân loại outcome: proven_read_only, mutation, unknown; unknown luôn deny.
- [ ] Decision trả executable/subcommand/flag gây deny để message có thể hành động.

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

WAITING_FOR_APPROVAL
