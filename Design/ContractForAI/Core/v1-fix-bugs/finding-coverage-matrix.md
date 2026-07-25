# Finding Coverage Matrix

> Mỗi finding có một contract primary chịu trách nhiệm sửa và ít nhất một contract QA chịu trách
> nhiệm chứng minh. "Corrected" là hiệu chỉnh review, không phải bug cần code.
>
> **Cột Status/Test ID/Evidence path/Last verified commit được thêm 2026-07-25** sau khi đối chiếu
> lại cho thấy phần lớn `it('X..')`/`it('U..')` hiện có trong `test/integration/installed-runtime/`
> dùng đúng label ID nhưng **kiểm tra một hành vi khác** với mô tả trong cột "Phát hiện đã xác minh"
> của bảng này (semantic mismatch), hoặc chạy trên source repo thay vì target đã cài. Những dòng đó
> được đánh `MISMAPPED` — không được coi là CLOSED cho tới khi test đúng seam/đúng finding được viết
> lại ở P1 của `plan-v1-fix.md`. Không dòng nào trong bảng dưới đây là `CLOSED` tại thời điểm này.

## Uxx / Xxx — Finding gốc từ audit

| ID | Phát hiện đã xác minh | Primary | Proof | Status | Test ID hiện có | Evidence path | Last verified commit |
|---|---|---|---|---|---|---|---|
| U01 | Installer Claude thiếu deepen-script.yaml | B4d | B5a | OPEN | none | — | — |
| U02 | /design-everything không bàn giao rõ sang /build | B1c, B4f | B5c | OPEN | none | — | — |
| U03 | Thông điệp "gate đã mở/code được" trái hook | B4c, B4f | B5c | PARTIAL | none | SKILL.md wording sửa một phần | — |
| U04 | docs-emitted fail-open nhưng ready-to-build lại deny | B1c, B4a | B5a | OPEN | none | — | — |
| U05 | Answer/slot whitespace, generic, Must rỗng vẫn lọt | B3a | B5c | PARTIAL | none | `validateAnswer.test.ts` (unit only, không qua CLI) | — |
| U06 | Build-plan/rationale/glossary/mermaid dẫn xuất thiếu quality/provenance gate | B3b | B5c | OPEN | none | — | — |
| U07 | ENGINE_ROOT tuyệt đối, dist build sẵn và không pin/integrity | B4d | B5a | OPEN | none | — | — |
| U08 | Quickstart trộn simulation với journey thật | B5d | B5c | PARTIAL | RT-03 | test/docs/runtime-truth.test.ts:80 | — |
| X01 | TURN_ID do caller tự đặt nên commit nhiều bước cùng user turn | B1a | B5a | SEAM_PARTIAL — legacy fallback xoá khỏi commitStep/commitDeepenAnswer 2026-07-25, `--turn` không còn được CLI/hook chấp nhận; chưa qua install.mjs thật | X01, X01b, X01c | test/integration/installed-runtime/hook-adversarial.test.ts, test/integration/adapter-parity.test.ts, src/core/advanceState.test.ts | (uncommitted at time of fix) |
| X02 | Hook cho ghi thẳng state/docs/policy và pre-create managed docs | B2a, B4a | B5a | MISMAPPED | X05, X06 (labels reused for X02-shaped case) | test/integration/installed-runtime/hook-adversarial.test.ts:89,98 | — |
| X03 | Wrapper allow command chỉ vì chứa substring adapter CLI | B4b | B5a | PARTIAL | none | resolve-cli-invocation.mjs fixes wrapper only; Core còn `includes('cli.mjs')` | — |
| X04 | git/find được coi read-only theo basename dù có lệnh phá hủy | B2b | B5a | MISMAPPED | X10, X12 (labels reused for X04-shaped case) | test/integration/installed-runtime/hook-adversarial.test.ts:118,134 | — |
| X05 | Thiếu progress.json làm wrapper fail-open như project chưa cài | B2e, B4a | B5a | OPEN | none (existing `it('X05...')` tests a different behavior — direct-write deny) | — | — |
| X06 | blocked conflates validation và execution failure; validate gỡ nhầm block | B1d | B5a | OPEN | none (existing `it('X06...')` tests a different behavior — direct-edit deny) | — | — |
| X07 | Glob matcher tự chế sai dấu chấm, metachar và double-star | B2c | B5a | OPEN | none (existing `it('X07...')` tests a different behavior — phase-gate deny) | — | — |
| X08 | Commit lưu progress rồi answers, có thể partial | B1b | B5b | OPEN | none | — | — |
| X09 | validate fail nhưng CLI có thể exit 0; warning severity không khóa | B4c | B5a | OPEN | none | — | — |
| X10 | Gate so basename nên docs/archive có thể giả artifact | B2d | B5a | OPEN | none (existing `it('X10...')` tests a different behavior — git command deny) | — | — |
| X11 | gates_passed append-only, không revoke khi artifact đổi/xóa | B2d | B5a | OPEN | none | — | — |
| X12 | slots-file đọc path tùy ý, key tùy ý, overwrite raw/step khác | B3a | B5a | OPEN | none (existing `it('X12...')` tests a different behavior — find command deny) | — | — |
| X13 | Rerun installer không thay hook stale vì match includes quá rộng | B4d | B5a | OPEN | none | — | — |
| X14 | emit output gắn docs/ sai cho execution-plan | B3c, B4c | B5a | OPEN | none | — | — |
| X15 | status/next-step nuốt state/plan/profile corruption | B2e, B4c | B5a | OPEN | none (existing `it('X15...')` tests a different behavior — shell chaining deny) | — | — |
| X16 | Emit nhiều write trước validation, crash để lại partial/stale files | B3d | B5b | PARTIAL | FE-01..FE-06 (test the Core transaction engine directly, not the CLI seam that still bypasses it) | test/fault-injection/emit-transaction.test.ts | — |
| X17 | Deepen chưa khóa phase tier-1 và chưa dùng capability một-lượt | B3e | B5a | OPEN | none | — | — |
| X18 | Test hiện hành chưa chạy installer/wrapper/adversarial thật | B5a | B5d | OPEN | none (existing `it('X18...')` tests a different behavior — nested shell deny; and is itself an instance of this finding, since it runs from REPO_ROOT) | — | — |
| X19 | Hai CLI Claude/Codex copy logic dễ drift | B4e | B5a | PARTIAL | none | `cliOperations.ts` consolidation done; `adapter-parity.test.ts` exists but doesn't cover Codex-side policy fork (R17) | — |
| X20 | README/quickstart/glossary/conformance drift về câu hỏi, count, version | B3c, B5d | B5c | MISMAPPED | RT-04 (label reused, only checks literal version string) | test/docs/runtime-truth.test.ts:88 | — |
| X21 | Gate artifact chỉ kiểm existence, không non-empty/content integrity | B2d | B5a | OPEN | none | — | — |
| X22 | Re-emit có thể để file managed cũ nhưng không được xóa user-owned docs | B3d | B5b | MISMAPPED | X22 (label reused for a docs-emitted/plan-validating gate case, not re-emit cleanup) | test/integration/installed-runtime/hook-adversarial.test.ts:176 | — |
| X23 | Derived quality hiện phó thác executor yếu và không có user-visible acknowledgement | B3b, B4f | B5c | OPEN | none | — | — |
| X24 | Deepen asset/runtime parity giữa Claude và Codex chưa được packaging guarantee | B4d, B4e | B5a | MISMAPPED | X24 (label reused for allowed-paths write-gate case, not deepen parity) | test/integration/installed-runtime/hook-adversarial.test.ts:201 | — |

## Rxx — Finding bổ sung phát hiện lúc đối chiếu review (2026-07-25)

Các finding này lộ ra khi kiểm production call sites so với contract, không có trong audit gốc.
Phải có test/evidence riêng trước khi coi phần primary contract tương ứng là IMPLEMENTED.

| ID | Phát hiện bổ sung | Primary | Proof | Status | Test ID | Evidence path |
|---|---|---|---|---|---|---|
| R01 | UserPromptSubmit tạo capability nhưng plaintext token không được trả/inject cho caller; wrapper vẫn chỉ phát TURN_ID. Xóa legacy fallback ngay sẽ làm happy path không commit được. | B1a, B4a, B4f | B5a | SEAM_PARTIAL — `onUserPromptSubmit` nay trả `capabilityToken`, `renderInject` nhúng vào injected context, hook `user-prompt-submit.mjs` dạy `--capability-token`; CLI/SKILL.md hết `--turn` | none formal, covered by X01/X01b/X01c | test/integration/installed-runtime/hook-adversarial.test.ts |
| R02 | `loadProgress`/`migrateInterviewStore` nuốt lỗi canonical/legacy parse rồi có thể trả fresh state — reset/fail-open. | B1b, B2e | B5a | OPEN | none | — |
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
