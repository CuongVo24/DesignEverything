# Plan v1 bonus tasks — backlog sau 8 commit đầu

## 0. Mục đích và cách dùng

Tài liệu này là backlog thực thi cho phần việc còn lại của
`v1-fix-bugs`. Nó bổ sung cho `plan-v1-fix.md`, không thay thế 24
contract và không tự nâng trạng thái contract lên `IMPLEMENTED` hay
`VERIFIED`.

Mục tiêu của đợt tiếp theo:

1. hoàn tất canonical interview store và durability;
2. đưa path/ownership/command policy vào toàn bộ production consumer;
3. đóng gate, health, handoff và blocked transition;
4. đưa tier-1/tier-2 emit qua application service giao dịch;
5. hoàn tất adapter wiring, installer tự chứa và Claude/Codex parity;
6. xây lại evidence rồi mới đồng bộ package/version/release truth.

Baseline được người review báo cáo tại thời điểm lập plan:

- HEAD: `cd15380`;
- 8 commit mới từ `d60ee02` đến `cd15380`;
- build, lint và `90/90` test files, `505/505` tests xanh;
- release vẫn là `UNRELEASED/BLOCKED`;
- các primitive `classifyCommand`, `matchesPathPattern`, emit channel,
  capability enforcement, recovery/migration/health startup đã tồn tại,
  nhưng một số production consumer vẫn chưa sử dụng chúng.

Không dùng số test ở baseline làm release proof. P11/P12 phải đọc số
liệu từ report được sinh bởi lần chạy cuối.

---

## 1. Những gì không làm lại

Các hạng mục sau đã có commit riêng. Chỉ mở lại nếu regression test mới
chứng minh chúng chưa đúng contract:

- [x] shared `cliOperations.ts` và thin Claude/Codex launchers;
- [x] exact-invocation wrapper resolver bước đầu;
- [x] tier-1/tier-2 dùng channel riêng, không còn cùng ghi đè một
  manifest channel;
- [x] bỏ self-declared `--turn` authorization khỏi
  `commitStep`/`commitDeepenAnswer`;
- [x] sửa aliasing làm hỏng `state_revision` trong `saveProgress`;
- [x] bỏ false-deny `src/schemas/` trong artifact classification;
- [x] bỏ recovery authorization bằng bidirectional substring;
- [x] thêm B5 test suites và machine-checked finding matrix;
- [x] release truth chuyển từ GA sai sang `UNRELEASED/BLOCKED`;
- [x] SessionStart đã gọi recover → migrate → health trước phần legacy
  initialization.

Các dấu `[x]` trên chỉ xác nhận phạm vi commit đã có, không thay thế
contract proof.

---

## 2. Trạng thái phần còn lại

| Track | Trạng thái hiện tại | Kết luận |
|---|---|---|
| H0 — stale skill command | Open | Codex build skill vẫn còn `deepen --commit --turn <TURN_ID>` |
| P2.2 — canonical store | Partial | `progress.json` vẫn là production authority ở CLI, hooks, health và adapters |
| P4 — policy | Partial | Core primitives có, nhưng `evaluatePreAction` và Codex post-hook còn matcher/safe list riêng |
| P5 — gate/health | Partial | recovery auth đã sửa; gate và health chưa recompute/verify đủ nguồn |
| P3 — handoff/blocked | Open | chưa có atomic tier-1 handoff và typed remediation |
| P6 — answer/provenance/catalog | Partial | primitives có nhưng production consumer/evidence chưa khép kín |
| P7 — transactional emit | Partial | channel isolation có; application transaction chưa cover toàn bộ docs/state |
| P8 — adapter production wiring | Partial | launcher đã mỏng hơn; hooks vẫn đọc legacy state/null policy snapshot |
| P9 — installer/parity | Open | runtime chưa target-local/self-contained đúng B4d/B4e |
| P10 — skill truth | Partial | Claude đã sửa phần lớn; Codex còn stale command và shared-block drift |
| P11 — B5 evidence | Partial | suite tồn tại nhưng proof còn phụ thuộc implementation chưa hoàn tất |
| P12 — package/version/release | Open | chỉ được đóng sau P0–P11 |

---

## 3. Thứ tự thực thi và dependency

Thứ tự mặc định:

1. H0 — sửa stale Codex skill command;
2. P2.2a — canonical authority cutover;
3. P2.2b — durability/locking/journal;
4. P4 — canonical path, ownership, command policy;
5. P5 — gate recomputation và runtime health;
6. P3 — handoff và typed blocked transition;
7. P6 — answer/slots/provenance/catalog consumers;
8. P7 — tier-1/tier-2 transactional activation;
9. P8 — hoàn tất hook/CLI production wiring;
10. P9 — self-contained installer và adapter parity;
11. P10 — skill truth;
12. P11 — rebuild B5 evidence;
13. P12 — typecheck/package/version/release cut.

Dependency bắt buộc:

- P2.2a phải xong trước khi sửa sâu P3/P6/P7/P8.
- P4 phải xong trước P5 và trước khi chốt adapter parity.
- P5 phải cung cấp một `HealthReport`/gate authority trước P3/P8/P9.
- P3 và P6 phải ổn định interface trước khi P7 atomically activate
  state/docs.
- P7 và P8 phải xong trước khi đóng gói P9.
- P9/P10 phải xong trước khi B5a/B5c có thể tạo proof target-local thật.
- P11 phải xanh trước mọi bump version hoặc tuyên bố release ở P12.

Không gộp nhiều risk seam vào một commit. Mỗi commit phải có red test
chứng minh lỗi hoặc missing behavior, implementation tối thiểu, rồi
regression test.

