# Finding Coverage Matrix

> Mỗi finding có một contract primary chịu trách nhiệm sửa và ít nhất một contract QA chịu trách
> nhiệm chứng minh. "Corrected" là hiệu chỉnh review, không phải bug cần code.
>
> **Cột Status/Test ID/Evidence path/Last verified commit được thêm 2026-07-25** sau khi đối chiếu
> lại cho thấy phần lớn `it('X..')`/`it('U..')` hiện có trong `test/integration/installed-runtime/`
> dùng đúng label ID nhưng **kiểm tra một hành vi khác** với mô tả trong cột "Phát hiện đã xác minh"
> của bảng này (semantic mismatch), hoặc chạy trên source repo thay vì target đã cài. Những dòng đó
> được đánh `MISMAPPED`.
>
> **2026-07-30 — đối chiếu lại lần hai (Phase 2.2 của plan v1-fix-bugs):** mọi `MISMAPPED` cũ đã
> được xử lý — test bị gắn nhầm label giờ mang tên đúng với hành vi nó thực sự kiểm (không giữ label
> ID sai chỉ vì test đó hợp lệ ở nghĩa khác), và mỗi finding thật (X02, X04, X05, X06, X07, X10, X11,
> X12, X15, X18, X22, X24) đã được đối chiếu trực tiếp với source để xác định FIXED/PARTIAL/OPEN thật,
> kèm test mới ở đúng seam khi thiếu. Không đổi mô tả finding cho khớp test đang có — nơi hành vi thật
> vẫn còn thiếu (X12, X15, X20) bảng ghi rõ phần nào đã đóng, phần nào vẫn mở, không fabricate CLOSED.

## Uxx / Xxx — Finding gốc từ audit

