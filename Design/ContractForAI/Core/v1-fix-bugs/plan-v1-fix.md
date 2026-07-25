# Plan v1-fix-bugs — Kế hoạch vá runtime integrity đã đối chiếu

## 0. Trạng thái tài liệu

- Trạng thái release: **BLOCKED — không phát hành 7.0.0**.
- Ngày đối chiếu: 2026-07-25.
- Nguồn sự thật dùng để lập plan:
  - 24 contract trong `Design/ContractForAI/Core/v1-fix-bugs/`.
  - Working tree hiện tại, kể cả các thay đổi chưa commit.
  - Runtime thật: installer → hook → shared CLI → Core → state/docs.
  - Test/evidence hiện có.
- Baseline đã chạy lại:
  - `npm run test`: **90/90 test files, 494/494 tests pass**.
  - `npm run lint`: pass.
  - `npm run typecheck`: pass.
- Kết luận baseline: suite xanh hiện tại **không phải** bằng chứng rằng 24 contract đã đạt.
- Tài liệu này là kế hoạch thực thi. Nó không tự động chuyển contract sang `APPROVED` và không phải release evidence.

---

## 1. Kết luận về bản review

### 1.1. Kết luận trung tâm

Bản review đúng về vấn đề gốc: nhiều primitive B1–B3 đã được viết và có unit test, nhưng production path vẫn dùng state, gate, emit, wrapper và installer cũ. Vì vậy:

- Core có API đúng hướng nhưng không phải authority trên đường chạy thật.
- Adapter/CLI vẫn có bypass và fail-open.
- B5 đang chứng minh phần lớn implementation trực tiếp, không chứng minh installed seam như contract tuyên bố.
- Trạng thái `DONE`/`GA` không được evidence hiện tại hỗ trợ.

### 1.2. Các finding trong review được xác nhận

| Nhóm | Kết luận |
|---|---|
| Governance | README vẫn ghi 24 contract `WAITING_FOR_APPROVAL`, trong khi nhiều file tự ghi implemented/partial/DONE và release note ghi GA. |
| Core wiring | `prepareEmit`, `validateStagedEmit`, `activateEmit`, `completeTier1Emit`, `evaluateBuildReadiness`, typed blocked helpers và matcher mới chưa điều khiển đầy đủ production path. |
| B1a | `advanceState.ts` còn nhánh `userTurnId`; CLI tự sinh `--turn`; skill vẫn dạy TURN_ID; session còn fallback `default-session`. |
| B1b | `progress.json` vẫn được ưu tiên/ghi song song; `saveProgress` gọi CAS với `expectedRevision=null`, nuốt transaction error rồi ghi legacy file. |
| B3d | `handleEmit` vẫn write từng file; catch có thể trả `EMIT_SUCCESS`; không nối activation với execution-state `plan-validating`. |
| B4d | Claude installer chưa copy deepen asset, chưa có install manifest, chưa có hook ID, còn absolute engine root và không self-contained. |
| Gate/policy | Basename gate, append-only `gates_passed`, missing-file fail-open, homegrown glob, basename shell allowlist, CLI marker allow, managed-doc ownership thiếu catalog đều còn. |
| Recovery | Recovery command còn substring authorization; blocked phase chưa có remediation capability chính xác. |
| B5a | ID test không map đúng matrix; phần lớn test không chạy target-local runtime sau install. |
| B5b | Hạ tầng fault injection có giá trị nhưng đang test Core engine không được production CLI gọi. |
| Code size | `cliOperations.ts` 1009 dòng và `evaluatePreAction.ts` 562 dòng, vi phạm release gate 200 dòng. |
| Version/docs | Package/runtime là 6.0.0, docs/release claim 7.0.0 GA; truth test khóa literal 6.0.0 thay vì so các nguồn sự thật. |
| Typecheck | Production typecheck bỏ toàn bộ test; test mới có thể sai type nhưng `npm run build/typecheck` vẫn xanh. |
| Skill | Claude skill còn TURN_ID, thiếu flow deepen có thể chạy và mất một phần provenance/scope guard. |

### 1.3. Các điểm cần hiệu chỉnh trong review

| Nội dung review | Hiệu chỉnh |
|---|---|
| “Core hoàn toàn không được gọi” | Không tuyệt đối. `classifyCommand` và `authorizeMutation` đã có call site trong `evaluatePreAction`, nhưng chỉ ở một số nhánh và `authorizeMutation` không nhận catalog. `transactInterviewStore` được gọi qua `saveProgress`, nhưng CAS bị vô hiệu bằng `null`. Kết luận “wiring chưa đạt” vẫn đúng. |
| “B1b chưa có transaction” | `interviewStore.ts` đã có checksum, lock file, CAS tùy chọn, temp + rename. Phần thiếu là authority thật, expected revision bắt buộc, fsync, journal/recovery marker, orphan cleanup, migration fail-closed và lock ownership an toàn. Giữ phần đã làm, không viết lại từ đầu. |
| “B4b đã sửa X03 ở wrapper” | Chỉ mới sửa một phần. Resolver vẫn split raw command bằng whitespace, không dùng install manifest/hash, được gọi với `runtimeSnapshot=null`, và default-allow subcommand chưa biết. Không được đánh dấu X03/B4b closed. |
| “Cả 4 file B5a đều spawn hook từ repo root” | Câu này hơi tuyệt đối. `claude-install-flow` có chạy installer trước, nhưng sau đó vẫn chạy hook từ `REPO_ROOT`; `codex-parity` chạy installer ghi vào cây source. Kết luận “không phải installed-runtime proof” vẫn đúng. |
| “B3d engine chưa có giá trị production” | Engine stage/validate/activate/recover là implementation thật và nên giữ. Lỗi nằm ở seam CLI/state activation và proof, không phải bỏ engine rồi làm lại. |
| “Bump package.json lên 7.0.0 trong lúc sửa” | Không bump sớm. Giữ release là `Unreleased/blocked`, hoàn tất toàn bộ gate trước; chỉ cut 7.0.0 ở bước cuối để tránh tạo thêm version lie. |
| “Đưa test/**/* thẳng vào tsconfig build” | Cần typecheck test, nhưng không nên làm production build emit toàn bộ test. Dùng `tsconfig.test.json`/`typecheck:all` hoặc project references để test được typecheck mà package không chứa test. |
| “Hạ mọi status về PARTIALLY_IMPLEMENTED” | Một status không đủ diễn đạt approval, implementation và proof. Cần ba cột độc lập; không dùng `DONE` để che việc chưa được approve hoặc chưa có seam evidence. |