---

## 4. H0 — hotfix stale Codex deepen command

### Phạm vi

- `adapter/codex-plugin/skills/design-everything-build/SKILL.md`
- shared/generated skill command blocks nếu có
- skill snapshot/integration fixtures liên quan

### Công việc

- [ ] Thay:
  `deepen --module <id> --commit --turn <TURN_ID> ...`
  bằng command nhận `--capability-token <TOKEN>`.
- [ ] Ghi rõ token chỉ đến từ hook/runtime context, người dùng/model
  không tự tạo token.
- [ ] Tìm toàn bộ production docs/skills cho `--turn`, `TURN_ID`,
  `userTurnId`; giữ lại chỉ trong negative regression tests hoặc
  migration history có chú thích.
- [ ] Thêm executable skill fixture chạy đúng command mới.
- [ ] Thêm negative fixture chứng minh `--turn` bị từ chối.

### Exit criteria

- Không còn hướng dẫn executable nào dùng self-declared turn ID.
- Claude và Codex hiển thị cùng command shape cho commit/deepen.
- Skill truth test chạy trên target-local command fixture, không chỉ
  regex keyword.

### Commit đề xuất

`fix(skill): remove stale Codex deepen turn-id command`

---

## 5. P2.2a — canonical interview store authority cutover

### Mục tiêu

Chỉ canonical envelope dưới `.design-everything/` được quyết định
interview phase, revision, answers/slots và capability state.
`progress.json`/legacy answers chỉ được đọc bởi migrator.

### 5.1. Red tests trước

- [ ] `canonical-authority.test.ts`: canonical và `progress.json` bất
  đồng; mọi production consumer phải theo canonical.
- [ ] Corrupt canonical + valid legacy phải fail closed, không fallback.
- [ ] Valid canonical + corrupt legacy vẫn hoạt động và không đọc legacy.
- [ ] Missing canonical + legacy hiện hữu phải chạy migrator đúng một
  lần, tạo immutable backup rồi dùng canonical.
- [ ] Missing cả hai ở workspace uninvolved chỉ đi qua explicit
  initializer.
- [ ] Hai writer cùng expected revision: đúng một success, loser nhận
  stable revision-conflict code.
- [ ] `expectedRevision = null` bị từ chối ở mọi mutation public.

### 5.2. Application services

- [ ] Tạo service `initializeInterviewStore` dành riêng cho empty target.
- [ ] Tạo service `issuePromptCapability`:
  load/validate canonical → verify expected revision → issue token →
  persist hash/status/revision atomically → trả plaintext token đúng một
  lần.
- [ ] Tạo service `commitInterviewAnswer`:
  verify token/hash/binding → validate answer/slots → consume token →
  append revision → advance state trong một transaction.
- [ ] Tạo service tương đương cho deepen commit, dùng cùng transaction
  kernel.
- [ ] Public mutation API bắt buộc `expectedRevision: number`; không
  chấp nhận `null`.
- [ ] Nếu initializer/migrator cần no-prior-revision, dùng API/type riêng,
  không dùng cùng mutation function với sentinel `null`.
- [ ] Chuẩn hóa error/result codes:
  `STORE_MISSING`, `STORE_CORRUPT`, `STORE_VERSION_UNSUPPORTED`,
  `REVISION_CONFLICT`, `TURN_CAPABILITY_*`, `MIGRATION_REQUIRED`,
  `RECOVERY_REQUIRED`.

### 5.3. Cut over production consumers

- [ ] `src/adapters/claude/userPromptSubmit.ts` không
  `loadProgress/saveProgress`; chỉ gọi `issuePromptCapability`.
- [ ] `src/adapters/claude/sessionStart.ts` không tạo/validate
  `progress.json` sau health; dùng initializer/migrator/canonical load.
- [ ] `src/adapters/shared/cliOperations.ts`:
  `status`, `next`, `commit`, `emit`, `deepen` đều đọc canonical service.
- [ ] `src/core/evaluatePreAction.ts` nhận canonical runtime snapshot từ
  caller; không tự load `progress.json`.
- [ ] `src/core/runtimeHealth.ts` kiểm tra canonical store, không dùng
  legacy progress làm health authority.
- [ ] Claude/Codex hook marker logic dùng install manifest + canonical
  marker; không dùng presence của `progress.json`.
- [ ] Journey/e2e fixtures chuyển sang initializer/public CLI thay vì
  tự ghi mock `progress.json`, trừ migration tests.

### 5.4. Retire legacy authority

- [ ] Xóa `loadProgress/saveProgress` khỏi production exports, hoặc chuyển
  vào module `legacyMigration` không được import bởi adapters/Core policy.
- [ ] Production code không write `progress.json`.
- [ ] Nếu cần compatibility projection cho người dùng, projection:
  read-only, generated, có `source_revision`, không được bất kỳ
  authorizer/gate/CLI operation nào đọc lại.
- [ ] `Design/.interview/answers.json` legacy chỉ còn trong migrator và
  migration fixtures.
- [ ] Lint/architecture test cấm import legacy loaders ngoài allowlist.

### Exit criteria

- `rg` production paths không còn state authority dựa vào
  `progress.json`.
- Tất cả mutation public bắt buộc expected revision thật.
- Corrupt canonical không bao giờ bị “chữa” bằng fresh state hoặc legacy
  fallback.
- Commit, deepen, status, next, hook và health cùng nhìn một revision.

### Commit slicing đề xuất

