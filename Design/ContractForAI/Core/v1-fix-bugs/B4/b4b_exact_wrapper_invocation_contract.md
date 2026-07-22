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

- [ ] Bỏ regex/substring includes cho cli.mjs.
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

WAITING_FOR_APPROVAL