---

## 2. Finding bổ sung bị thiếu trong review

Các finding dưới đây phải được thêm vào coverage matrix trước khi code, để không vá xong các finding cũ nhưng vẫn còn bypass tương đương.

| ID mới | Finding bổ sung | Contract chính |
|---|---|---|
| R01 | UserPromptSubmit tạo capability nhưng plaintext token không được trả/inject cho caller; wrapper vẫn chỉ phát TURN_ID. Nếu xóa legacy fallback ngay, happy path sẽ không commit được. | B1a, B4a, B4f |
| R02 | `loadProgress` gặp missing legacy file + canonical corrupt có thể nuốt lỗi canonical rồi trả fresh state; `migrateInterviewStore` nuốt legacy parse/schema error rồi có thể tạo fresh state. Đây là reset/fail-open. | B1b, B2e |
| R03 | SessionStart nuốt lỗi recover/migrate và bỏ qua `HealthReport`; health broken không chặn/inject recovery có cấu trúc. | B2e, B4a |
| R04 | Pha `plan-validating` blanket-allow write dưới `Design/`, `docs/`, `.design-everything/`; pha `blocked` deny-all. Cả hai trái B2a/B1d. | B1d, B2a, B4a |
| R05 | `checkExecutionGate` compatibility API trả allow khi `state=null`, trái invariant “installed/emit mà thiếu state phải deny”. | B1c, B2e |
| R06 | `pathPolicy` kiểm containment bằng `startsWith`, nên sibling-prefix như `E:/foo-evil` có thể lọt khi root là `E:/foo`; `**` chưa đúng zero-or-more segment. | B2c |
| R07 | Internal mutation capability chỉ là object caller có thể dựng; path matching dùng `includes/endsWith`; scratch chỉ khớp regex, không bind session/question/canonical containment/size/type/TTL. | B2a, B2c |
| R08 | Classifier vẫn split raw bằng whitespace; `git branch new-name` được coi read-only; `git -C` không kiểm workspace; parser chưa chứng minh quoting/nested shell theo platform. | B2b |
| R09 | Gate snapshot chưa xác minh artifact thuộc active managed manifest và digest khớp last successful emit; missing path còn được dựng thành `exists=true`. | B2d |
| R10 | Runtime health mới kiểm sự tồn tại của install manifest, không parse/verify version/hash/hook/assets; chưa kiểm đầy đủ plan/profile/policy/catalog/manifest. | B2e, B4d |
| R11 | CLI `commit` gọi `validateAnswer(null, answerText)`, không dùng question contract; `answerText` và slots không được commit atomically vào canonical answers/slots. | B1b, B3a, B4c |
| R12 | Wrapper gọi resolver/authorizer với install manifest và runtime snapshot đều `null`; `emit`, `validate`, `repair` và subcommand mặc định có đường allow rộng. | B4b |
| R13 | `tsconfig` hiện sinh layout `dist/core`, trong khi `package.json` vẫn khai `main`, `exports`, `files` theo `dist/src`; package entrypoint có thể không tồn tại. | B4d, B5d |
| R14 | B5c report claim rubric A–H, source provenance và reviewer outcome nhưng không có reviewer artifact, score sheet, disagreement/adjudication hay golden output evidence. | B5c |
| R15 | B5d `RT-04` chỉ assert literal 6.0.0, không so package với release/version/runtime; `RT-03` chỉ tìm vài từ khóa. Test đang chứng minh presence, không chứng minh truth. | B5d |
| R16 | Claude installer completion text vẫn nói “docs được sinh → gate mở”, trực tiếp trái B1c/B4f. | B4d, B4f |
| R17 | Codex post-tool hook còn homegrown `matchGlob` và tự suy allowed paths; B4e không thể `DONE` khi policy semantics vẫn fork khỏi Core. | B4e |
| R18 | Interview lock có thể xóa lock của process còn sống chỉ vì mtime quá 30 giây; release lock không có owner token. | B1b |
| R19 | Store comment nói flush nhưng implementation chỉ `writeFileSync` + rename; không fsync file/dir, không recovery marker và không dọn temp orphan. | B1b, B5b |
| R20 | `canonicalizeWorkspacePath` trả workspace-relative path nhưng CLI kiểm slots bằng `existsSync(canonicalPath)` theo process cwd, không theo workspace root. | B2c, B3a, B4c |

---

## 3. Mô hình trạng thái contract và evidence mới

Không dùng một cột `Status` duy nhất. README và từng contract phải phản ánh ba trục:

| Trục | Giá trị đề xuất | Ý nghĩa |
|---|---|---|
| Spec status | `DRAFT`, `WAITING_FOR_APPROVAL`, `APPROVED` | Intent đã được duyệt hay chưa. |
| Implementation status | `NOT_STARTED`, `PARTIAL`, `IMPLEMENTED` | Code có tồn tại và đạt checklist nội bộ hay chưa. |
| Proof status | `MISSING`, `UNIT_ONLY`, `SEAM_PARTIAL`, `VERIFIED` | Bằng chứng đang ở unit/Core hay đã qua seam thật. |

Quy tắc:

- Chỉ gọi contract `DONE` khi `APPROVED + IMPLEMENTED + VERIFIED`.
- `DONE` không được dùng nếu dependency chưa `DONE`.
- Coverage matrix phải có `Status`, `Test ID`, `Evidence path`, `Last verified commit`.
- Release note không được ghi GA nếu bất kỳ primary/proof contract nào chưa `DONE`.
- Report không được tự biến test count thành bằng chứng cho claim không được assert.