1. `test(core): pin canonical interview authority semantics`
2. `feat(core): add canonical interview application services`
3. `refactor(adapters): cut CLI and hooks over to canonical store`
4. `refactor(core): retire legacy progress production authority`

---

## 6. P2.2b — durability, ownership lock và crash recovery

### Lock ownership

- [ ] Lock record chứa owner nonce ngẫu nhiên, PID, session ID,
  acquired-at và target/store identity.
- [ ] Release chỉ xóa lock khi nonce/owner khớp.
- [ ] TTL đơn thuần không được phép xóa một lock còn sống.
- [ ] Stale decision dùng policy đã test: process liveness khi khả dụng,
  session/nonce, store revision và recovery marker.
- [ ] Lock contention có stable code và bounded retry; không busy loop.

### Durable transaction

- [ ] Temp file nằm cùng volume/directory generation với canonical file.
- [ ] Explicit `open → write → fsync/FlushFileBuffers → close`.
- [ ] Atomic replace/rename có Windows-safe behavior và test.
- [ ] Parent-directory fsync ở platform hỗ trợ; Windows fallback được
  document và test theo guarantee thực tế.
- [ ] Thêm journal/commit marker hoặc generation pointer đủ phân biệt:
  old committed, new committed, prepared temp và interrupted promotion.
- [ ] Checksum/revision liên kết state, answers, slots và capability
  consumption.
- [ ] Orphan cleanup dựa trên marker/revision/checksum, không chỉ
  timestamp.
- [ ] Recovery idempotent: lần đầu recover, lần hai no-op.

### Migration durability

- [ ] Backup legacy immutable, versioned và không overwrite khi rerun.
- [ ] Canonical hiện hữu luôn phải schema/checksum validate trước khi
  migrator quyết định no-op.
- [ ] Legacy conflict/corruption trả structured blocking result.
- [ ] Không xóa legacy artifacts trong migration repair release; chỉ
  ngừng coi chúng là authority.

### Fault boundaries bắt buộc

- [ ] load;
- [ ] schema validation;
- [ ] lock acquire;
- [ ] temp create;
- [ ] write;
- [ ] fsync;
- [ ] marker write;
- [ ] rename/replace;
- [ ] directory sync/fallback;
- [ ] lock release;
- [ ] orphan cleanup;
- [ ] hard-kill rồi restart ở các boundary quan trọng.

### Exit criteria

- Sau mọi injected crash, restart thấy toàn bộ old hoặc toàn bộ new
  envelope; không có mixed answers/slots/token/revision.
- Không writer nào xóa lock của writer khác.
- Recovery hai lần không làm tăng revision hoặc thay đổi bytes lần hai.

### Commit slicing đề xuất

1. `test(core): add interview crash-boundary matrix`
2. `feat(core): add owned interview transaction locks`
3. `feat(core): add durable interview commit journal and recovery`

---

## 7. P4 — canonical path, artifact ownership và command policy

P4 được thực hiện sau P2.2 để policy nhận canonical runtime snapshot.
Không coi việc đã có `pathPolicy.ts`/`classifyCommand.ts` là hoàn tất;
mọi production consumer phải dùng chúng.

### 7.1. P4.1 — canonical path (B2c)

#### Core behavior

- [ ] `canonicalizeWorkspacePath` dùng `relative(root, target)` và reject
  kết quả absolute, drive mismatch hoặc bắt đầu bằng `..` segment.
- [ ] So sánh case/boundary đúng theo platform; không dùng string
  `startsWith`.
- [ ] Path mới phải resolve nearest existing parent rồi kiểm tra
  symlink/junction escape.
- [ ] Reject UNC/device path hoặc ngoài-root alias nếu policy không cho.
- [ ] Trả branded `CanonicalWorkspacePath` gồm canonical absolute và
  normalized workspace-relative path.
- [ ] Pattern matcher theo segment:
  `*` = đúng một segment; `**` = zero-or-more segments.
- [ ] Escape regex metacharacters; không có special-case `*`/`**`
  thành global allow ngoài semantics đã định.

#### Consumer cutover

- [ ] artifact ownership;
- [ ] active-task `allowed_paths`;
- [ ] gate requirements;
- [ ] scratch/deepen slot paths;
- [ ] emit collision/manifest paths;
- [ ] installer target and asset paths;
- [ ] Claude PreToolUse;
- [ ] Codex pre/post tool hooks.

#### Tests

- [ ] sibling-prefix escape;
- [ ] `..`/mixed separator;
- [ ] case variance theo platform;
- [ ] symlink và Windows junction escape;
- [ ] drive mismatch, UNC/device path;
- [ ] path có space/Unicode;
- [ ] `*`, `**`, zero-segment và regex metacharacter cases;
- [ ] differential fixture: mọi consumer trả cùng match result.

### 7.2. P4.2 — protected artifact ownership (B2a)

- [ ] `classifyArtifact` nhận canonical relative path, không tự normalize
  lại.
- [ ] Bỏ authority bằng `includes`, `endsWith`, basename hoặc suffix.
- [ ] Managed outputs lấy exact path set từ active catalog/manifest.
- [ ] Engine-policy chỉ bảo vệ exact installed asset path; không
  false-deny user paths như `src/schemas/`.
- [ ] `authorizeMutation` nhận catalog/active manifest/runtime snapshot
  qua typed input, không đọc list hardcode.
- [ ] Internal capability opaque/unforgeable, chỉ Core issuer tạo được.
- [ ] Capability bind action, exact path set, state revision, session,
  expiry và consumption.
- [ ] Scratch capability bind session/question, containment, extension,
  schema, size, depth và TTL.
