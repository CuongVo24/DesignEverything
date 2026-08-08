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

- [x] Mọi subcommand trả envelope: ok, operation, reason_code, severity, message, data, next_command, runtime_version.
- [x] JSON mode ghi duy nhất envelope vào stdout; human text vào stdout khi success, diagnostics vào stderr.
- [x] Exit 0 chỉ khi ok=true; validation fail, blocking consistency issue, health corruption, partial/recovery-required đều non-zero.
- [x] Chốt exit classes ổn định: usage, validation/policy, health/integrity, conflict, internal; docs ghi mapping.
- [x] status/next-step gọi inspectRuntimeHealth và không catch parse error thành null.
- [x] validate không break rồi exit 0; phải persist typed block/result đúng B1d.
- [x] emit chỉ success sau B3d activation; output lấy exact paths từ active manifest.
- [x] consistency warning có severity; unacknowledged blocking warning không được success.
- [x] Deepen missing asset/invalid phase trả reason code và non-zero.
- [x] CLI không tự build dist, sửa hooks hoặc reset state ngoài explicit recovery/install operation.
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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

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
Checklist item "Tách CLI monolithic..." CLOSED.

Cập nhật 2026-08-06 (A1-P8, đánh giá lại có hệ thống các mục còn lại):

- **Envelope + exit-class coverage** — `cliResultEnvelopeSchema`
  (`src/adapters/shared/cliResult.ts`) đúng 8 field checklist đòi; `exitCodeFor()` map ổn định 5 lớp
  (1 usage, 2 validation/policy, 3 health/integrity, 4 conflict, 5 internal), dùng chung cho toàn bộ
  `cliOps/*` — không có subcommand nào tự trả envelope shape khác. Đã đúng từ trước, chỉ chưa tick.
- **X15 (status/next-step nuốt corruption)** — note "`loadProjectProfile` vẫn nuốt lỗi profile thành
  `null`" ở trên đã **lỗi thời**: A1-P5 (đợt trước, không phải phase này) thêm
  `classifyProjectProfileState` phân biệt `missing`/`ok`/`corrupt`, `inspectRuntimeHealth` đã dùng nó
  (`runtimeHealth.ts` dòng 331-341, phát `CORRUPT_PROJECT_PROFILE`). Cập nhật lại finding-coverage-matrix.md
  X15 theo đúng trạng thái này (xem bên dưới).
- **review/verify không đọc cùng health surface** — phát hiện thật trong lần rà này: `handleReview`
  (`cliOps/review.ts`) và `handleVerify` (`cliOps/verify.ts`) chỉ tự `existsSync` hai file
  execution-state/execution-plan, không gọi `inspectRuntimeHealth` như status/next/start đã làm —
  nghĩa là corrupt execution-plan.json (ví dụ) bị `review`/`verify` báo nhầm thành
  `EXECUTION_STATE_MISSING` thay vì đúng health reason_code, khác hành vi với status/next/start cho
  cùng một lỗi. Đã sửa: cả hai giờ gọi `inspectRuntimeHealth` trước, deny theo cùng pattern
  `status`/`next`/`start` khi `health.status === 'broken'`.
- **Matrix process proof (§6: spawn CLI thật cho success/validation-fail/corrupt-state/missing-asset/
  conflict/internal-error)** — đối chiếu `test/integration/cli-protocol.test.ts` (16 case) và
  `test/integration/installed-runtime/cli-health.test.ts` (9 case, spawn CLI thật qua install.mjs):
  success/corrupt-state/missing-asset đã có; conflict (`ALREADY`/`LOCKED`) và internal-error (exit 5)
  chưa có case installed-runtime riêng — đây là khoảng trống **Proof** (thuộc B5a/Gate A2), không chặn
  Implementation vì hành vi (map đúng exit class) đã đúng qua `exitCodeFor()`, chỉ thiếu bằng chứng
  installed-seam cho 2 nhánh đó.

Checklist §3 đủ 10/10. Implementation → `IMPLEMENTED`.