| ID | Phát hiện đã xác minh | Primary | Proof | Status | Test ID hiện có | Evidence path | Last verified commit |
|---|---|---|---|---|---|---|---|
| U01 | Installer Claude thiếu deepen-script.yaml | B4d | B5a | FIXED — Claude installer stage toàn bộ `Design/Content/interview-script/`; installed-target deepen journey chạy qua bundle đã cài và parity test đối chiếu byte của `deepen-script.yaml` | installed-target deepen fixture (full journey), X24 | test/integration/installed-runtime/deepen-fixture.test.ts, test/integration/adapter-parity.test.ts | 1a39774 |
| U02 | /design-everything không bàn giao rõ sang /build | B1c, B4f | B5c | SEAM_PARTIAL — skill và next-step card đều chỉ rõ `/build`/validate; proof hiện là Core/in-process journey, chưa có transcript từ skill ở target đã cài chứng minh handoff thật | NJ-04, B4f handoff card, P3.1 next | test/journey/newbie-shapes.test.ts, test/integration/skill-handoff.test.ts, test/integration/cli-protocol.test.ts | 1a39774 |
| U03 | Thông điệp "gate đã mở/code được" trái hook | B4c, B4f | B5c | PARTIAL | none | SKILL.md wording sửa một phần | — |
| U04 | docs-emitted fail-open nhưng ready-to-build lại deny | B1c, B4a | B5a | SEAM_PARTIAL — production `emit` tạo `execution-state.json` ở `plan-validating` và `next` deny trước validate; installed-hook proof có nhưng fixture mang tên docs-emitted lại seed `phase: interview`, nên exact installed transition còn thiếu | P3.1 emit/next, Phase gate | test/integration/cli-protocol.test.ts, test/integration/installed-runtime/hook-adversarial.test.ts | 1a39774 |
| U05 | Answer/slot whitespace, generic, Must rỗng vẫn lọt | B3a | B5c | PARTIAL | none | `validateAnswer.test.ts` (unit only, không qua CLI) | — |
| U06 | Build-plan/rationale/glossary/mermaid dẫn xuất thiếu quality/provenance gate | B3b | B5c | PARTIAL — recipe/schema và validator provenance đã có unit proof, nhưng `emitTier1` gọi `validateStagedEmit(generation, catalog)` không truyền `derivedRecipes`, nên gate production chưa hoạt động | B3b content-quality, P6 10.2 | src/core/contentQualityContract.test.ts, src/core/emitTransactionValidate.test.ts, src/core/emitTier1.ts | 1a39774 |
| U07 | ENGINE_ROOT tuyệt đối, dist build sẵn và không pin/integrity | B4d | B5a | FIXED — `moved-source.test.ts` installs then relocates the entire tree away from REPO_ROOT and scans every installed file for the dev-repo path, proving no absolute path leaks; `tampered-runtime.test.ts` proves a bit-flipped runtime bundle fails `status` closed with exit 3 (real hash-integrity pinning) | (existing, correctly scoped) | test/integration/installed-runtime/moved-source.test.ts, test/integration/installed-runtime/tampered-runtime.test.ts | — |
| U08 | Quickstart trộn simulation với journey thật | B5d | B5c | PARTIAL | RT-03 | test/docs/runtime-truth.test.ts:80 | — |
| X01 | TURN_ID do caller tự đặt nên commit nhiều bước cùng user turn | B1a | B5a | SEAM_PARTIAL — legacy fallback xoá khỏi commitStep/commitDeepenAnswer 2026-07-25, `--turn` không còn được CLI/hook chấp nhận; chưa qua install.mjs thật. H0 2026-07-25: Codex/Claude skill docs hết dạy `--turn <TURN_ID>` cho deepen; CLI `deepen` vẫn chưa có case trong `cliOperations.ts` (không executable), nên không có fixture "deepen thành công" thật — chỉ có fixture fail-closed cho unknown subcommand. Wiring `deepen` thuộc P6/P7 riêng. | X01, X01b, X01c | test/integration/installed-runtime/hook-adversarial.test.ts, test/integration/adapter-parity.test.ts, src/core/advanceState.test.ts | (uncommitted at time of fix) |
| X02 | Hook cho ghi thẳng state/docs/policy và pre-create managed docs | B2a, B4a | B5a | PARTIAL — direct write/edit to progress.json/answers.json denied; "pre-create managed docs" gap confirmed still open (interview-phase bypass forces `catalogEntries=[]`, `evaluatePreAction.ts:282-296`) | X02, X02b (deny), X02 (documents open pre-create gap) | test/integration/installed-runtime/hook-adversarial.test.ts (X02, X02b, and the "should still allow pre-creating a doc..." case) | 92bc7f2 (relabeled), see commit closing this task |
| X03 | Wrapper allow command chỉ vì chứa substring adapter CLI | B4b | B5a | PARTIAL | none | resolve-cli-invocation.mjs fixes wrapper only; Core còn `includes('cli.mjs')` | — |
| X04 | git/find được coi read-only theo basename dù có lệnh phá hủy | B2b | B5a | FIXED — `commandPolicies/gitReadOnly.ts:44` excludes clean/restore from safeSubcommands; `findReadOnly.ts:6` unsafeFlags includes -delete/-exec/-execdir/-ok/-okdir | X04, X04b | test/integration/installed-runtime/hook-adversarial.test.ts (X04, X04b) | see commit closing this task |
| X05 | Thiếu progress.json làm wrapper fail-open như project chưa cài | B2e, B4a | B5a | FIXED — `adapter/claude-code/hooks/pre-tool-use.mjs:16-22` now requires ALL THREE of interview-state.json/progress.json/install-manifest.json absent before skipping | X05 | test/integration/installed-runtime/hook-adversarial.test.ts (X05) | see commit closing this task |
| X06 | blocked conflates validation và execution failure; validate gỡ nhầm block | B1d | B5a | FIXED — `advanceExecutionState.ts:77-84`, `transitionToReadyToExecute` keeps phase/block unchanged when `block_reason.kind` is verification-failed/verification-aborted/policy-corrupt; only `kind: 'validation'` clears via validate | X06 | src/core/advanceExecutionState.test.ts (X06) — Core-level proof of a pure state-transition invariant, no installed CLI needed | see commit closing this task |
| X07 | Glob matcher tự chế sai dấu chấm, metachar và double-star | B2c | B5a | FIXED — `pathPolicy.ts:122-161`, `escapeRegExpExceptStar` escapes metacharacters, `**` handled as zero-or-more segments | (existing, correctly scoped) | src/core/pathPolicy.test.ts:74-100 | — |
| X08 | Commit lưu progress rồi answers, có thể partial | B1b | B5b | SEAM_PARTIAL — `commitInterviewAnswer` (P2.2a, 2026-07-25) ghi progress+answers trong một `transactInterviewStore` call, không còn hai write riêng; slots/provenance chưa nối (P6) | none | src/core/canonicalAuthority.test.ts, src/core/interviewStore.test.ts | — |
| X09 | validate fail nhưng CLI có thể exit 0; warning severity không khóa | B4c | B5a | SEAM_PARTIAL — mọi envelope `ok:false` được `exitCodeFor` map non-zero và launcher gọi `process.exit`; validate-fail được unit/in-process proof exit 2, nhưng chưa có process assertion trên CLI target đã cài | P1 (DEBT1) validate-fail, exitCodeFor | test/integration/cli-protocol.test.ts, src/adapters/shared/cliResult.ts, adapter/claude-code/cli.mjs | 1a39774 |
| X10 | Gate so basename nên docs/archive có thể giả artifact | B2d | B5a | FIXED — `evaluateGate.ts:22-39` candidateKeys only tries the exact canonical path or one hardcoded `docs/`+name, keyed by `canonicalizeWorkspacePath`, no basename-anywhere fallback | (existing, correctly scoped, "confused-deputy" tests) | src/core/evaluateGate.test.ts:138-201 | — |
| X11 | gates_passed append-only, không revoke khi artifact đổi/xóa | B2d | B5a | CLOSED — `evaluatePreAction.ts` now derives `gates_passed` fresh via `passedGates(policy, gateSnapshot)` every call and overwrites the array instead of appending | X11 | src/adapters/claude/preToolUse.test.ts | db90029 |
| X12 | slots-file đọc path tùy ý, key tùy ý, overwrite raw/step khác | B3a | B5a | PARTIAL — path IS now confined to workspace (`canonicalizeWorkspacePath`, `cliOperations.ts:288-306`) and same-key resubmission no longer silently destroys a prior value (`interviewApplicationServices.ts:284-301`); still open: no directory allowlist beyond workspace-confinement, and slot keys are not scoped to the current question (a key semantically owned by a later step can still be written from an earlier one) | none | — | — |
| X13 | Rerun installer không thay hook stale vì match includes quá rộng | B4d | B5a | SEAM_PARTIAL — installer match đúng role filename dưới runtime version bất kỳ và rerun không duplicate/preserve hook người dùng; suite chưa seed một hook version cũ để chứng minh command stale được thay trực tiếp | installer-repair rerun/idempotence | test/integration/installed-runtime/installer-repair.test.ts, adapter/claude-code/install.mjs | 1a39774 |
| X14 | emit output gắn docs/ sai cho execution-plan | B3c, B4c | B5a | FIXED — catalog tách `docs/09-execution-plan.md` (doc) khỏi `.design-everything/execution-plan.json` (state), và loader test khóa state path không có prefix `docs/` | artifact-catalog execution-plan path | src/core/artifactCatalog.test.ts, Design/Content/artifact-catalog.yaml | 1a39774 |
| X15 | status/next-step nuốt state/plan/profile corruption | B2e, B4c | B5a | PARTIAL — `cliOperations.ts` handleNext/handleStatus (via `runtimeHealth.ts`) now surface corrupt execution-state.json/execution-plan.json as explicit error codes, not swallowed; still open: `projectProfileState.ts:20-33` `loadProjectProfile` swallows JSON/schema errors to `null`, indistinguishable from "no profile" | none | — | — |
| X16 | Emit nhiều write trước validation, crash để lại partial/stale files | B3d | B5b | PARTIAL — FE-01..FE-06 test the Core transaction engine (`activateEmit`/`recoverEmit`) directly via `crash-worker.mjs`, not by crashing a real `cli.mjs emit` process. Confirmed (2026-07-30) `cliOperations.ts:503,509` `handleEmit` calls the exact same `recoverEmit` at startup, so the crash-safety property genuinely covers the CLI path too — this is a deliberate unit-level scope choice (per plan-v1-fix.md P1 2.3: "không cần chuyển 100%"), not an unproven gap. No test independently crashes a real CLI process mid-emit. | FE-01..FE-06 (unit-level, by design) | test/fault-injection/emit-transaction.test.ts | — |
| X17 | Deepen chưa khóa phase tier-1 và chưa dùng capability một-lượt | B3e | B5a | SEAM_PARTIAL — CLI deepen đã nối, installed full journey dùng capability token và deny replay; phase lock có Core proof, còn installed fresh opt-in chỉ assert `ok:false` chứ chưa khóa reason code pre-tier-1 | installed-target deepen full journey, deepen lifecycle | test/integration/installed-runtime/deepen-fixture.test.ts, src/core/deepenLifecycle.test.ts | 1a39774 |
| X18 | Test hiện hành chưa chạy installer/wrapper/adversarial thật | B5a | B5d | CLOSED — `test/integration/installed-runtime/hook-adversarial.test.ts` and `codex-pre-tool-use.test.ts` now install a real target via `install.mjs` in `beforeAll` and spawn the installed target-local hooks/CLI, not repo-root/in-process TS imports | X18 (the whole suite's architecture is the proof; no single `it()` maps 1:1) | test/integration/installed-runtime/hook-adversarial.test.ts:39-52 | 92bc7f2, 0f9945b |
| X19 | Hai CLI Claude/Codex copy logic dễ drift | B4e | B5a | PARTIAL | none | `cliOperations.ts` consolidation done; `adapter-parity.test.ts` exists but doesn't cover Codex-side policy fork (R17) | — |
| X20 | README/quickstart/glossary/conformance drift về câu hỏi, count, version | B3c, B5d | B5c | PARTIAL — RT-02 khóa scope câu hỏi Glossary và RT-04 đã so package/runtime/release-note; chưa có machine-derived cross-check cho mọi claim count/journey giữa README, quickstart, SKILL và glossary | RT-02, RT-04 | test/docs/runtime-truth.test.ts | 1a39774 |
| X21 | Gate artifact chỉ kiểm existence, không non-empty/content integrity | B2d | B5a | FIXED — snapshot phân biệt missing/directory/empty, tính SHA-256 và bind active emit manifest; evaluator deny file rỗng hoặc digest lệch | P5.1 gate snapshot, DEBT3.1 manifest binding | src/core/gateSnapshot.test.ts, src/core/evaluateGate.test.ts | 1a39774 |
| X22 | Re-emit có thể để file managed cũ nhưng không được xóa user-owned docs | B3d | B5b | FIXED — `emitTransactionActivate.ts:90-106,126-146`: stale managed paths (absent from the new generation) are backed up then unlinked; any live file at a target path not already tracked as managed aborts activation via `user-file-collision` before any mutation | (existing, correctly scoped) | src/core/emitTransaction.test.ts:96 (stale cleanup), :141 (user-file-collision) | — |
| X23 | Derived quality hiện phó thác executor yếu và không có user-visible acknowledgement | B3b, B4f | B5c | PARTIAL — answer warning có `needs_user_ack` và skill cấm auto-ack, nhưng derived-provenance validator chưa được nối vào production emit và chưa có acknowledgement artifact cho output dẫn xuất | B3b content-quality, P6 10.2 | src/core/contentQualityContract.test.ts, src/core/emitTransactionValidate.test.ts, adapter/claude-code/skill/SKILL.md | 1a39774 |
| X24 | Deepen asset/runtime parity giữa Claude và Codex chưa được packaging guarantee | B4d, B4e | B5a | CLOSED — both `install.mjs` stage the entire `Design/Content/interview-script/` directory (incl. `deepen-script.yaml`) wholesale; now asserted byte-identical on two real installed targets | X24 | test/integration/adapter-parity.test.ts ("X24 — deepen asset parity between installed Claude and Codex targets") | see commit closing this task |

## Rxx — Finding bổ sung phát hiện lúc đối chiếu review (2026-07-25)

Các finding này lộ ra khi kiểm production call sites so với contract, không có trong audit gốc.
Phải có test/evidence riêng trước khi coi phần primary contract tương ứng là IMPLEMENTED.

| ID | Phát hiện bổ sung | Primary | Proof | Status | Test ID | Evidence path |
|---|---|---|---|---|---|---|
| R01 | UserPromptSubmit tạo capability nhưng plaintext token không được trả/inject cho caller; wrapper vẫn chỉ phát TURN_ID. Xóa legacy fallback ngay sẽ làm happy path không commit được. | B1a, B4a, B4f | B5a | SEAM_PARTIAL — `onUserPromptSubmit` nay trả `capabilityToken`, `renderInject` nhúng vào injected context, hook `user-prompt-submit.mjs` dạy `--capability-token`; CLI/SKILL.md hết `--turn` | none formal, covered by X01/X01b/X01c | test/integration/installed-runtime/hook-adversarial.test.ts |
| R02 | `loadProgress`/`migrateInterviewStore` nuốt lỗi canonical/legacy parse rồi có thể trả fresh state — reset/fail-open. | B1b, B2e | B5a | SEAM_PARTIAL — `migrateInterviewStore` (P2.2a, 2026-07-25) không còn fabricate fresh state, trả `'no-legacy'`; `loadInterviewStore` throw `STORE_MISSING` thay vì tạo store rỗng. `loadProgress.ts` tự thân vẫn còn nhánh fresh-default khi ENOENT cả hai, nhưng không còn production adapter/policy nào gọi nó (chặn bằng `legacyAuthorityBoundary.test.ts`) — chỉ còn dùng bởi `runtimeHealth.ts` (soft-detect, không phải authority) và test fixtures. | none | src/core/canonicalAuthority.test.ts, src/core/interviewStore.test.ts, src/core/legacyAuthorityBoundary.test.ts |
| R03 | SessionStart nuốt lỗi recover/migrate, bỏ qua `HealthReport`; health broken không chặn/inject recovery có cấu trúc. | B2e, B4a | B5a | OPEN | none | — |
| R04 | Pha `plan-validating` blanket-allow write dưới `Design/`, `docs/`, `.design-everything/`; pha `blocked` deny-all. Cả hai trái B2a/B1d. | B1d, B2a, B4a | B5a | OPEN | none | — |
| R05 | `checkExecutionGate` compatibility API trả allow khi `state=null`, trái invariant "installed/emit mà thiếu state phải deny". | B1c, B2e | B5a | OPEN | none | — |
| R06 | `pathPolicy` containment dùng `startsWith`, sibling-prefix (`E:/foo-evil` với root `E:/foo`) có thể lọt; `**` chưa đúng zero-or-more segment. | B2c | B5a | OPEN | none | — |
| R07 | Internal mutation capability là object caller tự dựng; path matching dùng `includes/endsWith`; scratch chỉ khớp regex, không bind session/question/containment/size/TTL. | B2a, B2c | B5a | OPEN | none | — |
| R08 | Classifier split raw bằng whitespace; `git branch new-name` coi là read-only; `git -C` không kiểm workspace containment. | B2b | B5a | OPEN | none | — |
| R09 | Gate snapshot chưa xác minh artifact thuộc active managed manifest và digest khớp last successful emit; missing path vẫn được dựng `exists=true` (in-memory branch). | B2d | B5a | OPEN | none | — |
| R10 | Runtime health chỉ kiểm sự tồn tại của install manifest, không parse/verify version/hash/hook/assets. | B2e, B4d | B5a | OPEN | none | — |
| R11 | CLI `commit` gọi `validateAnswer(null, answerText)` — không dùng question contract thật; answer/slots không commit atomic vào canonical store. | B1b, B3a, B4c | B5b | OPEN | none | — |
| R12 | Wrapper gọi resolver/authorizer với install manifest và runtime snapshot đều `null`. | B4b | B5a | OPEN | none | — |
| R13 | `tsconfig` sinh layout `dist/core`, `package.json` vẫn khai `main/exports/files` theo `dist/src` — entrypoint có thể không tồn tại trong package thật. | B4d, B5d | B5d | OPEN | none | — |
| R14 | B5c report claim rubric A–H và reviewer outcome nhưng không có reviewer artifact/score sheet/disagreement record. | B5c | B5c | OPEN | none | — |
| R15 | B5d `RT-04` chỉ assert literal `'6.0.0'`, không so package với release/version/runtime source thật; `RT-03` chỉ tìm vài từ khóa. | B5d | B5d | OPEN | RT-03, RT-04 (insufficient) | test/docs/runtime-truth.test.ts:80,88 |
| R16 | Claude installer completion text vẫn nói "docs được sinh → gate mở", trực tiếp trái B1c/B4f. | B4d, B4f | B5a | OPEN | none | — |
| R17 | Codex post-tool hook còn homegrown `matchGlob` và tự suy allowed paths — B4e không thể DONE khi policy semantics vẫn fork khỏi Core. | B4e | B5a | OPEN | none | — |
| R18 | Interview lock có thể xóa lock của process còn sống chỉ vì mtime > 30s; release lock không có owner token. | B1b | B5b | OPEN | none | — |
| R19 | Store nói flush nhưng chỉ `writeFileSync` + rename; không fsync file/dir, không recovery marker, không dọn temp orphan. | B1b, B5b | B5b | OPEN | none | — |
| R20 | `canonicalizeWorkspacePath` trả workspace-relative path nhưng CLI kiểm slots bằng `existsSync(canonicalPath)` theo process cwd, không theo workspace root. | B2c, B3a, B4c | B5a | OPEN | none | — |
| R21 | (2026-08-01) Đường dẫn tu chỉnh kế hoạch có kiểm soát (B14b/D39) **không có surface chạy được**: `planAmendment.ts` (propose/approve/reject) chỉ được gọi từ chính test của nó, `cliOperations.ts` không có case `amend`, nên `renderNextStep.ts` từng dạy `amend approve <id>` — một lệnh trả `UNKNOWN_SUBCOMMAND`. Đúng pattern "có unit test nhưng không phải authority trên production path" mà v7-release-note nêu. | B14b | B15a | OPEN — **surface sai đã gỡ, chức năng vẫn chưa nối** (xem "Phạm vi đã đóng" bên dưới) | AMD-01, AMD-02, AMD-03 | src/adapters/shared/renderNextStep.test.ts, src/core/classifyCliSubcommand.test.ts |

### R21 — phạm vi đã đóng và phần còn mở (2026-08-01)

**Đã đóng (chỉ là chống-hiểu-lầm, không phải tính năng):**

- `renderNextStep.ts` §0 không còn phát `nextCommand`; card nói thẳng chưa có lệnh `amend` và chỉ người
  dùng mới quyết định được đề xuất. Test AMD-02.
- `classifyCliSubcommand.ts` bỏ nhánh `allow` cho `amend`; nay deny `UNRECOGNIZED_CLI_SUBCOMMAND`, khớp
  dispatcher thật thay vì bảo model rằng lệnh đó chạy được. Test AMD-03.
- AMD-01 (`renderNextStep.test.ts`) kiểm **mọi** nhánh card: subcommand/flag của `nextCommand` phải nằm
  trong `CLI_COMMAND_SURFACE`. Đây là cái chặn tái diễn — không chỉ cho `amend`.

**Còn mở — cố ý không làm trong lần này:**

- B14b vẫn `WAITING_FOR_APPROVAL` (cả batch v4-expansion). Nối `amend` vào dispatcher là ship public
  surface của một contract chưa duyệt, trái kỷ luật ContractForAI.
- Nghiêm trọng hơn: `approvePlanAmendment` hiện **trái chính checklist của B14b**. Contract yêu cầu
  "Approval **preserves prior evidence**" và xếp "Evidence history lost after revision" là risk Cao,
  nhưng `planAmendment.ts:159-160` set `state.evidence = []` và `state.completed_tasks = []`. Nối
  nguyên trạng sẽ đưa một đường dẫn phá evidence vào production — tệ hơn lệnh chết.
- Contract còn đòi `amend show` và diff chính xác theo task/command/path/risk; `proposePlanAmendment`
  mới sinh chuỗi impact thô ("Task X modified."), và chưa có cách nào nhập `proposed_changes` qua CLI.
- Điều kiện đóng R21: B14b được duyệt → sửa evidence-preservation → nối `amend propose|show|approve`
  → integration test qua CLI thật (không phải import Core), theo đúng "Điều kiện đóng matrix" bên dưới.

## Hiệu chỉnh review, không mở bug riêng

| ID | Hiệu chỉnh | Cách giữ đúng |
|---|---|---|
| C01 | Runtime interview còn có câu nhánh W/M/C; hybrid dùng hai nhánh | B3c sinh journey manifest; B5d sync docs từ manifest |
| C02 | Output hiện là 12 docs cho web/mobile/CLI, 13 cho hybrid, cộng conventions và execution-plan | B3c bỏ count viết tay; B5d kiểm public docs |
| C03 | deepen-script.yaml đang tracked | Không yêu cầu git-add; U01 chỉ sửa packaging copy/integrity |

## Điều kiện đóng matrix

- Một finding chỉ chuyển `CLOSED` khi: (a) primary contract Implementation = `IMPLEMENTED`, (b) proof
  contract có test ID/evidence path đúng nghĩa (không `MISMAPPED`), và (c) test đó chạy ở seam đúng
  layer — installed target cho Adapter finding, không phải import Core trực tiếp.
- Không chấp nhận "test Core pass" thay cho installer/wrapper test đối với finding Adapter.
- Không chấp nhận snapshot text đơn thuần cho state transition, exit code, filesystem transaction
  hoặc security classifier.
- Không tái sử dụng một test ID cho một hành vi khác với mô tả finding trong bảng — đây chính là lỗi
  `MISMAPPED` bị phát hiện ở lần đối chiếu 2026-07-25, phải sửa ở P1 của `plan-v1-fix.md` trước khi
  đóng bất kỳ dòng nào ở trên.