- [ ] `plan-validating` không blanket-allow `.design-everything/**`,
  `Design/**` hay `docs/**`.
- [ ] Positive controls cho legitimate Core transaction/recovery và
  negative controls cho lookalike paths/forged capability.

### 7.3. P4.3 — shell command classifier (B2b)

- [ ] Chuẩn hóa host input thành structured argv khi host cung cấp.
- [ ] Raw command dùng parser riêng cho Bash, PowerShell và cmd; không
  `split(/\s+/)`.
- [ ] Quote/operator/nested-shell không hiểu chắc phải `unknown` và fail
  closed ở protected phase.
- [ ] `git branch` chỉ read-only khi không có branch/ref mới và mutation
  flags.
- [ ] `git -C`, `--git-dir`, `--work-tree` phải resolve trong workspace.
- [ ] `find` chỉ read-only cho grammar đã chứng minh; phát hiện
  `-delete`, `-exec`, `-execdir`, output redirection và aliases.
- [ ] Executable basename không phải proof.
- [ ] Xóa `safeCmds` khỏi `evaluatePreAction`.
- [ ] Xóa CLI marker/subcommand substring allow.
- [ ] Codex `post-tool-use.mjs` không còn homegrown `matchGlob`.
- [ ] Interview, plan-validating, executing, recovery và wrapper đều gọi
  cùng classifier.

### P4 exit criteria

- Không còn `matchGlob`, `safeCmds`, path substring/basename authority
  trong production Core/adapters/hooks.
- Mọi path policy consumer nhận branded canonical path.
- Cùng fixture cho gate, ownership, active task và hooks trả cùng kết
  quả/reason code.
- Unknown shell form không được tự suy thành read-only.

### Commit slicing đề xuất

1. `test(policy): add cross-consumer path differential fixtures`
2. `fix(policy): enforce canonical workspace paths at every consumer`
3. `fix(policy): bind ownership to catalog and active manifests`
4. `fix(policy): route all shell authorization through classifier`

---

## 8. P5 — gate recomputation và runtime health

### 8.1. P5.1 — gate snapshot (B2d)

- [ ] `buildGateSnapshot` nhận:
  active emit manifest, canonical store revision, execution state,
  validation record và evidence store.
- [ ] Requirement match exact canonical relative path; bỏ basename và
  suffix fallback.
- [ ] Required artifact phải là regular file, non-empty, có trong active
  manifest và digest khớp.
- [ ] Missing, unreadable, directory hoặc symlink escape luôn
  `exists=false`.
- [ ] Validation pass bind current plan/docs/manifest digests.
- [ ] Evidence bind task ID, command digest, result digest, exit class và
  current execution revision.
- [ ] `gates_passed` nếu còn tồn tại chỉ là replace-all derived cache có
  `input_digest`; không merge stale flags.
- [ ] Hooks không tự write gate cache; chỉ Core transaction được update.
- [ ] Sửa/xóa artifact sau gate pass phải đóng gate ở lần evaluate kế.

### 8.2. P5.2 — runtime health (B2e)

- [ ] Parse install manifest theo schema; verify runtime/schema/catalog
  version, build hash, từng asset hash và hook IDs.
- [ ] Kiểm tra canonical interview store.
- [ ] Kiểm tra execution state theo phase.
- [ ] Kiểm tra execution plan, profile, policy, catalog, active
  tier-1/tier-2 manifests và deepen assets.
- [ ] `uninvolved` chỉ khi không có install marker, canonical marker,
  managed manifest hoặc managed artifact.
- [ ] Installed/partially installed nhưng thiếu state/asset là `broken`.
- [ ] `status`, `next`, hooks, wrapper và skills dùng cùng
  `HealthReport`.
- [ ] Giữ recovery authorization exact; thêm regression cho `node` và
  command lookalikes.
- [ ] SessionStart không swallow recover/migrate/health failure; trả
  structured block kèm exact recovery command.
- [ ] Mọi consumer map cùng corruption sang cùng reason/exit class.

### Tests bắt buộc

- [ ] delete/modify artifact sau gate pass;
- [ ] required file trùng basename ở directory khác;
- [ ] stale validation/evidence digest;
- [ ] missing manifest file;
- [ ] wrong asset hash/hook ID/catalog version;
- [ ] deleted legacy progress nhưng canonical install tồn tại;
- [ ] partial install;
- [ ] corrupt canonical store ở status/next/hook;
- [ ] recovery command exact match và lookalike denial.

### Exit criteria

- Gate là phép tính lại từ bytes + active manifests + evidence hiện tại.
- Xóa legacy progress không biến installed target thành uninvolved.
- Một corruption có cùng `HealthReport`, reason code và exit class ở mọi
  entry point.

### Commit slicing đề xuất

1. `fix(core): recompute gates from active manifests and bound evidence`
2. `fix(core): make runtime health manifest-complete and fail-closed`
3. `refactor(adapters): consume one health report across entry points`

---

## 9. P3 — atomic handoff và typed blocked remediation

### 9.1. P3.1 — design/build handoff (B1c)

- [ ] Chốt canonical interview phase là `ready-for-validation`.
- [ ] `ready-to-build` chỉ được chấp nhận trong migrator/legacy schema,
  sau đó normalize sang canonical phase.
- [ ] Tạo `completeTier1Activation` nhận:
  canonical expected revision, active emit manifest, plan/docs digests
  và validation prerequisites.
- [ ] Service tạo execution state `plan-validating`.
- [ ] Interview phase, execution-state activation và emit manifest nằm
  trong cùng recovery journal/generation decision.