### 3.1. Phân loại ban đầu cần ghi lại

| Contract | Implementation ban đầu | Proof ban đầu | Ghi chú |
|---|---|---|---|
| B1a | PARTIAL | UNIT_ONLY | Primitive capability có, runtime còn TURN_ID và token không đến caller. |
| B1b | PARTIAL | UNIT_ONLY | Store có nền tảng, production vẫn dual-authority/CAS null. |
| B1c | PARTIAL | UNIT_ONLY | Helper có, emit path không gọi. |
| B1d | PARTIAL | UNIT_ONLY | Helper có, hook blocked vẫn deny-all. |
| B2a | PARTIAL | UNIT_ONLY | Ownership primitive thiếu exact catalog/capability/scratch binding. |
| B2b | PARTIAL | UNIT_ONLY | Classifier có nhưng chưa phủ mọi phase và còn parser/policy gaps. |
| B2c | PARTIAL | UNIT_ONLY | Matcher có nhưng consumer dùng matcher cũ; containment/glob còn lỗi. |
| B2d | PARTIAL | UNIT_ONLY | Snapshot có nhưng basename/fail-open/digest authority còn. |
| B2e | PARTIAL | UNIT_ONLY | Health có nhưng manifest/assets/state coverage và adapter behavior chưa đạt. |
| B3a | PARTIAL | UNIT_ONLY | Validator có, CLI bỏ question contract và không commit answer/slots. |
| B3b | PARTIAL | UNIT_ONLY | Declarative recipes có; runtime emit/provenance gate chưa chứng minh. |
| B3c | IMPLEMENTED | UNIT_ONLY | Catalog/compiler là phần có thể giữ; consumer coverage chưa đủ. |
| B3d | PARTIAL | UNIT_ONLY | Transaction engine có; CLI/state seam chưa nối. |
| B3e | PARTIAL | UNIT_ONLY | Lifecycle có; legacy token và tier-2 transaction còn. |
| B4a | PARTIAL | SEAM_PARTIAL | Hook gọi Core nhưng logic cũ/wide allow còn. |
| B4b | PARTIAL | SEAM_PARTIAL | Exact relative path mới là một phần, chưa manifest/hash/state-bound. |
| B4c | PARTIAL | SEAM_PARTIAL | Envelope/launcher có, operation monolith và emit/health semantics còn sai. |
| B4d | NOT_STARTED/PARTIAL | MISSING | Installer cũ, không self-contained/manifest/integrity. |
| B4e | PARTIAL | SEAM_PARTIAL | Shared runner có, packaging/Codex policy parity chưa đạt. |
| B4f | PARTIAL | SNAPSHOT_ONLY | Wording handoff tốt một phần, command/provenance/deepen còn drift. |
| B5a | PARTIAL | INVALID_FOR_CLAIM | Test chạy repo runtime hoặc ghi vào source; mapping finding sai. |
| B5b | PARTIAL | INVALID_FOR_PRODUCTION_SEAM | Fault harness tốt nhưng chưa đi qua CLI operation thật. |
| B5c | PARTIAL | INVALID_FOR_CLAIM | Không có human-review/golden provenance evidence như report tuyên bố. |
| B5d | PARTIAL | INVALID_FOR_CLAIM | Truth test yếu và version vẫn drift. |

---

## 4. Invariant đích phải khóa trước khi sửa

1. Chỉ `.design-everything/interview-state.json` là interview authority sau migration.
2. Không consumer production nào đọc/ghi `progress.json` hoặc answers legacy sau migration.
3. Một user prompt phát đúng một opaque capability; token bind session, operation, question/subject và revision; commit + consume nằm trong cùng transaction.
4. Mọi corruption/missing state trong target đã cài là deny + exact recovery; không reset/fresh state ngầm.
5. Adapter không tự mutate state/gate và không tự tái implement classifier/path/glob.
6. Mọi managed artifact được xác định bằng exact catalog + active manifest, không bằng basename/substring.
7. Shell chỉ allow khi structured parser chứng minh read-only hoặc operation Core xác thực exact.
8. Tier-1 emit chỉ success sau stage → validate → activate docs/plan/manifest → tạo execution-state `plan-validating`.
9. Tier-2 emit transactional theo từng module để re-emit module A không xóa module B.
10. Blocked state mở đúng remediation capability, không deny-all và không mở-write-all.
11. Installer tạo target-local bundle + install manifest; di chuyển repo nguồn không làm target hỏng.
12. Cả Claude và Codex dùng cùng Core decision/reason code/catalog/version; khác biệt enforcement phải khai rõ.
13. Test `installed-runtime` chỉ pass khi executable/hook/CLI được gọi từ target/package cài thật.
14. Public version/release claim chỉ được sinh sau proof gate, không khóa bằng literal trong test.

---

## 5. Thứ tự thực thi bắt buộc

```text
P0 Release freeze + evidence ledger
  └─ P1 Red tests và installed-runtime harness thật
      ├─ P2 Canonical state + capability transaction (B1a/B1b)
      │   └─ P3 Handoff + typed blocked transition (B1c/B1d)
      ├─ P4 Path + ownership + command policy (B2a/B2b/B2c)
      │   └─ P5 Gate snapshot + runtime health (B2d/B2e)
      └─ P6 Answer/provenance/catalog completion (B3a/B3b/B3c)
          └─ P7 Tier-1/tier-2 transactional activation (B3d/B3e)
              └─ P8 Hook/CLI integration (B4a/B4b/B4c)
                  └─ P9 Installer + Claude/Codex parity (B4d/B4e)
                      └─ P10 Skill truth (B4f)
                          └─ P11 Rebuild B5 evidence
                              └─ P12 Packaging/version/docs/release cut
```

Không bắt đầu P8 trước khi P2–P7 có approved interfaces và unit/component proof. Không bắt đầu release sync trước khi P11 pass.

---

## 6. Kế hoạch chi tiết

## P0 — Chặn release và sửa governance/evidence ledger

### Mục tiêu

