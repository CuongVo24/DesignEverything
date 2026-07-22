# B4c — CLI exit, output and health protocol contract

## 1. Micro-task target

Chuẩn hóa CLI để exit 0 chỉ khi operation pass, không nuốt corruption, không in sai path và mọi consumer nhận cùng machine-readable result.

## 2. Scope

### In scope

- Subcommand result envelope, exit code và stderr/stdout.
- status/next-step/validate/emit/deepen/recovery behavior.
- Exact emitted paths và consistency severity.

### Out of scope

- Shared runtime placement giữa adapters; thuộc B4e.
- Hook shell recognition; thuộc B4b.

## 3. Implementation checklist

- [ ] Mọi subcommand trả envelope: ok, operation, reason_code, severity, message, data, next_command, runtime_version.
- [ ] JSON mode ghi duy nhất envelope vào stdout; human text vào stdout khi success, diagnostics vào stderr.
- [ ] Exit 0 chỉ khi ok=true; validation fail, blocking consistency issue, health corruption, partial/recovery-required đều non-zero.
- [ ] Chốt exit classes ổn định: usage, validation/policy, health/integrity, conflict, internal; docs ghi mapping.
- [ ] status/next-step gọi inspectRuntimeHealth và không catch parse error thành null.
- [ ] validate không break rồi exit 0; phải persist typed block/result đúng B1d.
- [ ] emit chỉ success sau B3d activation; output lấy exact paths từ active manifest.
- [ ] consistency warning có severity; unacknowledged blocking warning không được success.
- [ ] Deepen missing asset/invalid phase trả reason code và non-zero.
- [ ] CLI không tự build dist, sửa hooks hoặc reset state ngoài explicit recovery/install operation.
- [ ] Tách CLI monolithic thành launcher dưới 100 dòng và operation modules hand-authored dưới 200 dòng; không duy trì switch logic nghìn dòng ở mỗi adapter.

## 4. Interfaces / Files expected to change

- [NEW] adapter/shared/cli-result.mjs hoặc TypeScript source được bundle.
- [MODIFY] adapter/claude-code/cli.mjs thành thin launcher.
- [MODIFY] adapter/codex-plugin/cli.mjs thành thin launcher theo B4e.
- [MODIFY] src/adapters/shared/renderNextStep.ts.
- [NEW] test/integration/cli-protocol.test.ts.
- [MODIFY] docs/CLI hoặc adapter docs liên quan.

Interface đích:

- runCliOperation(context, argv) → CliResult
- exitCodeFor(result) → stable integer

## 5. Risks & mitigations

- Script/skill phụ thuộc text cũ: chuyển sang JSON mode và migration window có deprecation warning.
- Warning quá gắt: severity được Content/Core schema khóa; chỉ blocking warning yêu cầu ack/correction.
- Stack trace lộ path: default redacted; debug explicit.

## 6. Verification plan

- Spawn CLI thật và assert stdout/stderr/exit cho success, validation fail, corrupt state, missing asset, conflict và internal error.
- status/next-step corruption trả non-zero cùng Core reason code.
- emit list chứa .design-everything/execution-plan.json không prefix docs/.
- JSON parse ổn định, không xen log.
- Skill fixtures dùng exit code/JSON, không regex human prose.

## 7. Status

WAITING_FOR_APPROVAL