- [ ] Missing/corrupt execution state sau installed emit luôn deny.
- [ ] Xóa/deprecate null-state allow ở `checkExecutionGate`.
- [ ] `evaluateBuildReadiness` là authority duy nhất cho handoff.
- [ ] Trước `ready-to-execute`, source mutation luôn bị từ chối.

### 9.2. P3.2 — typed blocked state (B1d)

- [ ] Thay `block_reason: string` bằng typed record, tối thiểu có:
  `kind`, `code`, `at_revision`, `task_id`, `recoverable_by`,
  `required_proof`, `created_at`.
- [ ] Viết migrator cho legacy string.
- [ ] `allowedRemediation(state)` trả exact action, paths/command,
  task/block kind và revision.
- [ ] Hook cho phép đúng remediation được khai báo, không deny-all và
  không blanket recovery allow.
- [ ] `validate` chỉ recover validation/integrity/snapshot-stale khi có
  proof tương ứng.
- [ ] Verification failed/aborted giữ active task/evidence.
- [ ] Next-step render trực tiếp từ `recoverable_by`.
- [ ] Stale remediation token/revision hoặc action ngoài scope bị deny.

### Exit criteria

- Tier-1 success luôn tạo execution state `plan-validating`.
- Không tồn tại state docs-active nhưng interview/execution state cũ.
- Mỗi blocked kind có positive remediation control và negative
  out-of-scope controls.

### Commit slicing đề xuất

1. `feat(state): add typed blocked records and remediation policy`
2. `feat(core): add atomic tier1 handoff service`
3. `refactor(policy): make build readiness the sole handoff authority`

---

## 10. P6 — answer, slots, provenance và catalog consumers

### 10.1. Answer/slot validation (B3a)

- [ ] CLI/application service load current question contract.
- [ ] Enforce `required`, trim, placeholder, `min_items`,
  `required_fields`, enum, pattern và bounded structure.
- [ ] `needs_user_ack` tạo explicit prompt + capability riêng; model
  không tự ack.
- [ ] `loadQuestionSlots` nhận absolute workspace root và canonical
  scratch path.
- [ ] Enforce recipe/question allowlist, file size/depth/type, source
  revision và producer version.
- [ ] Raw answer revision, typed slots, provenance và capability
  consumption commit atomically.
- [ ] Correction tạo revision `supersedes`, không overwrite answer đã
  xác nhận.

### 10.2. Derived provenance/quality (B3b)

- [ ] Runtime thực thi `derived-recipes.yaml`.
- [ ] Mỗi derived block có SourceRef, source revision digest,
  producer/version và coverage.
- [ ] Missing source render `⚠ unknown — cần hỏi người`, không biến
  inference thành fact.
- [ ] Emit validation chặn derived assertion thiếu provenance/unknown
  policy.
- [ ] Weak-executor fixtures bao phủ missing/ambiguous source.

### 10.3. Catalog consumers (B3c)

- [ ] Giữ một compiler/catalog authority.
- [ ] Ownership, gate, installer asset list, emit, docs count/journey và
  parity manifest đều lấy từ catalog.
- [ ] Không copy path/count list vào CLI, skills hoặc docs.
- [ ] Catalog digest giống nhau giữa Core, installed runtime, Claude và
  Codex.

### Exit criteria

- CLI commit thật lưu answer/slots/provenance vào canonical transaction.
- Không derived assertion thiếu SourceRef/unknown marker vượt emit
  validation.
- Catalog path/count/digest chỉ có một nguồn máy đọc.

---

## 11. P7 — transactional tier-1/tier-2 activation

Channel isolation đã có; pha này hoàn tất transaction orchestration và
atomic state activation.

### 11.1. P7.1 — tier-1 application service (B3d)

- [ ] Tạo một public application service cho production `emit`:
  1. load canonical store và verify expected revision;
  2. render `emitTree`;
  3. `prepareEmit`;
  4. `validateStagedEmit`;
  5. yêu cầu acknowledgement cho blocking warning;
  6. `activateEmit`;
  7. gọi atomic handoff P3;
  8. trả exact paths/digests từ active manifest.
- [ ] Journal cover docs, plan, manifest, canonical interview phase và
  execution state.
- [ ] Collision, revision mismatch, recovery-required hoặc partial
  activation không trả success.
- [ ] Xóa direct-write loop/business logic khỏi CLI.
- [ ] Không fallback đọc `tier1-manifest.json`; active channel manifest
  là authority duy nhất.
- [ ] CLI JSON success chỉ xuất sau complete activation.

### 11.2. P7.2 — tier-2 module isolation (B3e)

- [ ] Mỗi module có manifest/journal riêng hoặc generation map riêng;
  re-emit module A không xóa module B.
- [ ] `emitTier2.ts` dùng shared stage → validate → activate kernel,
  không chỉ per-file atomic write.
- [ ] Tier-2 commit dùng capability + canonical store transaction.
- [ ] Plan-affecting module atomically chuyển gate snapshot sang typed
  stale/blocked state.
- [ ] Chốt rerun semantics:
  amendment/version record, hoặc sửa contract/approve rõ nếu giữ
  overwrite.
- [ ] Manifest result chứa module, source revision, prior generation,
  active generation và exact artifact digests.

### 11.3. Fault-injection seam

- [ ] render;
- [ ] stage;
- [ ] staged validation;
- [ ] backup;
- [ ] first/last promotion;
- [ ] manifest activation;
- [ ] interview-state activation;
- [ ] execution-state activation;
- [ ] stale-gate transition;
- [ ] cleanup;
- [ ] restart recovery.