Loại bỏ claim sai trước khi sửa code và tạo một ledger có thể kiểm chứng.

### Thay đổi

- [ ] Đổi `Design/RoadMap/v7-release-note.md` từ GA thành `UNRELEASED — BLOCKED`.
- [ ] Xóa câu “hoàn tất toàn bộ B1–B5” và test count tĩnh khỏi release claim hiện hành.
- [ ] Đánh dấu `Design/RoadMap/v1-fix-bugs-evaluation-report.md` là draft/invalidated, nêu rõ report cũ không có installed seam và reviewer evidence.
- [ ] Thêm ba cột spec/implementation/proof vào README.
- [ ] Thêm `Status`, `Test ID`, `Evidence path`, `Last verified commit` vào finding matrix.
- [ ] Thêm R01–R20 vào matrix với primary/proof contract.
- [ ] Gỡ `DONE` khỏi B4e/B4f/B5a–B5d; không tự đổi spec status thành approved.
- [ ] Ghi rule dependency: proof contract không thể VERIFIED khi primary chưa IMPLEMENTED.

### Verification

- [ ] Script lint matrix fail nếu finding thiếu test/evidence/status.
- [ ] Script lint dependency fail nếu contract `DONE` trước dependency.
- [ ] Search release docs không còn `General Availability` hoặc claim “toàn bộ contract hoàn tất”.

### Exit criteria

- Release bị chặn bằng machine-check, không chỉ bằng prose.
- README, contract và matrix không còn ba nguồn status mâu thuẫn.

---

## P1 — Viết red tests đúng seam trước khi vá

### Mục tiêu

Biến toàn bộ finding U/X/R thành failing tests phản ánh runtime thật.

### Harness

- [ ] Build/package một lần vào staging ngoài source tree.
- [ ] Cài Claude vào temp path có space + Unicode, ví dụ `Thiết kế Δ target`.
- [ ] Cài Codex vào temp package root, không ghi `adapter/codex-plugin/dist` trong repo.
- [ ] Đọc hook command từ settings của target; không dùng `REPO_ROOT/.../hooks`.
- [ ] Assert `process.argv[1]`, resolved runtime và assets đều nằm dưới target/package root.
- [ ] Sau install, rename/move source repo path hoặc chạy child process với source path không truy cập được.
- [ ] Teardown chỉ xóa resolved temp root đã kiểm prefix/marker.

### Red-test bắt buộc

- [ ] X01/R01: token happy path, forged, replay, wrong session/question/revision; không dùng `--turn`.
- [ ] X02/R04/R07: direct write/delete/rename engine state, policy, managed docs ở interview và plan-validating.
- [ ] X03/R12: exact launcher, copied launcher, quoted path space/Unicode, chain/redirect, unknown subcommand, wrong phase.
- [ ] X04/R08: `git branch new`, branch delete/move, `git -C` ngoài root, find actions, nested cmd/PowerShell/Bash.
- [ ] X05/R02/R03/R10: missing/corrupt canonical state/install manifest/assets/hash.
- [ ] X06/R04/R05: mọi blocked kind × allowed remediation; missing execution state không allow.
- [ ] X07/R06/R20: sibling-prefix, symlink/junction, dot/metachar, `**` zero/many segments, slots path dùng đúng root.
- [ ] X08/R18/R19: lock owner, live lock >30s, fsync/rename/crash/orphan recovery.
- [ ] X10/X11/X21/R09: exact path, delete/edit revoke, active-manifest membership, digest stale, symlink/empty/missing.
- [ ] X12/R11: slots containment/schema/key, raw answer persistence và atomic capability consumption.
- [ ] X13/R16: rerun installer repair exact hook ID; install text không claim gate open.
- [ ] X14/X16/X22: output exact path, all-or-nothing emit, stale managed cleanup và user-owned preservation.
- [ ] X15/R03/R10: status/next/health cùng reason code khi state/plan/profile/policy/catalog hỏng.
- [ ] X17: deepen phase/capability/tier-2 transaction per module.
- [ ] X18: source path bị ẩn sau install.
- [ ] X19/R17: same Core decision/digest cho Claude/Codex, Codex không dùng matcher riêng.
- [ ] X20/R13/R15: package entrypoint/version/journey/count lấy từ nguồn máy đọc.
- [ ] X23/R14: provenance/unknown/ack và reviewer evidence thật.
- [ ] X24: asset/runtime/deepen parity bằng manifest hashes.

### Exit criteria

- Ít nhất một red test cho mọi U01–U08, X01–X24, R01–R20.
- Test ID khớp đúng semantic finding, không tái sử dụng ID cho case khác.
- Coverage report được sinh từ test metadata, không viết tay.

---

## P2 — B1a/B1b: capability và canonical interview transaction

### P2.1. Capability lifecycle

- [ ] Xóa `userTurnId` khỏi public `commitStep` và `commitDeepenAnswer`.
- [ ] Xóa nhánh legacy fallback và `last_user_turn_id` khỏi schema v7 sau migrator.
- [ ] SessionStart tạo stable random session ID một lần và persist canonical.
- [ ] UserPromptSubmit issue token bằng canonical transaction với expected revision thật.
- [ ] Trả plaintext token đúng một lần trong private hook context; state chỉ giữ hash.
- [ ] Không log token; snapshot/redaction test bắt mọi leak.
- [ ] CLI bắt buộc `--capability-token`; thiếu token trả `TURN_CAPABILITY_MISSING`.
- [ ] Map exact `TURN_CAPABILITY_*` reason code ra CliResult, không gom thành `COMMIT_FAILED`.
- [ ] Consume token + append answer/slots + advance step + revision trong một transaction.
- [ ] Validation `invalid/needs_user_ack` không consume capability; ack dùng capability riêng.

### P2.2. Canonical store

