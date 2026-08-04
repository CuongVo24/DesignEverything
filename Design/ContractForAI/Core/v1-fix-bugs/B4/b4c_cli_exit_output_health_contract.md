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
- [x] Tách CLI monolithic thành launcher dưới 100 dòng và operation modules hand-authored dưới 200 dòng; không duy trì switch logic nghìn dòng ở mỗi adapter.

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

Spec: APPROVED | Implementation: PARTIAL | Proof: SEAM_PARTIAL

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. X15 (status/next-step nuốt state/plan/profile corruption) một phần FIXED —
handleNext/handleStatus (qua runtimeHealth.ts) nay surface corrupt execution-state/execution-plan
thành reason code rõ; `projectProfileState.ts` `loadProjectProfile` vẫn nuốt lỗi profile thành
`null` — finding-coverage-matrix.md X15 vẫn PARTIAL. X09 nay có installed-target spawn `cli.mjs
validate --json`, assert exit 2, stdout là một envelope JSON lỗi và stderr rỗng; B4c vẫn `PARTIAL`
vì chưa có matrix process proof đủ success/corrupt/missing asset/conflict/internal theo §6.

Cập nhật 2026-08-05 (A1-P8, structural — không đổi hành vi): `cliOperations.ts` (1262 dòng, switch
+ 10 `handleX` inline) đã tách thành launcher 75 dòng (`runCliOperation` — parse subcommand, chạy
guard handoff-recovery, dispatch) + `src/adapters/shared/cliOps/` (`commandSurface.ts`, `support.ts`,
`status.ts` [status/init/repair], `commit.ts`, `validate.ts`, `emit.ts`, `next.ts`, `start.ts`,
`verify.ts`, `review.ts` — mỗi file <200 dòng, `deepenCliOperations.ts` giữ nguyên vị trí cũ, không
đổi). `CLI_COMMAND_SURFACE`/`CLI_GLOBAL_FLAGS`/`runCliOperation` vẫn export từ `cliOperations.ts` nên
mọi call site cũ (`src/core/index.ts`, test) không đổi import path. `test/docs/skill-truth.test.ts`'s
nguồn quét getArg/hasFlag đã sửa từ danh sách file cứng sang quét cả thư mục `cliOps/` để không mù khi
tách file. Refactor behavior-preserving: 915/915 test xanh trước và sau, build + lint + typecheck sạch.
Checklist item "Tách CLI monolithic..." CLOSED. Các item còn lại của B4c (envelope field coverage,
exit-class mapping đầy đủ, matrix process proof) chưa đánh giá lại trong lần A1-P8 này ⇒ B4c giữ PARTIAL.