Fault tests phải đi qua public CLI/application service, không chỉ import
transaction primitives.

### Exit criteria

- Production `emit` chỉ gọi application service.
- Crash ở mọi boundary cho old hoặc new generation, không mixed
  docs/plan/manifest/interview/execution state.
- Tier-2 module isolation có regression proof.
- CLI không có catch branch biến partial failure thành success.

### Commit slicing đề xuất

1. `feat(core): add tier1 activation application transaction`
2. `refactor(adapters): route emit through activation service`
3. `feat(core): isolate tier2 module generations`
4. `test(qa): inject public emit activation faults`

---

## 12. P8 — hoàn tất hook và shared CLI production wiring

### Hook adapters

- [ ] SessionStart thực thi đúng:
  install manifest → recover → migrate → health → inject.
- [ ] Không còn legacy progress initialization ở cuối pipeline.
- [ ] UserPromptSubmit chỉ map host context và issue canonical
  capability.
- [ ] PreToolUse chỉ map host payload sang Core request và serialize
  Core decision.
- [ ] Session ID lấy từ canonical host/session context, không hardcode.
- [ ] Map đầy đủ MultiEdit, NotebookEdit, delete, rename và shell
  mutation.
- [ ] Uninstalled thật mới bypass; bất kỳ install/canonical/managed
  marker nào đều phải health-check.
- [ ] Codex post-hook dùng shared path policy, không có `matchGlob`.

### Wrapper/CLI

- [ ] Resolver verify exact target-local launcher path, version và hash
  từ install manifest.
- [ ] Hỗ trợ quoted path có space/Unicode.
- [ ] Không gọi authorizer với runtime snapshot `null`.
- [ ] Mỗi subcommand map sang Core authorization; unknown default deny.
- [ ] `init`, `repair`, `validate`, `emit`, `deepen` không blanket allow.
- [ ] Mỗi operation chỉ gọi Core service; không fork policy/state logic.
- [ ] Stable exit classes: usage, policy/validation, health/integrity,
  conflict, internal.
- [ ] JSON stdout có đúng một envelope; diagnostics ở stderr; mặc định
  redact stack/sensitive path/token.
- [ ] Blocking warning chưa ack trả `ok=false`.
- [ ] `status`/`next` không catch corruption thành null/uninvolved.

### Exit criteria

- Adapter không còn homegrown state/path/command/gate mutation.
- Không production authorization call nào truyền null snapshot.
- Claude/Codex dùng cùng Core reason code và state digest cho cùng
  fixture.

---

## 13. P9 — self-contained installers và Claude/Codex parity

### 13.1. Claude installer (B4d)

- [ ] Build versioned target-local bundle dưới
  `.design-everything/runtime/<version>/`.
- [ ] Asset set lấy từ authoritative catalog, gồm:
  launcher/runtime, deepen scripts, policy, shapes/templates, catalog,
  recipes và schemas/version.
- [ ] Install manifest chứa runtime/schema/catalog version, build hash,
  từng file hash, stable hook IDs, target root và engine range.
- [ ] Hooks/skills chỉ trỏ target-local relative layout; bỏ dependency
  vào source checkout/`ENGINE_ROOT`.
- [ ] `ensureHook` match exact stable hook ID + event.
- [ ] Repair stale path/hash/version nhưng giữ custom hooks byte-for-byte.
- [ ] Backup settings trước mutation.
- [ ] Stage toàn bộ install rồi atomic activate; manifest chỉ xuất hiện
  sau khi bundle/settings pass health.
- [ ] Post-install spawn target-local CLI health.
- [ ] Completion text lấy từ `renderNextStep`; không claim gate mở.

### 13.2. Codex parity (B4e)

- [ ] Codex installer luôn nhận target/package output rõ; test/install
  không ghi vào source tree.
- [ ] Codex hooks/skills dùng shared Core policy.
- [ ] Xóa homegrown post-tool matcher.
- [ ] Claude và Codex dùng cùng runtime bundle, manifest schema,
  catalog/deepen assets và hashes.
- [ ] Capability matrix ghi rõ hard hook của Claude và soft-enforcement
  giới hạn của Codex.
- [ ] Replay cùng fixture phải giống decision, reason code, revision và
  state digest; presentation khác phải được khai báo.

### 13.3. Packaging layout

- [ ] Chọn đúng một layout package hiện hành; không silent đổi contract.
- [ ] Đồng bộ `tsconfig`, `main`, `exports`, `files`, hook resolver và
  installer theo layout đó.
- [ ] `npm pack --dry-run`/tarball inspection assert entrypoint và toàn
  bộ catalog-declared runtime assets tồn tại.
- [ ] Package không chứa source-only absolute/path assumptions.

### Installed-runtime tests

- [ ] Target path có space/Unicode.
- [ ] Rename/hide/remove source checkout sau install.
- [ ] Target-local `status`, hook, commit, deepen và emit vẫn chạy.
- [ ] Rerun installer repair đúng stale hook/assets, không duplicate.
- [ ] Interrupted install giữ old healthy generation.
- [ ] Tampered asset hash làm health fail closed.
- [ ] Claude/Codex parity replay từ installed bundle, không source
  imports.

### Exit criteria

- Cả hai adapter hoạt động sau khi source checkout biến mất.
- Install/repair atomically tạo đúng manifest và stable hook set.
- Bundle/hash/catalog parity được machine-check.

### Commit slicing đề xuất

1. `feat(installer): build target-local versioned runtime bundle`
2. `fix(installer): atomically install and repair exact hooks`
3. `feat(codex): consume shared installed runtime`
4. `test(qa): verify moved-source runtime and adapter parity`