- [ ] Retire production read/write của `progress.json` và `Design/.interview/answers.json`.
- [ ] `loadProgress/saveProgress` chỉ còn migration-only adapter hoặc bị xóa khỏi production exports.
- [ ] Mọi transaction bắt buộc `expectedRevision`; cấm `null` ngoài explicit initialization.
- [ ] Lock record có nonce/owner; release chỉ xóa lock của chính owner.
- [ ] Không xóa lock còn sống chỉ vì TTL; stale recovery cần PID/session/nonce policy đã test.
- [ ] Temp file cùng volume, explicit open/write/fsync/close, rename/replace đúng Windows.
- [ ] Fsync parent directory ở platform hỗ trợ; ghi rõ fallback Windows.
- [ ] Thêm journal/commit marker hoặc generation pointer đủ phân biệt old/new/temp.
- [ ] Cleanup temp orphan idempotent dựa trên marker/revision/checksum, không dựa timestamp đơn.
- [ ] Migration parse/schema conflict phải fail closed; không tạo fresh state nếu có legacy/canonical corrupt.
- [ ] Backup migration immutable, versioned, idempotent; canonical tồn tại vẫn phải validate.

### Files chính

- `src/core/advanceState.ts`
- `src/core/deepenState.ts`
- `src/core/turnCapability.ts`
- `src/core/interviewStore.ts`
- `src/core/migrateInterviewStore.ts`
- `src/core/loadProgress.ts`
- `src/core/schemas/state.ts`
- `src/core/schemas/interviewStore.ts`
- `src/adapters/claude/userPromptSubmit.ts`
- shared CLI commit operation sau khi tách

### Exit criteria

- Không còn `--turn`, `userTurnId`, `last_user_turn_id`, `default-session` trong production path.
- Không còn production write `progress.json`.
- Hai commit đồng thời cùng token: đúng một success.
- Crash ở mọi boundary: restart thấy toàn bộ old hoặc new envelope.

---

## P3 — B1c/B1d: handoff và typed blocked remediation

### Handoff

- [ ] Chốt tên canonical `ready-for-validation`; legacy `ready-to-build` chỉ tồn tại trong migrator.
- [ ] Tạo service `completeTier1Activation` nhận active emit manifest + canonical store revision.
- [ ] Service tạo execution-state `plan-validating` với plan/docs/manifest digests.
- [ ] Interview phase và execution-state activation nằm trong cùng recovery journal với emit.
- [ ] Missing/corrupt execution-state sau emit/install luôn deny code.
- [ ] Remove/deprecate `checkExecutionGate` null-state allow.
- [ ] `evaluateBuildReadiness` trở thành authority duy nhất cho handoff.

### Blocked transition

- [ ] Migrate `block_reason` string sang typed record.
- [ ] Hook dùng `allowedRemediation(state)` thay vì deny-all.
- [ ] Remediation bind action, exact paths/command, task, block kind và revision.
- [ ] Validate chỉ recover validation/integrity/snapshot-stale block có proof tương ứng.
- [ ] Verification failed/aborted giữ active task/evidence; không bị validate xóa.
- [ ] Next-step render trực tiếp từ `recoverable_by`.

### Exit criteria

- Emit success luôn có execution-state `plan-validating`.
- Không phase nào trước `ready-to-execute` mở source write.
- Mỗi blocked kind có positive remediation control và negative scope controls.

---

## P4 — B2c/B2a/B2b: path, ownership và command policy

### P4.1. Canonical path

- [ ] Thay containment `startsWith` bằng kiểm `relative(root,target)` không absolute/`..` và so sánh boundary đúng platform.
- [ ] Resolve nearest existing parent cho path mới; reject symlink/junction escape.
- [ ] Reject UNC/device path và drive mismatch ngoài policy.
- [ ] Viết parser pattern theo segment; `*` một segment, `**` zero-or-more segment.
- [ ] Không special-case `*`/`**` thành allow-all ngoài semantics đã định.
- [ ] Tất cả consumer nhận `CanonicalWorkspacePath` branded type, không tự normalize lại.

### P4.2. Ownership

- [ ] Classify exact canonical relative path; bỏ mọi `includes/endsWith` authority.
- [ ] Managed output lấy exact active catalog/manifest set.
- [ ] Engine-policy chỉ nhận exact installed asset paths; không chặn `src/schemas/` của user.
- [ ] Internal capability opaque/signed và chỉ Core issuer tạo được.
- [ ] Capability bind action + revision + exact path set + expiry/consumption.
- [ ] Scratch bind session/question, canonical containment, extension/schema/size/depth/TTL.
- [ ] Plan-validating không blanket-allow `.design-everything/` hoặc toàn `Design/docs`.

### P4.3. Command classifier

- [ ] Ưu tiên structured argv; raw string dùng parser theo Bash/PowerShell/cmd.
- [ ] Unknown/ambiguous quote/operator/nested shell fail closed.
- [ ] `git branch` chỉ read-only khi không có tên/ref tạo mới và không có mutation flag.
- [ ] Validate `git -C`, `--git-dir`, `--work-tree` nằm trong workspace.
- [ ] `find` chỉ allow grammar đã chứng minh; không chỉ scan exact flag token.
- [ ] Không coi executable basename là proof.
- [ ] Dùng classifier ở interview, plan-validating, executing và wrapper; xóa mọi `safeCmds`.

### Exit criteria

- Xóa `matchGlob`, `safeCmds`, substring/marker CLI allow khỏi production Core/adapters.
- Differential tests cho gate/ownership/active-task path trả cùng kết quả.

---

## P5 — B2d/B2e: gate recomputation và runtime health

### Gate

- [ ] `buildGateSnapshot` nhận active emit manifest, validation record và evidence store.
- [ ] Requirement match exact canonical path; bỏ basename và suffix fallback.
- [ ] Artifact phải là regular file, non-empty, trong active managed manifest và digest khớp.
- [ ] Missing/unreadable path luôn `exists=false`.
- [ ] Validation pass bind current plan/docs/manifest digests.
- [ ] Evidence bind current task/command/result digest, không chỉ task ID.
- [ ] `gates_passed` nếu giữ chỉ là derived display cache được replace toàn bộ cùng `input_digest`.
- [ ] Hook không write gate cache; state update chỉ qua Core transaction.

### Runtime health

- [ ] Parse và verify install manifest schema/version/build hash/asset hashes/hook IDs.
- [ ] Kiểm canonical interview store, execution state theo phase, execution plan, profile, policy, catalog, active manifests và deepen assets.
- [ ] Phân biệt `uninvolved` chỉ khi không install marker và không managed artifact nào.
- [ ] Installed/partially installed + missing state là broken.
- [ ] `status`, `next`, hooks và skill dùng cùng một `HealthReport`.
- [ ] Recovery authorization exact, bỏ substring hai chiều.
- [ ] SessionStart không nuốt recover/migrate error; emit structured blocking result.

### Exit criteria

- Xóa/sửa artifact sau gate pass đóng gate ngay.
- Xóa legacy progress không làm target trở thành uninvolved.
- Corruption ở mọi consumer trả cùng reason code.

---

## P6 — B3a/B3b/B3c: answer, slots, provenance và catalog consumer

### Answer/slots

- [ ] CLI load current question contract và gọi `validateAnswer(question.answer_contract, payload)`.
- [ ] Enforce `required`, trim, placeholder, `min_items`, `required_fields`, enum, pattern và bounded structure.
- [ ] `needs_user_ack` tạo explicit ack prompt/capability; model không tự ack.
- [ ] `loadQuestionSlots` nhận absolute workspace root + canonical scratch path.
- [ ] Enforce question/recipe key allowlist, file size/depth/type, source revisions và producer version.
- [ ] Persist raw answer revision, typed slots, provenance và capability consumption atomically.
- [ ] Correction tạo revision `supersedes`; không overwrite raw confirmed answer.

### Derived provenance

- [ ] Runtime thực thi `derived-recipes.yaml`, không chỉ schema-test file.
- [ ] Mỗi derived block có source refs, source revision digest, producer/version và coverage.
- [ ] Missing source tạo `⚠ unknown — cần hỏi người`, không render assertion như fact.
- [ ] Emit validation chặn derived output thiếu provenance/unknown policy.

### Catalog

- [ ] Giữ compiler/catalog implementation hiện có.
- [ ] Bắt mọi consumer dùng catalog: ownership, gate, installer asset list, emit, docs count/journey, parity manifest.
- [ ] Không copy path/count list sang CLI/skill/docs.

### Exit criteria

- CLI commit thật lưu answer/slots vào canonical store.
- Weak-executor fixture không thể emit derived assertion thiếu provenance.
- Catalog digest giống nhau giữa Core, installer và hai adapter.

---

## P7 — B3d/B3e: transactional tier-1/tier-2 activation

### Tier-1

- [ ] Tạo application service duy nhất cho CLI:
  1. load canonical store với expected revision;
  2. render `emitTree`;
  3. `prepareEmit`;
  4. `validateStagedEmit`;
  5. require acknowledgement cho blocking warning;
  6. `activateEmit`;
  7. activate interview/execution state;
  8. trả exact active manifest paths.
- [ ] Mở rộng journal để cover manifest + canonical interview phase + execution-state.
- [ ] Không trả success cho collision/revision mismatch/recovery-required/partial activation.
- [ ] Xóa direct write loop khỏi CLI.
- [ ] Xóa nhánh catch đọc `tier1-manifest.json`; chỉ `emit-manifest.json` là authority.

### Tier-2

- [ ] Chọn manifest/journal theo module, ví dụ `emit-manifest-tier2-<module>.json`, để re-emit module A không xóa module B.
- [ ] Chuyển `emitTier2.ts` từ per-file atomic write sang shared stage/validate/activate.
- [ ] Tier-2 commit dùng capability/store transaction P2.
- [ ] Plan-affecting module atomically chuyển snapshot sang stale/blocked đúng type.
- [ ] Re-run tạo amendment/version record hoặc contract được sửa/approve rõ nếu giữ current-state overwrite.

### Exit criteria

- Production `emit` chỉ gọi transaction service.
- Fault ở bất kỳ boundary nào để lại old hoặc new generation, không mixed docs/state.
- Tier-2 module isolation được chứng minh.

---

## P8 — B4a/B4b/B4c: hook và shared CLI production wiring

### Hook adapters

- [ ] SessionStart: load manifest → recover → migrate → health → inject; không swallow.
- [ ] UserPromptSubmit: issue capability và truyền token một lần an toàn.
- [ ] PreToolUse: chỉ map host payload sang Core request và serialize Core decision.
- [ ] Session ID lấy từ canonical session/context, không hardcode.
- [ ] MultiEdit/NotebookEdit/delete/rename/shell mutation được map đầy đủ.
- [ ] Uninstalled thật mới bypass; canonical/install/managed marker bất kỳ đều vào health.

### Exact wrapper

- [ ] Resolver nhận install manifest thật và structured command classification.
- [ ] Launcher path phải exact target-local path + hash/version đúng manifest.
- [ ] Parser hỗ trợ quoted path có space/Unicode mà không split whitespace thủ công.
- [ ] Không gọi authorizer với runtime snapshot null.
- [ ] Mỗi subcommand map vào Core authorization; unknown default deny.
- [ ] `init/repair/validate/emit/deepen` không blanket allow.

### CLI

- [ ] Tách `cliOperations.ts` thành launcher/orchestrator <100 dòng và module operation <200 dòng.
- [ ] Mỗi operation chỉ gọi Core application service, không chứa state/gate/emit business logic riêng.
- [ ] Runtime version đọc từ generated build manifest/package metadata, không hardcode.
- [ ] Exit classes ổn định: usage, policy/validation, health/integrity, conflict, internal.
- [ ] JSON stdout chỉ có một envelope; diagnostics stderr; stack/path redacted mặc định.
- [ ] Warning blocking chưa ack phải `ok=false`.
- [ ] `status/next` không catch corruption thành null/uninvolved.

### Exit criteria

- `evaluatePreAction.ts` là orchestrator <200 dòng.
- Không còn homegrown path/command/gate mutation trong adapter.
- CLI emitted paths lấy từ active manifest.

---

## P9 — B4d/B4e: self-contained installers và parity

### Claude installer