---

## 14. P10 — skill truth closeout

- [ ] Hoàn tất H0 và kiểm tra lại mọi `--turn`/`TURN_ID`.
- [ ] Claude/Codex có đầy đủ executable commands cho:
  opt-in, next, commit, deepen commit, emit, validate và build handoff.
- [ ] User-visible derived content giữ SourceRef và
  `⚠ unknown — cần hỏi người`.
- [ ] Scope guard nói rõ trước handoff không tự ghi ngoài managed
  flow/scratch contract.
- [ ] Mọi state mutation qua CLI; không hướng dẫn sửa tay state/answers.
- [ ] Emit success chỉ nói docs đã activate, plan chưa validate.
- [ ] Non-zero/health error dừng flow và hiển thị exact `next_command`.
- [ ] Generate/share command, health và handoff blocks để hai skills
  không drift.
- [ ] Skill fixture chạy trên installed target thật.

### Exit criteria

- Không snapshot nào claim code-ready trước `ready-to-execute`.
- Skill docs, CLI help, quickstart và runtime behavior cùng command
  shape/outcome.

---

## 15. P11 — rebuild B5 evidence sau implementation

Không nâng `proof_status` chỉ vì suite tồn tại. Mỗi suite phải chạy qua
public/installed seams đúng contract.

### 15.1. B5a — installed-runtime adversarial

- [ ] Mọi test gọi target-local hook/CLI/bundle.
- [ ] Metadata map đúng U01–U08, X01–X24 và R01–R20.
- [ ] Assert decision, reason code, exit code, revision, capability
  state và filesystem bytes.
- [ ] Positive control cho từng legitimate read-only/recovery/active-task
  allow.
- [ ] Space/Unicode/moved-source bắt buộc.

### 15.2. B5b — transaction fault injection

- [ ] Fault qua public CLI/application service.
- [ ] Interview boundary matrix từ P2.2b.
- [ ] Emit boundary matrix từ P7.
- [ ] Hard-kill critical boundaries rồi restart target-local CLI.
- [ ] Recovery lần một sửa, lần hai no-op.
- [ ] Assert không mixed answers/slots/capability hoặc
  docs/plan/state.

### 15.3. B5c — journey/quality

- [ ] Journey qua commit/emit/build CLI thật.
- [ ] Golden outputs lưu inputs, SourceRefs, digests và producer version.
- [ ] Deterministic rubric có per-artifact assertions.
- [ ] Nếu contract giữ tuyên bố human review: hai reviewer độc lập,
  role/version/date, disagreement và adjudication artifacts.
- [ ] Nếu không có human review thật: downgrade contract/report thành
  limitation, không claim đạt.
- [ ] Thu metrics thật: steps-to-first-valid-task, retries, false
  allow/deny, unresolved warnings.

### 15.4. B5d — machine truth

- [ ] Parse package, build/install manifests, Versioning,
  ConformanceMatrix và release notes rồi so equality.
- [ ] Journey/question/path/count lấy từ compiler/catalog.
- [ ] Quickstart test theo structure, commands và outcome.
- [ ] Link checker kiểm tra active docs với explicit historical allowlist.
- [ ] Release proof đọc generated test report, không hardcode counts.
- [ ] Finding matrix lint cấm proof `VERIFIED` khi primary implementation
  dependency chưa `IMPLEMENTED`.

### Exit criteria

- B5a–B5d chỉ `VERIFIED` khi primary dependencies đã `IMPLEMENTED`.
- Evaluation report dẫn đến artifacts/reports có thể kiểm chứng.
- Không còn `UNIT_ONLY`, `MISSING` hoặc false-green evidence cho release
  findings.

---

## 16. P12 — typecheck, package, version và release cut

### 16.1. Typecheck/package

- [ ] Thêm `tsconfig.test.json` hoặc project references để typecheck
  `src/**/*.test.ts` và `test/**/*.ts` với `noEmit`.
- [ ] Thêm `npm run typecheck:all` vào CI/release gate.
- [ ] Production build không emit tests.
- [ ] Tarball inspection verify `main`, `exports`, `files` và runtime
  assets thật tồn tại.

### 16.2. Version truth

- [ ] Trong thời gian sửa, giữ package 6.0.0 và release
  `UNRELEASED/BLOCKED`.
- [ ] Chọn một source version từ `package.json` hoặc release manifest.
- [ ] Generate/inject runtime version; không hardcode version trong
  operation/tests.
- [ ] Tests so với source version, không `toBe('6.0.0')` hay
  `toBe('7.0.0')`.
- [ ] Dọn duplicate/mislabeled ConformanceMatrix entries.
- [ ] Chỉ sau khi P0–P11 pass mới bump 7.0.0 và generate lại
  docs/manifests.

### 16.3. Final release gate

- [ ] 24 contract có:
  spec `APPROVED`, implementation `IMPLEMENTED`, proof `VERIFIED`.
- [ ] Finding matrix không còn release finding `OPEN`, `MISSING`,
  `UNIT_ONLY` hoặc dependency chưa implement.
- [ ] `npm run typecheck:all`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] installed-runtime moved-source suite
- [ ] public-seam fault-injection suite
- [ ] `npm pack --dry-run` + tarball inspection
- [ ] docs/version/release truth suite
- [ ] clean target install + repair smoke

### Exit criteria

- Release claim được sinh từ machine evidence hiện tại.
- Không dùng hardcoded test count, contract count, asset count hoặc
  version literal làm proof.