- [ ] Build target-local versioned runtime bundle dưới `.design-everything/runtime/<version>/`.
- [ ] Copy catalog-declared assets, gồm script, deepen script, gate policy, shapes, templates, catalog, recipes, schemas/version.
- [ ] Ghi install manifest với runtime/schema/catalog version, build hash, file hashes, hook IDs, target root, engine range.
- [ ] Hook/skill chỉ trỏ target-local relative layout; bỏ `ENGINE_ROOT` repo.
- [ ] `ensureHook` match exact stable hook ID + event; repair stale/wrong path/hash.
- [ ] Preserve custom hooks byte-for-byte và backup settings.
- [ ] Install staging + atomic activation; manifest chỉ xuất hiện sau khi bundle/settings healthy.
- [ ] Post-install spawn target-local CLI health.
- [ ] Completion text dùng `renderNextStep`, không nói gate đã mở.

### Codex parity

- [ ] Codex installer nhận target/package output rõ ràng, không ghi vào source tree khi test/install.
- [ ] Codex hooks/skills dùng shared Core policy; xóa post-tool homegrown matcher.
- [ ] Cùng runtime bundle/manifest schema/catalog/deepen hashes với Claude.
- [ ] Capability matrix phân biệt hard hook của Claude và soft enforcement của Codex.
- [ ] Replay cùng fixture phải giống reason code/state digest; presentation khác được khai rõ.

### Packaging layout

- [ ] Trong repair branch, khôi phục layout package hiện hành `dist/src/...` hoặc mở contract riêng trước khi đổi.
- [ ] Đồng bộ `tsconfig`, `main`, `exports`, `files`, hook resolver và installer về đúng một layout.
- [ ] `npm pack --dry-run`/package inspection assert entrypoint tồn tại và không chứa source-only path.

### Exit criteria

- Rename/xóa repo source sau install, target Claude/Codex vẫn chạy status/hook/commit/emit.
- Rerun installer repair đúng hook/assets và không duplicate.

---

## P10 — B4f: skill truth và executable instructions

- [ ] Xóa toàn bộ `--turn <TURN_ID>`; dùng capability token do hook cung cấp.
- [ ] Ghi đầy đủ lệnh deepen opt-in/next/commit/emit cho Claude và Codex.
- [ ] Khôi phục user-visible SourceRef/`⚠ unknown` rule.
- [ ] Khôi phục scope guard: trước handoff không tự viết ngoài managed flow/scratch contract.
- [ ] Mọi state mutation qua CLI; skill không hướng dẫn sửa progress/state/answers.
- [ ] Emit success chỉ nói “docs đã activate, plan chưa validate”; next command `/build`.
- [ ] Non-zero/health error dừng flow và hiển thị exact `next_command`.
- [ ] Generate/share command and handoff blocks để hai skill không drift.

### Exit criteria

- Skill command fixture chạy được trên target installed thật.
- Không snapshot nào claim code-ready trước `ready-to-execute`.

---

## P11 — Xây lại B5 evidence

### B5a installed-runtime

- [ ] Mỗi test dùng target-local hook/CLI/bundle.
- [ ] Coverage metadata map đúng U01–U08, X01–X24, R01–R20.
- [ ] Assert decision, reason code, exit code, revision, capability state và filesystem bytes.
- [ ] Có positive control cho mỗi recovery/read-only/active-task allow.
- [ ] Path space + Unicode bắt buộc.
- [ ] Source path bị move/ẩn sau install.

### B5b fault injection

- [ ] Chạy fault qua public CLI/application service, không chỉ import Core primitive.
- [ ] Interview faults: load/validate/lock/temp/write/fsync/rename/marker/cleanup.
- [ ] Emit faults: render/stage/validate/backup/promotion/manifest/interview-state/execution-state/stale cleanup.
- [ ] Hard-kill critical boundaries và restart target-local CLI.
- [ ] Recovery hai lần: lần 1 recover, lần 2 no-op.
- [ ] Assert no mixed answers/slots/capability và no mixed docs/plan/state.

### B5c journey/quality

- [ ] Journey phải đi qua commit/emit/build CLI thật, không chỉ pure Core loop.
- [ ] Golden outputs lưu input, source refs, digests, producer version.
- [ ] Deterministic rubric có per-artifact assertions, không chỉ validator answer.
- [ ] Hai reviewer độc lập tạo score artifact có danh tính role/version/date.
- [ ] Lưu disagreement và adjudication; threshold được khóa trước khi review.
- [ ] Nếu không thực hiện human review, sửa contract/report thành limitation; không tuyên bố đã đạt.
- [ ] Metrics thật: steps-to-first-valid-task, retries, false allow/deny, unresolved warning.

### B5d truth

- [ ] Truth test parse package, build/install manifests, Versioning, ConformanceMatrix và release note rồi so equality.
- [ ] Journey/question/path/count lấy từ catalog/compiler.
- [ ] Quickstart test theo structure/commands/outcome, không chỉ regex keyword.
- [ ] Link checker kiểm toàn bộ active docs với allowlist lịch sử rõ ràng.
- [ ] Release proof đọc machine-generated test report, không hardcode count.

### Exit criteria

- B5a–B5d chỉ chuyển VERIFIED khi primary dependencies đã IMPLEMENTED.
- Evaluation report được sinh từ artifacts có đường dẫn kiểm chứng.

---

## P12 — Typecheck, version truth và release cut

### Typecheck/package

- [ ] Thêm `tsconfig.test.json` hoặc project references để typecheck `src/**/*.test.ts` và `test/**/*.ts` với `noEmit`.
- [ ] Thêm `npm run typecheck:all` vào CI/release gate.
- [ ] Giữ production build không emit test.
- [ ] Package inspection assert `main/exports/files` tồn tại trong tarball.

### Version