- Version bump là commit cuối sau tất cả gate; không dùng bump để “đánh
  dấu đang làm”.

---

## 17. PR/commit delivery map

| Delivery | Phạm vi | Không gộp |
|---|---|---|
| D0 | H0 stale Codex skill hotfix | Không gộp store refactor |
| D1 | P2.2a red tests + canonical services | Không gộp durability |
| D2 | P2.2a consumer cutover + legacy retirement | Không gộp policy |
| D3 | P2.2b locks/journal/recovery | Không gộp emit journal |
| D4 | P4.1 path policy + differential tests | Không gộp command parser |
| D5 | P4.2 ownership/catalog/capabilities | Không gộp installer |
| D6 | P4.3 shell classifier cutover | Không gộp handoff |
| D7 | P5 gate recomputation | Không gộp health refactor |
| D8 | P5 runtime health + shared consumers | Không gộp installer |
| D9 | P3 typed blocked + handoff | Không gộp tier-1 emit |
| D10 | P6 answer/slots/provenance/catalog | Không gộp evidence claims |
| D11 | P7 tier-1 activation | Không gộp tier-2 isolation |
| D12 | P7 tier-2 isolation + public faults | Không gộp adapter packaging |
| D13 | P8 final hook/CLI wiring | Không gộp installer |
| D14 | P9 Claude self-contained installer | Không gộp Codex parity |
| D15 | P9 Codex parity + moved-source tests | Không gộp release bump |
| D16 | P10 skill truth | Không gộp version bump |
| D17 | P11 B5 evidence rebuild | Không chỉnh contract status bằng tay |
| D18 | P12 package/typecheck/truth | Version vẫn 6.0.0 |
| D19 | Final verified release cut | Chỉ chạy khi toàn bộ gate pass |

Mỗi delivery phải:

- có issue/finding IDs;
- có red test hoặc evidence gap trước patch;
- cập nhật matrix bằng machine-derived status khi có thể;
- chạy targeted tests, typecheck/lint liên quan;
- không thay đổi contract semantics ngoài phạm vi mà không có approval.

---

## 18. Verification matrix theo milestone

### Sau mỗi commit

- [ ] targeted unit/component test cho seam vừa sửa;
- [ ] lint/typecheck module liên quan;
- [ ] `git diff --check`;
- [ ] kiểm tra không có unrelated generated files.

### Sau P2.2

- [ ] canonical authority conflict suite;
- [ ] capability concurrency suite;
- [ ] migration/corruption suite;
- [ ] interview public-seam fault matrix;
- [ ] full current test suite.

### Sau P4/P5

- [ ] cross-consumer path differential suite;
- [ ] shell classifier adversarial suite cho Bash/PowerShell/cmd;
- [ ] gate recomputation suite;
- [ ] health parity ở status/next/hooks/wrapper;
- [ ] full current test suite.

### Sau P3/P6/P7/P8

- [ ] handoff/typed blocked transition suite;
- [ ] answer/slot/provenance fixtures;
- [ ] tier-1/tier-2 public fault matrix;
- [ ] Claude/Codex policy replay;
- [ ] full current test suite.

### Sau P9/P10

- [ ] clean target install;
- [ ] moved/hidden source checkout;
- [ ] hook/status/next/commit/deepen/emit smoke;
- [ ] repair/idempotency/tamper tests;
- [ ] executable skill journey.

### Trước P12 release cut

- [ ] B5a/B5b/B5c/B5d reports regenerated;
- [ ] `typecheck:all`, lint, build, full tests;
- [ ] package tarball inspection;
- [ ] all contract/finding dependencies machine-checked;
- [ ] clean release worktree and no stale generated truth.

---

## 19. Definition of Done toàn chương trình

Chỉ coi `v1-fix-bugs` hoàn tất khi đồng thời thỏa:

- [ ] canonical store là authority duy nhất;
- [ ] capability + expected revision bắt buộc ở mọi mutation;
- [ ] interview và emit crash recovery cho old/new generation, không
  mixed state;
- [ ] path, ownership, command, gate và health có một Core authority;
- [ ] handoff và blocked remediation typed, fail closed;
- [ ] tier-1/tier-2 production emit qua transaction services;
- [ ] adapters không chứa policy fork hoặc null runtime snapshot;
- [ ] installers target-local, atomic, self-contained và repairable;
- [ ] Claude/Codex parity được chứng minh trên installed runtime;
- [ ] skills có executable, truthful commands;
- [ ] B5 evidence đi qua public seams và có artifacts thật;
- [ ] package/typecheck/version/docs/release truth khớp machine sources;
- [ ] 24 contract đạt đủ ba trục
  `APPROVED / IMPLEMENTED / VERIFIED`;
- [ ] release chỉ được unblocked ở commit cuối.

---

## 20. Công việc nên bắt đầu ngay

1. Sửa H0 trong Codex build skill và thêm executable regression fixture.
2. Viết `canonical-authority` red tests cho canonical/legacy conflict,
   corruption và null expected revision.
3. Tạo `issuePromptCapability` và `commitInterviewAnswer` application
   services.
4. Cut over `UserPromptSubmit` và shared CLI khỏi `progress.json`.
5. Cut over SessionStart, runtime health, PreToolUse và Codex marker
   logic.
6. Retire production `loadProgress/saveProgress`.
7. Chạy full regression trước khi bắt đầu durability P2.2b.

Không bắt đầu P9 packaging trước khi P4–P8 đã ổn định public interfaces;
nếu làm sớm sẽ phải bundle và test lại policy/state logic nhiều lần.