- [ ] Trong thời gian sửa: package giữ 6.0.0, release note ghi Unreleased/blocked.
- [ ] Tạo một source version duy nhất từ `package.json` hoặc release manifest.
- [ ] Generate/inject `runtime_version`; cấm literal version trong operation code/tests.
- [ ] Test so mọi source với source version, không `toBe('6.0.0')`/`toBe('7.0.0')`.
- [ ] Dọn ConformanceMatrix entry trùng/sai label.
- [ ] Chỉ sau khi P0–P11 pass mới bump 7.0.0 và generate docs/manifests.

### Release gate cuối

- [ ] 24 contract có spec `APPROVED`, implementation `IMPLEMENTED`, proof `VERIFIED`.
- [ ] Coverage matrix không còn OPEN/MISSING/UNIT_ONLY cho release finding.
- [ ] `npm run typecheck:all`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] installed-runtime suite trên Windows và Linux.
- [ ] package inspection + moved-source test.
- [ ] fault-injection suite.
- [ ] journey deterministic + reviewer artifacts.
- [ ] docs/version/catalog/install-manifest truth suite.
- [ ] Sau cùng mới đổi release note sang GA.

---

## 7. File/module decomposition dự kiến

Tên có thể điều chỉnh khi implement, nhưng boundary và giới hạn dòng là bắt buộc.

```text
src/core/application/
  commitInterviewAnswer.ts
  activateTier1Generation.ts
  activateTier2ModuleGeneration.ts
  inspectAndRecoverRuntime.ts

src/core/state/
  interviewStore.ts
  interviewMigration.ts
  turnCapability.ts
  lock.ts
  journal.ts

src/core/policy/
  evaluatePreAction.ts
  pathPolicy.ts
  artifactOwnership.ts
  commandClassifier.ts
  gateSnapshot.ts
  runtimeHealth.ts
  blockedRemediation.ts

src/adapters/shared/operations/
  status.ts
  init.ts
  commit.ts
  emit.ts
  validate.ts
  deepen.ts
  recovery.ts
  execution.ts

adapter/shared/generated/
  runtime-manifest.json
  cli-result schema/bundle

adapter/claude-code/install/
  buildPackage.mjs
  mergeHooks.mjs
  installTransaction.mjs
  verifyInstalledRuntime.mjs
```

Quy tắc:

- File hand-authored mới/tách: dưới 200 dòng.
- Orchestrator CLI: dưới 100 dòng.
- Generated/bundle phải có header và không được dùng để né review source.
- Không tạo barrel/circular import kiểu `runtimeHealth.ts` import lại `core/index.ts`; module Core import trực tiếp dependency cụ thể.

---

## 8. Test oracle tối thiểu theo contract

| Contract | Oracle bắt buộc để đóng |
|---|---|
| B1a | Installed prompt → token → commit; replay/concurrency chỉ một success. |
| B1b | CLI commit crash matrix old-or-new; no legacy authority. |
| B1c | Emit success tạo plan-validating; code deny đến validate pass. |
| B1d | Transition table + installed remediation scope. |
| B2a | Exact managed path deny; user-owned sibling allow; unforgeable internal capability. |
| B2b | Cross-shell corpus + git/find mutations + `-C` containment. |
| B2c | Windows/POSIX/symlink/junction/sibling-prefix/glob differential. |
| B2d | Active-manifest digest and immediate revocation. |
| B2e | Installed health corruption matrix với cùng reason code ở status/next/hook. |
| B3a | Question-specific answer + slots committed atomically. |
| B3b | Derived output thiếu source bị block/unknown, không chỉ YAML schema pass. |
| B3c | Consumer path/count/journey/catalog digest parity. |
| B3d | Public emit seam fault matrix docs/plan/manifest/state. |
| B3e | Tier-2 per-module transaction + snapshot invalidation. |
| B4a | Target-local hook protocol suite. |
| B4b | Exact target launcher/hash/state authorization với quoted Unicode path. |
| B4c | Spawn CLI stdout/stderr/exit/envelope cho success và mọi failure class. |
| B4d | Install/repair/move-source/integrity/failure rollback. |
| B4e | Cross-adapter state digest/reason code + package hash parity. |
| B4f | Installed skill command transcript và handoff snapshot. |
| B5a | Matrix-generated installed-runtime coverage report. |
| B5b | Public seam fault report old-or-new/idempotent. |
| B5c | Golden outputs + deterministic score + two-reviewer artifacts. |
| B5d | Machine comparison của version/catalog/docs/release/package. |

---

## 9. Những phần nên giữ

Không rewrite các phần sau nếu test mới không chỉ ra lỗi cụ thể:

- Turn capability hash/binding/reason-code primitive.
- Artifact catalog/compiler và catalog-driven tier-1 file list.
- Transactional emit stage/validate/activate/recover architecture.
- CliResult envelope và thin launcher direction.
- Shared Claude/Codex CLI source direction.
- Fault-injection helper/crash-worker làm nền, nhưng đổi entrypoint sang public seam.
- `renderNextStep` handoff wording “chưa validate/chưa code”.
- Declarative answer contract, derived recipes và quality rubric làm schema nền.
- Path canonicalization API shape, nhưng sửa containment/glob implementation và buộc consumer dùng chung.

---

## 10. Definition of Done cuối cùng

Một release v7 chỉ hợp lệ khi đồng thời thỏa:

1. Không production path nào còn TURN_ID, legacy progress authority, basename gate, substring recovery, homegrown glob hoặc `safeCmds`.
2. Không corruption/missing installed state nào rơi về uninvolved/fresh state.
3. Commit và emit đi qua canonical transaction service với expected revision thật.
4. Emit success luôn có active manifest và execution-state `plan-validating`.
5. Installer Claude/Codex self-contained, integrity-checked và độc lập repo nguồn.
6. Tất cả U/X/R finding có đúng test ID và seam evidence.
7. Test, lint, build, typecheck-all, installed runtime, fault injection và journey proof đều pass.
8. Package tarball có entrypoint hợp lệ.
9. Package/runtime/schema/catalog/docs/release dùng cùng version được sinh từ một nguồn.
10. 24 contract đạt `APPROVED + IMPLEMENTED + VERIFIED`.
11. Chỉ sau đó release note mới được đổi từ `UNRELEASED/BLOCKED` sang `GA`.
