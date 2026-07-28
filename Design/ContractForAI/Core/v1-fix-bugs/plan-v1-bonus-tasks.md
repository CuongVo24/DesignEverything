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
| H0 — stale skill command | Closed 2026-07-25 | Doc/skill fixed; `deepen` CLI wiring vẫn nợ P6/P7 |
| P2.2a — canonical authority | Partial (core+adapters done 2026-07-25) | interview/commit path chạy qua canonical; `evaluatePreAction` caller-injection và `deepen` chưa nối (P4/P6/P7/P8) |
| P2.2b — durability/lock | Partial (2026-07-25) | lock nonce/liveness + fsync + migration validation done; multi-file journal marker đánh giá không cần cho seam 1-file này |
| P4 — policy | Partial (bugs cụ thể đã sửa 2026-07-26) | sibling-prefix escape, `**` zero-segment, `evaluatePreAction`/Codex post-hook safe-list & matchGlob riêng, git branch/-C scope đã sửa; capability architecture, `plan-validating` blanket-allow, raw shell parser vẫn nợ |
| P5 — gate/health | Partial (bugs cụ thể đã sửa 2026-07-26) | gate fail-open + basename fallback + null-state allow + recovery substring-injection đã sửa; manifest/hash/hook-ID binding và catalog/tier1-2 health check vẫn nợ |
| P3 — handoff/blocked | Partial (2026-07-26) | `completeTier1Activation` nối vào production emit; blocked-phase giờ theo `allowedRemediation` thay vì deny-all/blanket-allow; `evaluateBuildReadiness` có production caller thật (`next`). `ready-for-validation` rename, atomic single-transaction journal (interview phase + emit manifest + exec state cùng lúc), và `handleStart` cùng authority vẫn chưa làm |
| P6 — answer/provenance/catalog | 10.1/10.2/10.3 done 2026-07-28 | `commitInterviewAnswer` load `answer_contract` thật, enforce `pattern`/`enum_values`/`required`/`min_items`/`required_fields`/`warning_rules`→`needs_user_ack`; `--slots-file` (mechanism thật theo SKILL.md, khác `loadQuestionSlots` — xem §10.1) commit atomic cùng transaction với answer, slot resubmit ghi `corrections`; derived-recipes có executor tối thiểu (`runDerivedRecipe`, chưa validate structured items thật vì chưa renderer nào tạo ra) và đã wire cảnh báo (warning-severity) vào `validateStagedEmit`; catalog `{placeholder}` matcher có bug thật đã sửa (chưa từng match gì), `artifactOwnership`/`evaluatePreAction` write-gate giờ dùng catalog thật (trừ interview-phase doc-write bypass — cố tình không đụng, xem P4.2) |
| P7 — transactional emit | Tier-1 done 2026-07-26; **Tier-2 (P7.2) done 2026-07-28** | Production `emit` gọi `activateTier1Emit` qua kernel có sẵn. Tier-2: mỗi module giờ có channel/manifest/journal riêng (`tier2-${module}`), qua cùng kernel `prepareEmit`/`activateEmit`; `repair` recover đúng từng channel (trước đây recover 1 channel chết, luôn no-op); module plan-affecting (adr/test-strategy) giờ invalidate execution-state qua `invalidateSnapshotForTier2` (hàm có sẵn, trước không ai gọi); có test isolation (re-emit module A không đụng B, kể cả khi crash-recovery) và idempotent-repair. `activateTier1Emit`/`completeTier1Activation` vẫn 2 lời gọi riêng (không cùng transaction); fault-injection còn thiếu crash-worker hard-kill thật (chỉ có hand-crafted-journal, xem 11.3) |
| P8 — adapter production wiring | Done 2026-07-28 | `authorizeCliOperation` (authority song song, 0 import từ Core) đã xóa hẳn. Subcommand/phase table port nguyên vẹn vào Core (`classifyCliSubcommand`), `evaluatePreAction` dùng nó cho MỌI CLI-shaped shell command (kể cả no-execState/interview — trước đây không có CLI awareness ở nhánh này, chỉ được che bởi wrapper bypass); `.mjs` wrapper giờ chỉ tokenize (giữ `resolveCliInvocation`) rồi fall through `onPreToolUse` — không còn tự quyết định. `action_kind` có `delete`/`rename` (typed-gap, chưa caller nào dùng, cố tình không wire rm/mv shell — xem P8.5 vì sẽ nới lỏng default hiện tại). `action_kind: 'delete' | 'rename'` chưa map từ MultiEdit/NotebookEdit/native delete tool (không có tool nào cần) |
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

## 4. H0 — hotfix stale Codex deepen command — DONE (2026-07-25, `fbcf256`)

### Phạm vi

- `adapter/codex-plugin/skills/design-everything-build/SKILL.md`
- shared/generated skill command blocks nếu có
- skill snapshot/integration fixtures liên quan

### Công việc

- [x] Thay:
  `deepen --module <id> --commit --turn <TURN_ID> ...`
  bằng command nhận `--capability-token <TOKEN>`. Cả Codex
  (`adapter/codex-plugin/skills/design-everything-build/SKILL.md`) và
  Claude (`adapter/claude-code/skill/SKILL.md`) đã dùng cùng shape
  `--capability-token <TOKEN>`.
- [x] Ghi rõ token chỉ đến từ hook/runtime context, người dùng/model
  không tự tạo token — cả hai SKILL.md đều có câu "KHÔNG dùng `--turn
  <id>` — cờ này không còn được engine chấp nhận làm căn cứ uỷ quyền."
- [x] Tìm toàn bộ production docs/skills cho `--turn`, `TURN_ID`,
  `userTurnId`; xác nhận qua `rg` — mọi hit còn lại là negative
  documentation (SKILL.md cảnh báo không dùng), user-facing Vietnamese
  copy nhắc "không dùng --turn tự đặt", hoặc field
  `userTurnId?: string` ở `userPromptSubmit.ts` đã gắn
  `@deprecated unused` — không còn seam executable nào chấp nhận nó
  làm authorization.
- [x] Thêm executable skill fixture chạy đúng command mới:
  `test/integration/installed-runtime/cli-health.test.ts` pin hành vi
  `UNKNOWN_SUBCOMMAND` fail-closed cho shape `--capability-token` mới
  (đúng như tài liệu SKILL.md dạy) — chưa phải success fixture thật vì
  `deepen` chưa có case trong dispatcher (X01, thuộc P6/P7), nhưng đã
  chứng minh command shape đúng contract không bị misclassify thành gì
  khác.
- [x] Thêm negative fixture chứng minh `--turn` bị từ chối: cùng file,
  test "reject commit without --capability-token even with a
  plausible-looking --turn flag" và test riêng cho stale `deepen
  --turn` shape.

### Exit criteria

- [x] Không còn hướng dẫn executable nào dùng self-declared turn ID.
- [x] Claude và Codex hiển thị cùng command shape cho commit/deepen
  (`--capability-token <TOKEN>`).
- [~] Skill truth test chạy trên target-local command fixture, không
  chỉ regex keyword: fixture hiện chạy qua CLI thật (`execFileSync`
  installed-runtime), không phải regex-only — nhưng vì `deepen` chưa
  wired, fixture chỉ pin fail-closed, chưa pin một success path thật.
  Đủ cho scope H0 (doc/skill truth); success fixture thật cho `deepen`
  thuộc P6/P7.

### Commit đề xuất — đã thực hiện

`fix(skill): remove stale Codex deepen turn-id command` (commit `fbcf256`)

---

## 5. P2.2a — canonical interview store authority cutover

### Mục tiêu

Chỉ canonical envelope dưới `.design-everything/` được quyết định
interview phase, revision, answers/slots và capability state.
`progress.json`/legacy answers chỉ được đọc bởi migrator.

### 5.1. Red tests trước — DONE (2026-07-25, `src/core/canonicalAuthority.test.ts`)

- [x] `canonical-authority.test.ts`: canonical và `progress.json` bất
  đồng; mọi production consumer phải theo canonical.
- [x] Corrupt canonical + valid legacy phải fail closed, không fallback.
- [x] Valid canonical + corrupt legacy vẫn hoạt động và không đọc legacy.
- [x] Missing canonical + legacy hiện hữu phải chạy migrator đúng một
  lần, tạo immutable backup rồi dùng canonical.
- [x] Missing cả hai ở workspace uninvolved chỉ đi qua explicit
  initializer.
- [x] Hai writer cùng expected revision: đúng một success, loser nhận
  stable revision-conflict code.
- [x] `expectedRevision = null` bị từ chối ở mọi mutation public
  (runtime guard, không chỉ static type).

### 5.2. Application services — PARTIAL (2026-07-25, `src/core/interviewApplicationServices.ts`)

- [x] Tạo service `initializeInterviewStore` dành riêng cho empty target.
- [x] Tạo service `issuePromptCapability`:
  load/validate canonical → verify expected revision → issue token →
  persist hash/status/revision atomically → trả plaintext token đúng một
  lần.
- [x] Tạo service `commitInterviewAnswer`:
  verify token/hash/binding → validate answer → consume token →
  append revision → advance state trong một transaction.
  (slots/provenance chưa nối — thuộc P6.)
- [ ] Tạo service tương đương cho deepen commit, dùng cùng transaction
  kernel. **Chưa làm**: `deepen` vẫn chưa có case nào trong
  `cliOperations.ts` (xem H0/finding X01) — không có production consumer
  nào để nối vào, thuộc P6/P7.
- [x] Public mutation API bắt buộc `expectedRevision: number`; không
  chấp nhận `null`.
- [x] Initializer dùng API riêng (`initializeInterviewStore`), không dùng
  `transactInterviewStore` với sentinel `null`.
- [~] Chuẩn hóa error/result codes: đã có `STORE_MISSING`, `STORE_CORRUPT`,
  `REVISION_CONFLICT`, `TURN_CAPABILITY_*`, `MIGRATION_REQUIRED`,
  `STORE_ALREADY_EXISTS`, `INVALID_EXPECTED_REVISION`. Chưa có
  `STORE_VERSION_UNSUPPORTED`, `RECOVERY_REQUIRED` (không có seam nào cần
  chúng ở phase này).

### 5.3. Cut over production consumers — PARTIAL (2026-07-25)

- [x] `src/adapters/claude/userPromptSubmit.ts` không
  `loadProgress/saveProgress`; chỉ gọi `issuePromptCapability`.
- [x] `src/adapters/claude/sessionStart.ts` không tạo/validate
  `progress.json` sau health; dùng initializer/migrator/canonical load.
- [~] `src/adapters/shared/cliOperations.ts`:
  `status`, `init`, `commit`, `emit` đọc canonical service. `next` không
  chạm progress (chỉ execution-state, không cần đổi). `deepen` chưa tồn
  tại trong dispatcher (H0) — không có gì để cut over.
- [~] `src/core/evaluatePreAction.ts` đọc canonical store thay vì
  `progress.json`; đã thêm `request.progress` optional field để caller
  bơm snapshot trực tiếp, nhưng **chưa adapter nào thực sự bơm nó** — vẫn
  tự load canonical khi thiếu. "Nhận từ caller là bắt buộc duy nhất" chưa
  đóng, để lại cho P4/P8.
- [x] `src/core/runtimeHealth.ts` đã kiểm tra canonical store độc lập với
  `progress.json` từ trước (không cần sửa thêm ở slice này).
- [x] Claude (`session-start.mjs`, `user-prompt-submit.mjs`,
  `pre-tool-use.mjs`) và Codex (`pre-tool-use.mjs`) hook wrapper "chưa
  involved -> bypass" check nay xét cả canonical marker, không chỉ
  `progress.json`/`execution-state.json`. Phát hiện quan trọng: trước khi
  sửa, các wrapper `.mjs` này bypass hoàn toàn khi thiếu `progress.json`
  — nghĩa là sau khi ngừng ghi `progress.json`, hook UserPromptSubmit/
  PreToolUse thật sẽ tự vô hiệu hoá trên mọi dự án canonical-only. Unit
  test không bắt được vì gọi thẳng hàm TS, bỏ qua logic bypass của
  wrapper. Đã thêm regression test trong `hook-adversarial.test.ts`.
- [x] Journey/e2e fixtures (`web-flow`, `web-edge-cases`, `mobile-flow`,
  `mobile-edge-cases`, `preToolUse.test.ts`, `sessionStart.test.ts`,
  `evaluatePreAction.test.ts`) chuyển sang seed/read canonical qua
  `initializeInterviewStore`/`transactInterviewStore`/service helpers
  (`test/helpers/canonicalProgress.ts`) thay vì tự ghi `progress.json`.

### 5.4. Retire legacy authority — PARTIAL (2026-07-25)

- [~] `loadProgress/saveProgress` vẫn export từ `core/index.ts` (không xoá
  — nhiều fixture/migration test còn cần), nhưng import ngoài allowlist
  (`loadProgress.ts`, `index.ts`, `runtimeHealth.ts`) bị cấm bằng máy qua
  `src/core/legacyAuthorityBoundary.test.ts`.
- [x] Production code không còn write `progress.json` (đã xác nhận: không
  còn `saveProgress`/`writeFileSync(progressPath,...)` nào trong
  adapters/Core policy path).
- [ ] Compatibility read-only projection: **chưa cần/chưa làm** — không
  có consumer nào đang yêu cầu một bản chiếu `progress.json` public.
- [ ] `Design/.interview/answers.json` legacy: chưa đụng tới, vẫn thuộc
  phạm vi P6 (answer/slot/provenance).
- [x] Lint/architecture test cấm import legacy loaders ngoài allowlist:
  `src/core/legacyAuthorityBoundary.test.ts`.

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

## 6. P2.2b — durability, ownership lock và crash recovery — PARTIAL (2026-07-25)

### Lock ownership — DONE

- [x] Lock record chứa owner nonce ngẫu nhiên, PID, session ID,
  acquired-at và target/store identity.
- [x] Release chỉ xóa lock khi nonce/owner khớp
  (`releaseLock(workspaceRoot, nonce)`, no-op nếu sai nonce).
- [x] TTL đơn thuần không được phép xóa một lock còn sống — liveness
  (`process.kill(pid, 0)`) là tiêu chí chính; TTL 30s chỉ là fallback khi
  liveness không xác định được (lock record hỏng/legacy, hoặc platform
  probe không kết luận được).
- [~] Stale decision dùng policy đã test: process liveness — có test
  (`src/core/lockOwnership.test.ts`). "session/nonce, store revision và
  recovery marker" như tiêu chí staleness bổ sung — **chưa làm**: store
  interview-state chỉ là một file JSON atomic-rename, không có multi-step
  recovery marker như hệ emit tier1/tier2; đánh giá là không cần cho seam
  này, ghi lại rõ ràng thay vì âm thầm bỏ qua.
- [x] Lock contention có stable code (`LOCK_TIMEOUT`) và bounded retry
  (`Atomics.wait` backoff, tối đa 250ms/lần); không còn busy loop CPU-spin.

### Durable transaction — PARTIAL

- [x] Temp file nằm cùng volume/directory với canonical file (đã đúng từ
  trước, không đổi).
- [x] Explicit `write → fsync → close` trước rename
  (`writeEnvelopeAtomic`, reopen-to-fsync vì `injectFsFault` test helper
  chỉ patch được `writeFileSync`/`renameSync`, không patch `openSync`).
- [x] Atomic replace/rename: `fs.renameSync` (đã đúng từ trước) — có test
  fault-injection (`FI-04`).
- [x] Parent-directory fsync ở platform hỗ trợ (POSIX); Windows fallback
  wrap try/catch, document rõ NTFS rename/metadata journaling là guarantee
  thực tế trên platform này chạy — không có test riêng cho Windows
  fallback (chạy trực tiếp trên Windows nên nhánh catch luôn được exercise
  qua toàn bộ suite, nhưng không assert tường minh).
- [ ] Journal/commit marker hoặc generation pointer phân biệt
  old/new/prepared/interrupted: **chưa làm** — một file JSON atomic-rename
  duy nhất không có "partially renamed" state (rename POSIX/NTFS same-
  volume là atomic), nên đánh giá không cần journal riêng cho seam này,
  khác với hệ emit tier1/tier2 (nhiều file, cần journal thật). Ghi rõ đây
  là quyết định phạm vi, không phải bỏ sót.
- [x] Checksum/revision liên kết state+answers+slots
  (`computePayloadChecksum` cover toàn bộ payload, đã có từ trước).
  Capability consumption: nằm trong `payload.progress.pending_turn_capability`,
  cùng transaction — chưa có checksum riêng nhưng cùng envelope checksum.
- [x] Orphan cleanup dựa trên liveness/nonce, không chỉ timestamp (xem lock
  ownership ở trên — TTL chỉ còn là fallback).
- [x] Recovery idempotent: `FI-05` (hard-kill giữa commit) chứng minh lần
  đầu recover thành công, lần hai load lại không đổi state.

### Migration durability — DONE (2026-07-25, `src/core/migrationDurability.test.ts`)

- [x] Backup legacy immutable, versioned và không overwrite khi rerun
  (`migration-<timestamp>.<random>`, test rerun tạo backup thứ hai riêng
  biệt).
- [x] Canonical hiện hữu luôn phải schema/checksum validate trước khi
  migrator quyết định no-op (`MIGRATION_BLOCKED_CANONICAL_CORRUPT` nếu
  hỏng, không còn `existsSync`-only check).
- [x] Legacy conflict/corruption trả structured blocking result
  (`MIGRATION_BLOCKED_LEGACY_CORRUPT`, throw thay vì âm thầm coi là
  no-legacy).
- [x] Không xóa legacy artifacts trong migration; chỉ ngừng coi chúng là
  authority (đã đúng từ trước, xác nhận bằng test).

### Fault boundaries — PARTIAL

Đã có test qua public seam cho: load (`STORE_MISSING`/`CANONICAL_CORRUPT`
paths), schema validation (`interviewStoreEnvelopeSchema.parse`), lock
acquire (`lockOwnership.test.ts`), write (`FI-03` ENOSPC), rename (`FI-04`
EACCES), lock release (nonce-gated), hard-kill rồi restart (`FI-05`).
**Chưa có** fault injection riêng cho: fsync thất bại (không có seam để
patch `fsyncSync`/`openSync` trong `faulty-filesystem.ts` — có thể mở
rộng sau nếu cần), marker write (không áp dụng, không có marker riêng —
xem trên), directory sync/fallback (không có test tường minh, chỉ chạy
qua nhánh catch mặc định trên Windows).

### Exit criteria — đạt cho seam đã làm

- Sau injected crash (`FI-01`–`FI-05`), restart thấy toàn bộ old hoặc
  toàn bộ new envelope; không mixed state trong các test đã có.
- Không writer nào xóa lock của writer khác (`lockOwnership.test.ts`).
- Recovery hai lần không làm tăng revision hoặc thay đổi bytes lần hai
  (`FI-05`, `migrationDurability.test.ts` rerun test).
- **Chưa đạt đầy đủ**: journal/generation-pointer đa file (không cần cho
  seam này, xem trên); fault injection cho fsync/marker/directory-sync
  riêng lẻ.

### Commit slicing đề xuất

1. `test(core): add interview crash-boundary matrix`
2. `feat(core): add owned interview transaction locks`
3. `feat(core): add durable interview commit journal and recovery`

---

## 7. P4 — canonical path, artifact ownership và command policy — PARTIAL (2026-07-26)

P4 được thực hiện sau P2.2 để policy nhận canonical runtime snapshot.
Không coi việc đã có `pathPolicy.ts`/`classifyCommand.ts` là hoàn tất;
mọi production consumer phải dùng chúng.

Đợt này đóng các bug cụ thể, đã có red test xác nhận exploit trước khi
sửa (không phải rà toàn bộ checklist). Baseline mới: build/lint/typecheck
sạch, `npx vitest run` xanh (xem con số thật ở report chạy gần nhất, không
hardcode ở đây theo đúng nguyên tắc §0).

### 7.1. P4.1 — canonical path (B2c) — PARTIAL

#### Core behavior

- [x] Sửa bug sibling-prefix escape: `canonicalizeWorkspacePath`/
  `isContainedRealPath` dùng `startsWith` thô nên root `/foo` chấp nhận
  target `/foobar/secret.txt`. Thay bằng `isWithinRootBoundary` (segment-
  aware: `target === root || target.startsWith(root + '/')`). Red test
  trước khi sửa: `src/core/pathPolicy.test.ts` describe `sibling-prefix
  escape`.
- [x] Sửa bug `**` không khớp zero-segment trong `matchesPathPattern`:
  pattern `src/**/*.ts` trước đây KHÔNG khớp `src/app.ts` (chỉ khớp khi có
  ít nhất một thư mục con), vì `**` được thay thẳng bằng `.*` thay vì coi
  `**/`/`/**` là optional group. Viết lại bằng ASCII tag placeholder
  (`**/ ` → `(?:.*/)?`, `/**` → `(?:/.*)?`, `**` trần → `.*`) để giữ đúng
  thứ tự escape-rồi-thay-token. Regex metacharacter vẫn được escape đúng
  (test cũ `docs/v1.0+final` vẫn xanh).
- [~] `relative(root, target)` + reject absolute/drive-mismatch/`..`:
  container check đã đúng qua `isWithinRootBoundary`, nhưng chưa có
  `CanonicalWorkspacePath` branded type riêng — vẫn trả `string`.
- [ ] Reject UNC/device path tường minh: **chưa làm** — `normalizeDrive`
  xử lý drive letter nhưng không có test/deny riêng cho `\\server\share`
  hay `\\.\PhysicalDrive0`.
- [ ] Branded `CanonicalWorkspacePath` type: chưa làm.
- [x] Pattern matcher theo segment `*`/`**` — đã đúng, xem trên.
- [x] Escape regex metacharacters — đã đúng từ trước, có test.

#### Consumer cutover

- [x] active-task `allowed_paths` (trong `evaluatePreAction.ts`) — trước
  đây có `matchGlob` nội bộ riêng, không escape metachar
  (`src/a.b/**` khớp nhầm `src/aXb/...`); nay gọi thẳng
  `matchesPathPattern`.
- [x] Codex `post-tool-use.mjs` drift check — trước có `matchGlob` nội bộ
  riêng (cùng bug metachar); nay `resolveCorePath()` rồi import
  `matchesPathPattern` từ compiled core, cùng pattern với
  `pre-tool-use.mjs`.
- [~] Claude PreToolUse — đã gọi `evaluatePreAction` (không tự làm path
  logic), nhưng vẫn tự `commandStr.split(/\s+/)` để dựng `command_argv`
  (naive, xem P4.3).
- [ ] artifact ownership, gate requirements, scratch/deepen slot paths,
  emit collision/manifest paths, installer target/asset paths: **chưa rà
  lại** trong đợt này — cần audit riêng có thể đã dùng đúng hàm chung từ
  trước (không xác nhận).

#### Tests

- [x] sibling-prefix escape (`pathPolicy.test.ts`).
- [x] mixed-separator traversal tới sibling dir.
- [x] path có space/Unicode.
- [x] `**` zero-segment case (mới, xem trên).
- [x] regex metacharacter case (đã có từ trước, vẫn xanh).
- [ ] case variance theo platform, symlink/Windows junction escape riêng,
  drive mismatch/UNC, differential fixture toàn consumer: **chưa làm**.

### 7.2. P4.2 — protected artifact ownership (B2a) — PARTIAL

- [x] Bỏ authority bằng `includes`/`endsWith` ở hai chỗ cụ thể đã xác nhận
  có bug thật trong `artifactOwnership.ts`:
  - `classifyArtifact` managed-output catalog match — suffix/substring
    khớp nhầm `other/docs/01-vision.md` với catalog entry
    `docs/01-vision.md`. Nay dùng `Set` exact match.
  - `authorizeMutation` capability target match (actor `core-transaction`)
    — suffix/substring khớp nhầm `evil/.design-everything/interview-
    state.json` với capability target
    `.design-everything/interview-state.json`. Nay dùng `Set` exact match.
  Red test trước khi sửa: `src/core/artifactOwnership.test.ts` describe
  `P4.2 — exact-path authority`.
- [ ] `classifyArtifact`'s engine-state/engine-policy fixed-sentinel
  checks (ví dụ `.includes('.interview/')`) vẫn dùng substring — **cố
  tình chưa đụng**: `.interview/answers.json` thuộc phạm vi P6 theo §5.4,
  không phải P4.2.
- [ ] Capability opaque/unforgeable issuance, bind action+revision+
  session+expiry+consumption đầy đủ: chưa làm (kiến trúc capability hiện
  tại ở `artifactOwnership.ts` chỉ có `target_paths`, không có
  revision/session/expiry-enforcement thật).
- [ ] Scratch capability containment/extension/schema/size/depth/TTL: chưa
  làm (scratch path hiện chỉ check bằng regex path shape, không có
  capability object riêng).
- [ ] `plan-validating` blanket-allow `Design/**`/`docs/**`/
  `.design-everything/**`: **XÁC NHẬN VẪN CÒN** — `evaluatePreAction.ts`
  write branch của `plan-validating` (và `interview`) vẫn coi mọi path bắt
  đầu bằng 3 prefix này là allow, đúng như plan mô tả là vi phạm. Chưa sửa
  trong đợt này (cần thiết kế lại authorization theo task/gate thật, rủi
  ro lớn hơn phạm vi bugfix nhanh).
- [ ] Differential/negative-control fixture cho forged capability/lookalike
  path trên toàn bộ consumer: chỉ có unit test cục bộ ở
  `artifactOwnership.test.ts`, chưa có fixture xuyên consumer.

### 7.3. P4.3 — shell command classifier (B2b) — PARTIAL

- [x] `git branch <new-name>` (không có `--list`) nay bị coi là mutation
  (tạo/rename branch); trước đây chỉ chặn `-d/-D/-m/-M/--delete`, còn
  `git branch feature-x` lọt qua như read-only. `--list <pattern>` vẫn an
  toàn.
- [x] `git -C`, `--git-dir[=]`, `--work-tree[=]` nay bắt buộc resolve
  trong workspace qua `canonicalizeWorkspacePath`; thiếu `cwd` context
  hoặc escape ra ngoài đều fail-closed (`GIT_SCOPE_UNRESOLVED_DENIED`/
  `GIT_SCOPE_ESCAPE_DENIED`). Red/green test:
  `src/core/commandPolicies/gitReadOnly.test.ts`.
- [x] Xóa `safeCmds` khỏi `evaluatePreAction.ts` — có 2 nơi
  (plan-validating và active-task shell branch) trước đây basename-list
  `git`/`find`/... được allow ngay lập tức mà KHÔNG qua `classifyCommand`,
  nghĩa là `git branch -D` hay `find . -delete` chạy trong các pha này bị
  coi là read-only-allowed. Nay cả hai nhánh gọi `classifyCommand` thật.
  Red test: `src/core/evaluatePreAction.test.ts` describe `P4.3 — shell
  classifier must be the sole authority`.
- [x] Xóa CLI marker substring allow (`argv.includes('cli.mjs')` khớp cả
  khi `cli.mjs` chỉ là một argument bất kỳ, ví dụ
  `node malicious.js cli.mjs`) — thay bằng `isCliInvocation` yêu cầu
  `argv[0] === 'node'` và `argv[1]` (đối số script trực tiếp) kết thúc
  bằng `cli.mjs`/`cli.js`. Vẫn chưa verify hash/target-local path thật
  (thuộc P8/P9).
- [x] Codex `post-tool-use.mjs` không còn homegrown `matchGlob` — xem
  7.1. Test: `test/integration/installed-runtime/codex-post-tool-use.test.ts`
  (chạy hook thật qua `execFileSync`, dựng git repo thật, xác nhận drift
  bị chặn với pattern có ký tự regex đặc biệt).
- [ ] Raw command parser riêng cho Bash/PowerShell/cmd: **chưa làm** —
  `classifyCommand`'s raw fallback và cả `evaluatePreAction`'s
  `command_argv` construction ở Claude/Codex adapters vẫn dùng
  `split(/\s+/)` (`src/adapters/claude/preToolUse.ts`,
  `adapter/codex-plugin/hooks/pre-tool-use.mjs`). Không phải lỗ hổng mới,
  nhưng chưa đúng contract quote-aware.
- [ ] `find` alias/output-redirection edge case mở rộng: đã có sẵn
  `-delete`/`-exec`/`-execdir`/`-ok*`/`-fprint*`, chưa mở rộng thêm.
- [ ] Executable basename verified qua install manifest hash: chưa làm,
  thuộc P8/P9.
- [x] Interview, plan-validating, executing đều gọi cùng `classifyCommand`
  (đã xác nhận qua test). Recovery/wrapper: chưa rà.

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

## 8. P5 — gate recomputation và runtime health — PARTIAL (2026-07-26)

### 8.1. P5.1 — gate snapshot (B2d) — PARTIAL

- [x] Sửa bug fail-open trong `buildGateSnapshot`: một path không tồn tại
  trên đĩa trước đây rơi vào nhánh "in-memory or simulated string list" và
  được set `exists=true, nonEmpty=true` — nghĩa là một required doc CHƯA
  BAO GIỜ được tạo vẫn coi như đã pass gate. Nay path không tồn tại luôn
  `exists=false`; directory tại path đó cũng không được coi là file. Red
  test trước khi sửa: `src/core/gateSnapshot.test.ts`.
- [x] Requirement match exact canonical relative path; bỏ basename/suffix
  fallback trong `evaluateGate.ts` (`art.canonicalPath.endsWith(normReq) ||
  getBasename(...) === reqBasename` — một file trùng basename ở directory
  khác trước đây thỏa mãn gate requirement). Nay chỉ
  `snapshot.artifacts[normReq]` exact key lookup. Red test:
  `src/core/evaluateGate.test.ts` — "chỉ satisfied by exact canonical
  path, not a same-basename file elsewhere (confused-deputy)".
- [x] **Regression phát hiện sau khi bỏ basename fallback, đã sửa cùng
  đợt**: bỏ fallback làm 5 test thật (e2e web/mobile flow + edge-cases,
  `preToolUse.test.ts`) đỏ ngay, vì `gate-policy.yaml` khai
  `requires_docs` bằng bare filename (`"00-vision.md"`) trong khi engine
  luôn emit doc phẳng dưới đúng một thư mục cố định `docs/` (xem
  `evaluatePreAction.ts`'s `docsDir`, template trong `emit.ts`) — basename
  fallback cũ vô tình là cơ chế bắc cầu duy nhất cho lệch tên này, không
  chỉ là lỗ hổng. Đồng thời phát hiện bug thật thứ hai:
  `evaluateGate`'s array-overload hardcode `buildGateSnapshot(process.cwd(),
  ...)` thay vì dùng `workspace` thật của caller — key canonical sai bất cứ
  khi nào `workspace !== process.cwd()` (mọi test dùng tmp workspace, và
  tiềm ẩn rủi ro cho adapter/hook có cwd khác project root). Sửa bằng hai
  phần: (1) `evaluateGate.ts` thử match `normReq` rồi `docs/${normReq}` —
  đúng MỘT vị trí canonical cố định, không phải basename-anywhere; (2)
  `evaluatePreAction.ts` tự build `GateSnapshot` qua
  `buildGateSnapshot(workspace, ...)` một lần rồi truyền cho cả
  `evaluateGate`/`isBlocked` trong loop, thay vì để chúng tự dựng snapshot
  với `process.cwd()` sai. `isBlocked`/`passedGates` nới kiểu nhận
  `string[] | GateSnapshot`. Regression test:
  `evaluateGate.test.ts` — "bare requires_docs filename matches the one
  well-known docs/ location, but not other lookalike directories" (2
  test, cả positive lẫn negative control).
- [x] Missing, unreadable, hoặc directory tại required path luôn
  `exists=false` — xem trên. Symlink escape: chưa có test riêng (gate
  snapshot đọc qua `statSync`/`readFileSync` trực tiếp, không tự resolve
  qua `canonicalizeWorkspacePath`'s symlink check).
- [x] Sửa `checkExecutionGate(null, ...)` — trước đây null execution state
  return `{ allowed: true }` (blanket allow), trái ngay với exit criteria
  "không có null-state allow". Nay deny với
  `EXECUTION_STATE_REQUIRED`. Đây là legacy-compat helper không có
  production caller (chỉ test), nhưng test cũ
  (`advanceExecutionState.test.ts`) đã tự mã hoá hành vi sai đó thành
  assertion — đã sửa cả assertion.
- [x] Hệ quả tự nhiên của việc sửa fail-open ở trên: sửa/xóa artifact sau
  gate pass ĐÃ đóng gate ở lần evaluate kế tiếp, vì snapshot luôn đọc lại
  bytes thật từ đĩa mỗi lần gọi (không có cache); không cần sửa thêm.
- [ ] `buildGateSnapshot` nhận thêm active emit manifest, validation
  record, evidence store làm input riêng: chưa làm — snapshot hiện tại
  vẫn chỉ nhận `docPaths + validationPass + completedTasks`, không bind
  manifest/evidence digest.
- [ ] Validation pass bind current plan/docs/manifest digests; evidence
  bind task ID/command digest/result digest/exit class/execution
  revision: chưa làm.
- [ ] `gates_passed` replace-all-derived-cache semantics (thay vì
  `evaluatePreAction.ts` hiện vẫn `push` từng gate id đã pass vào mảng
  tồn tại qua `transactInterviewStore`): chưa sửa, vẫn là merge/append,
  không phải derive-fresh-every-time.

### 8.2. P5.2 — runtime health (B2e) — PARTIAL

- [x] Sửa bug substring-injection trong `authorizeRecovery`: trước đây
  `attemptedAction.includes(cmd)` cho phép bọc command hợp lệ trong một
  chuỗi lớn hơn tuỳ ý (vd. `"rm -rf / && node adapter/claude-code/cli.mjs
  init"` vẫn được authorize vì chứa safe command làm substring). Nay yêu
  cầu exact match sau `trim()` ở cả hai chiều. Red test:
  `src/core/runtimeHealth.test.ts` — "rejects an attemptedAction that
  pads a safe command with extra content".
- [ ] Parse install manifest theo schema; verify runtime/schema/catalog
  version, build hash, từng asset hash và hook IDs: **chưa làm** —
  `inspectRuntimeHealth` vẫn chỉ check tồn tại + parse JSON của
  install-manifest, không verify hash/hook ID nào.
- [x] Kiểm tra canonical interview store, execution state theo phase,
  deepen state/script — đã có từ trước (không đổi trong đợt này).
- [ ] Kiểm tra execution plan, profile, policy, catalog, active
  tier-1/tier-2 manifests: chưa làm.
- [ ] `uninvolved` chỉ khi không có bất kỳ marker nào, `installed nhưng
  thiếu asset là broken` mở rộng cho catalog/tier1/tier2/policy: chưa mở
  rộng ngoài phạm vi hiện có (install-manifest/progress/canonical-store/
  execution-state/deepen).
- [ ] `status`, `next`, hooks, wrapper, skills dùng cùng `HealthReport`:
  chưa audit lại trong đợt này.
- [ ] SessionStart structured block với exact recovery command: đã có từ
  trước (P2.2a), không đổi ở đây.

### Tests bắt buộc — trạng thái

- [x] delete/modify artifact sau gate pass (hệ quả của fix fail-open, xem
  trên) — implicit qua việc snapshot luôn đọc lại bytes, chưa có test
  tường minh riêng cho "gate mở rồi artifact bị xoá thì đóng lại".
- [x] required file trùng basename ở directory khác — có test.
- [x] recovery command exact match và lookalike denial — có test (cả
  chiều `node` lookalike từ trước và chiều padding mới).
- [ ] stale validation/evidence digest; missing manifest file; wrong asset
  hash/hook ID/catalog version; deleted legacy progress nhưng canonical
  install tồn tại; partial install; corrupt canonical store ở
  status/next/hook: **chưa làm** — phụ thuộc các hạng mục P5.1/P5.2 còn
  mở ở trên (manifest/catalog binding).

### Exit criteria — đạt một phần

- [x] Không còn missing-artifact-treated-as-existing (fail-open) trong
  gate; không còn basename/suffix confused-deputy match.
- [x] Không còn null-state blanket allow ở `checkExecutionGate`.
- [x] Recovery authorization exact ở cả hai chiều (short lookalike và
  padded/wrapped command).
- [ ] "Gate là phép tính lại từ bytes + ACTIVE MANIFESTS + evidence hiện
  tại" — mới đạt phần "từ bytes"; chưa bind manifest/evidence.
- [ ] Health check chưa mở rộng qua asset hash/hook ID/catalog/tier1-2
  manifest; "uninvolved/broken" boundary chưa mở rộng theo đó.

### Commit slicing đề xuất

1. `fix(core): recompute gates from active manifests and bound evidence`
2. `fix(core): make runtime health manifest-complete and fail-closed`
3. `refactor(adapters): consume one health report across entry points`

---

## 9. P3 — atomic handoff và typed blocked remediation — PARTIAL (2026-07-26)

### 9.1. P3.1 — design/build handoff (B1c) — PARTIAL

- [ ] Chốt canonical interview phase là `ready-for-validation`: **chưa
  làm** — `ready-to-build` vẫn là tên phase thật dùng xuyên suốt
  `commitStep`/`Progress` schema/tests; rename có blast radius lớn, không
  đụng trong đợt này.
- [ ] `ready-to-build` chỉ được chấp nhận trong migrator/legacy schema:
  chưa làm, phụ thuộc rename trên.
- [x] Tạo `completeTier1Activation` (`src/core/advanceExecutionState.ts`):
  nhận `workspaceRoot` + optional `{planDigest, docsDigest}`, **idempotent**
  — nếu `execution-state.json` đã tồn tại (build đã bắt đầu) thì load và
  trả nguyên trạng, không bao giờ ghi đè state đã tiến xa hơn
  `plan-validating`. Chưa nhận canonical expected revision/active emit
  manifest làm tham số bắt buộc như plan gốc mô tả — chỉ nhận digest rời.
- [x] Service tạo execution state `plan-validating` — và **quan trọng
  hơn**: production `emit` (`cliOperations.ts` `handleEmit`) giờ thực sự
  gọi nó sau khi `activateTier1Emit` thành công. Trước đợt này,
  `completeTier1Emit`/`evaluateBuildReadiness` tồn tại nhưng có **0
  production caller** — tier-1 emit thật không bao giờ tạo
  `execution-state.json`; nó chỉ xuất hiện tình cờ qua side-effect của
  `handleValidate` tự bootstrap. Red/green test:
  `test/integration/cli-protocol.test.ts` — "P3.1 — a successful tier-1
  activation creates execution-state.json at plan-validating" và
  "re-emitting tier-1 never resets execution state that already
  progressed past plan-validating".
- [ ] Interview phase, execution-state activation và emit manifest nằm
  trong cùng recovery journal/generation decision: **chưa** — hiện là hai
  lời gọi tuần tự riêng (`activateTier1Emit` rồi `completeTier1Activation`),
  không rollback chung nếu tiến trình bị giết giữa hai bước. Ghi nhận đây
  là gap thật, không phải đã đóng.
- [x] Missing/corrupt execution state sau installed emit luôn deny — đã
  đúng từ trước qua `evaluatePreAction`'s `EXECUTION_STATE_REQUIRED` và
  `checkExecutionGate(null, ...)`.
- [x] Xóa/deprecate null-state allow ở `checkExecutionGate` — đã đúng từ
  trước (P5), xác nhận lại không regress.
- [~] `evaluateBuildReadiness` là authority duy nhất cho handoff: giờ có
  **production caller thật** — `handleNext` gọi nó trước khi rơi vào
  digest-based `assertValidatedSnapshot`, nên state `plan-validating` mới
  tạo trả đúng `PLAN_VALIDATION_REQUIRED`/`/build` thay vì generic
  `STALE_SNAPSHOT`. Red/green test: `cli-protocol.test.ts` — "next on a
  freshly-emitted, not-yet-validated workspace reports
  PLAN_VALIDATION_REQUIRED...". **Chưa làm**: `handleStart` vẫn dùng
  digest check riêng, chưa gọi `evaluateBuildReadiness` — hai entry point
  có thể lệch message dù cùng đích đến STALE_SNAPSHOT/deny.
- [x] Trước `ready-to-execute`, source mutation luôn bị từ chối — đã đúng
  từ trước qua `evaluatePreAction`'s `plan-validating` write-scope check.

### 9.2. P3.2 — typed blocked state (B1d) — PARTIAL

- [~] Thay `block_reason: string` bằng typed record: **BlockRecord đã tồn
  tại từ trước** (`kind`, `reason_code`, `origin_phase`, `task_id`,
  `recoverable_by`, `detail`, `created_at`) nhưng nhiều producer thật vẫn
  gán raw string, khiến schema union `string | BlockRecord` không chỉ là
  migration compat mà là lỗ hổng đang dùng thật. Đợt này đã sửa toàn bộ
  producer còn lại thành typed:
  `applyReviewOutcome` (kind mới `review-incomplete`, thêm vào
  `blockKindSchema`), `recordEvidence`'s abort/repairing branch (kind
  `verification-failed`), `validatedSnapshot.ts`'s `assertValidatedSnapshot`
  (kind `snapshot-stale`, theo đúng convention đã có sẵn ở
  `deepenLifecycle.ts`), và `cliOperations.ts`'s plan-promotion failure
  (kind `artifact-integrity`). `renderProgressLog.ts` cập nhật để đọc cả
  hai dạng (typed → `.detail`, legacy string → nguyên văn) cho tương thích
  đọc ngược. Red tests: `reviewFeatureOutput.test.ts`,
  `advanceExecutionState.test.ts`, `validatedSnapshot.test.ts`,
  `runTaskVerification.test.ts`. Chưa có migrator/lint riêng cấm string
  mới bị gán (schema union vẫn cho phép về mặt type).
- [ ] Viết migrator cho legacy string: chưa làm — không có store cũ nào
  cần migrate trong đợt này (mọi state test/production đều tạo mới qua
  `initExecutionState`).
- [x] `allowedRemediation(state)` trả exact action, paths/command,
  task/block kind và revision — đã tồn tại từ trước; sửa thêm một bug thật
  tìm thấy khi viết test: khi `phase === 'blocked'` nhưng `block_reason`
  là `null` (state hỏng/thiếu), hàm cũ rơi vào nhánh đầu tiên
  (`phase !== 'blocked' || !block_reason`) và trả blanket-allow `['*']` —
  đúng loại lỗi mà plan này cảnh báo tránh. Nay tách riêng: thiếu
  `block_reason` khi đang `blocked` fail-closed về read-only, không còn
  blanket `*`. Red test: `blockedTransition.test.ts` — "allowedRemediation
  does not blanket-allow when phase is blocked but block_reason is
  missing".
- [x] Hook cho phép đúng remediation được khai báo, không deny-all và
  không blanket recovery allow: **đây là fix chính của đợt này**.
  `evaluatePreAction.ts`'s `execState.phase === 'blocked'` branch trước đây
  deny 100% mọi action không điều kiện — không đọc `block_reason` hay gọi
  `allowedRemediation` — nghĩa là remediation write mà chính hệ thống khai
  báo là hợp lệ (`recoverable_by`, `allowed_paths`) vẫn bị chặn, buộc
  người dùng phải qua đường vòng khác. Nay đọc `allowedRemediation(execState)`
  và chỉ allow đúng action/path/lệnh nó khai báo — write ngoài phạm vi,
  action không nằm trong danh sách, hoặc lệnh không khớp `recoverable_by`
  exact vẫn deny như cũ. Red/green test: `evaluatePreAction.test.ts`
  describe "P3.2 — blocked-phase actions must follow allowedRemediation,
  not a hardcoded deny-all" (4 test: write trong scope được allow, write
  ngoài scope vẫn deny, lệnh verify chính xác được allow, lệnh verify bị
  pad/lookalike vẫn deny, và block_reason null fail-closed).
- [ ] `validate` chỉ recover validation/integrity/snapshot-stale khi có
  proof tương ứng: chưa làm trong đợt này — `handleValidate` hiện vẫn
  hardcode `validationPass: true` không điều kiện (bug thật, phát hiện
  khi đọc code, chưa sửa — nằm ngoài phạm vi commit này, cần red test và
  thiết kế riêng vì đụng vào toàn bộ `validate` command).
- [x] Verification failed/aborted giữ active task/evidence — đã đúng từ
  trước (`transitionToReadyToExecute`'s early-return cho các kind này).
- [x] Next-step render trực tiếp từ `recoverable_by` — đã đúng từ trước
  (`renderNextStep.ts`).
- [x] Stale remediation token/revision hoặc action ngoài scope bị deny —
  xem `evaluatePreAction.test.ts` "lookalike/padded shell command" test ở
  trên.

### Exit criteria

- [x] Tier-1 success luôn tạo execution state `plan-validating` (khi chưa
  có state nào tồn tại — nếu build đã bắt đầu, idempotent giữ nguyên).
- [ ] Không tồn tại state docs-active nhưng interview/execution state cũ:
  chưa đóng đầy đủ — thiếu single-transaction journal (xem 9.1).
- [~] Mỗi blocked kind có positive remediation control và negative
  out-of-scope controls: có cho `validation` và `verification-failed`
  (test trực tiếp); các kind khác (`artifact-integrity`, `snapshot-stale`,
  `policy-corrupt`, `review-incomplete`) dùng chung nhánh
  `allowedRemediation` nhưng chưa có positive-control test riêng từng
  kind.

### Việc còn lại đáng chú ý

- `handleStart` chưa gọi `evaluateBuildReadiness`, chỉ có `handleNext`.
- `handleValidate` luôn `validationPass: true` — validate command hiện
  không thực sự validate gì, chỉ ghi digest rồi pass. Đây là một finding
  mới, nghiêm trọng hơn scope P3, cần plan riêng.
- `ready-to-build` → `ready-for-validation` rename chưa làm.
- Atomic single-transaction cho interview phase + emit manifest +
  execution-state activation chưa làm (hiện 2 lời gọi tuần tự).

### Commit slicing đề xuất

1. `feat(state): add typed blocked records and remediation policy`
2. `feat(core): add atomic tier1 handoff service`
3. `refactor(policy): make build readiness the sole handoff authority`

---

## 10. P6 — answer, slots, provenance và catalog consumers — PARTIAL (2026-07-26)

### 10.1. Answer/slot validation (B3a) — PARTIAL

- [x] CLI/application service load current question contract:
  `commitInterviewAnswer` (`interviewApplicationServices.ts`) trước đây
  gọi `validateAnswer(null, args.answerText)` **hardcode `null`** —
  nghĩa là mọi `answer_contract` thật đã tác giả hoá trong
  `Design/Content/interview-script/script.yaml` (S0 yêu cầu tối thiểu 12
  ký tự + cảnh báo pitch chung chung, S3 yêu cầu chứa từ "must" + cảnh báo
  "mọi tính năng đều must", v.v.) **chưa từng được enforce trong production**
  — chỉ check empty/placeholder chung. Nay tra đúng câu hỏi hiện tại
  (`script.questions.find(q => q.id === stepId)`) và dùng
  `question?.answer_contract` thật. Red test:
  `src/core/canonicalAuthority.test.ts` (regression, đã xanh); full
  journey/e2e suite (577 test) xác nhận câu trả lời fixture có sẵn vẫn
  thoả contract thật.
- [~] Enforce `required`, trim, placeholder, `min_items`,
  `required_fields`, enum, pattern và bounded structure: `validateAnswer`
  (`src/core/validateAnswer.ts`) đã có `trim`/`placeholder`/
  `min_trimmed_chars`/`warning_rules` từ trước; đợt này thêm `pattern`
  (case-insensitive, "must-contain") và `enum_values`, và sửa `required`
  — trước đây field `required` trong contract hoàn toàn không được đọc,
  answer rỗng luôn bị deny bất kể `required: false`. Nay
  `required: false` cho phép answer rỗng qua. Red/green test:
  `src/core/validateAnswer.test.ts` — 3 test case mới (pattern violation,
  enum violation, optional-empty). **Chưa làm**: `min_items` và
  `required_fields` (áp dụng cho structured/slot answers dạng object,
  chưa có test case nào dùng payload object thật để verify).
- [~] `needs_user_ack` tạo explicit prompt + capability riêng; model
  không tự ack: trước đây `commitInterviewAnswer` hoàn toàn không xử lý
  outcome `needs_user_ack` — nó rơi qua như thể valid, cảnh báo bị bỏ
  qua âm thầm. Nay `commitInterviewAnswer` nhận thêm `ackWarnings?: boolean`
  và CLI `commit` nhận flag `--ack-warnings`
  (`argv.includes('--ack-warnings')`); nếu outcome là `needs_user_ack` và
  `ackWarnings` không được set, commit bị từ chối với reason_code
  `ANSWER_NEEDS_USER_ACK` kèm nguyên văn cảnh báo, buộc caller phải hỏi
  lại người dùng trước khi resubmit. Đây chưa phải "capability riêng"
  đúng nghĩa plan mô tả (không có token/expiry ràng buộc cho việc ack) —
  chỉ là một boolean flag do caller tự khai; không có gì chặn model tự ý
  set `--ack-warnings` mà không thực sự hỏi người dùng. Ghi nhận là gap
  còn lại, không phải đã đóng đầy đủ theo đúng ý plan.
- [ ] `loadQuestionSlots` nhận absolute workspace root và canonical
  scratch path: đã đúng từ trước (`canonicalizeWorkspacePath`), không đổi
  trong đợt này.
- [ ] Enforce recipe/question allowlist, file size/depth/type, source
  revision và producer version: chưa làm — `loadQuestionSlots` chỉ check
  size (1MB) + schema hiện có, không có allowlist/depth/producer-version
  riêng.
- [ ] Raw answer revision, typed slots, provenance và capability
  consumption commit atomically: chưa làm — slots vẫn hoàn toàn tách rời
  khỏi `commitInterviewAnswer`'s transaction (chỉ raw answer text được
  commit atomically qua canonical store; slots file nếu có
  (`--slots-file`) chỉ được validate tồn tại ở `handleCommit`, không được
  đọc/gộp vào transaction).
- [ ] Correction tạo revision `supersedes`, không overwrite answer đã
  xác nhận: chưa làm — `commitInterviewAnswer` vẫn overwrite
  `answers[stepId]` trực tiếp.

### 10.2. Derived provenance/quality (B3b) — Open, không đụng trong đợt này

- [ ] Runtime thực thi `derived-recipes.yaml`.
- [ ] Mỗi derived block có SourceRef, source revision digest,
  producer/version và coverage.
- [ ] Missing source render `⚠ unknown — cần hỏi người`, không biến
  inference thành fact.
- [ ] Emit validation chặn derived assertion thiếu provenance/unknown
  policy.
- [ ] Weak-executor fixtures bao phủ missing/ambiguous source.

### 10.3. Catalog consumers (B3c) — Open, không đụng trong đợt này

- [ ] Giữ một compiler/catalog authority.
- [ ] Ownership, gate, installer asset list, emit, docs count/journey và
  parity manifest đều lấy từ catalog.
- [ ] Không copy path/count list vào CLI, skills hoặc docs.
- [ ] Catalog digest giống nhau giữa Core, installed runtime, Claude và
  Codex.

### Exit criteria

- [~] CLI commit thật lưu answer/slots/provenance vào canonical
  transaction: answer text + contract validation có; slots/provenance
  chưa nối vào cùng transaction (xem 10.1).
- [ ] Không derived assertion thiếu SourceRef/unknown marker vượt emit
  validation: chưa đụng (10.2 open).
- [ ] Catalog path/count/digest chỉ có một nguồn máy đọc: chưa đụng (10.3
  open).

---

## 11. P7 — transactional tier-1/tier-2 activation — PARTIAL (2026-07-26, P7.1 only)

Channel isolation đã có; pha này hoàn tất transaction orchestration và
atomic state activation.

### 11.1. P7.1 — tier-1 application service (B3d) — PARTIAL

- [x] Tạo một public application service cho production `emit`:
  `activateTier1Emit` (`src/core/emitTier1.ts`), mới thêm đợt này. Trước
  đây, production `handleEmit` (`cliOperations.ts`) hoàn toàn không dùng
  transaction kernel có sẵn (`prepareEmit`/`validateStagedEmit`/
  `activateEmit`/`recoverEmit` đã tồn tại từ trước nhưng **0 production
  caller**, chỉ được test unit-level) — nó tự `emitTree()` rồi
  `writeFileSync` từng file thẳng vào `docs/` sống, không staging, không
  validate, không manifest. Steps thật đã nối: (2) render qua `emitTree`,
  (3) `prepareEmit`, (4) `validateStagedEmit`, (6) `activateEmit` với
  `expectedRevision` đọc từ active manifest hiện tại (CAS thật, không
  phải `null` cứng). **Chưa làm**: (1) load canonical store verify
  expected revision (hiện chỉ đọc `progress.branch`, không CAS theo
  canonical revision), (5) acknowledgement cho blocking warning (warning
  hiện chỉ trả về trong response, không có cơ chế ack/chặn), (7) gọi
  atomic handoff P3 trong CÙNG transaction (hiện `completeTier1Activation`
  là lời gọi thứ hai, tuần tự, không rollback chung).
- [ ] Journal cover docs, plan, manifest, canonical interview phase và
  execution state: **chưa** — journal hiện tại (`emitTransactionActivate.ts`)
  chỉ cover docs/manifest của MỘT channel; không cover canonical interview
  phase hay execution-state trong cùng generation/journal.
- [x] Collision, revision mismatch, recovery-required hoặc partial
  activation không trả success — đã đúng từ trước ở tầng
  `activateEmit`/`recoverEmit` (không đổi trong đợt này), và giờ THẬT SỰ
  được đường production dùng tới (trước đây không ai gọi nên các guard
  này chưa từng chạy trong flow thật).
- [x] Xóa direct-write loop/business logic khỏi CLI — `handleEmit` không
  còn `mkdirSync`/`writeFileSync` loop hay đọc `Design/Content/doc-templates`
  trực tiếp; toàn bộ logic nằm trong `activateTier1Emit`.
- [x] Không fallback đọc `tier1-manifest.json`: đã xóa hẳn — code cũ có
  catch-block đọc `.design-everything/tier1-manifest.json` (một path
  KHÔNG có writer nào, dead code, nhưng vẫn là lỗ hổng kiến trúc thật:
  nếu file đó từng tồn tại — vd. từ version cũ hơn hoặc chỉnh tay — một
  lỗi render/validate thật sẽ bị báo `ok:true`/`EMIT_SUCCESS` giả). Red
  test chứng minh production emit giờ tạo manifest/journal thật:
  `test/integration/cli-protocol.test.ts` — "P7.1 — production emit
  activates through the real transaction kernel, not a direct write
  loop".
- [x] CLI JSON success chỉ xuất sau complete activation — `handleEmit`
  chỉ trả `ok:true` sau khi `activateTier1Emit` trả `EMIT_ACTIVATED`
  (status `'activated'` từ `activateEmit`), không còn success-on-throw.

### 11.2. P7.2 — tier-2 module isolation (B3e) — Open, không đụng trong đợt này

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

### 11.3. Fault-injection seam — Open, không đụng trong đợt này

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

- [x] Production `emit` chỉ gọi application service (`activateTier1Emit`).
- [ ] Crash ở mọi boundary cho old hoặc new generation, không mixed
  docs/plan/manifest/interview/execution state: chưa đầy đủ — activation
  bên trong `activateEmit` đã atomic/journal (từ trước), nhưng
  `completeTier1Activation` là bước thứ hai riêng, ngoài journal đó; một
  crash đúng giữa hai lời gọi để lại docs/manifest đã activate nhưng
  chưa có execution-state — CLI kế tiếp gọi `next`/`status` vẫn tự phục
  hồi đúng (idempotent completeTier1Activation sẽ tạo nó), nhưng đây
  không phải "một transaction" theo đúng nghĩa plan yêu cầu.
- [ ] Tier-2 module isolation có regression proof: chưa đụng (P7.2 open).
- [x] CLI không có catch branch biến partial failure thành success: xác
  nhận đã xóa (xem 11.1).

### Commit slicing đề xuất

1. `feat(core): add tier1 activation application transaction`
2. `refactor(adapters): route emit through activation service`
3. `feat(core): isolate tier2 module generations`
4. `test(qa): inject public emit activation faults`

---

## 12. P8 — hoàn tất hook và shared CLI production wiring — PARTIAL (2026-07-26)

Trước khi sửa, một khảo sát code-grounded (đọc trực tiếp từng file, không
suy đoán) xác nhận baseline thật của từng mục dưới đây, vì checklist gốc
được viết trước các commit gần đây và một số mục đã lỗi thời. Phát hiện
quan trọng nhất: `adapter/claude-code/hooks/resolve-cli-invocation.mjs`'s
`authorizeCliOperation` là một authority hoàn toàn tách biệt khỏi Core —
nó tự quyết định allow/deny cho mọi lệnh CLI chạy qua Bash tool, luôn
nhận `runtimeSnapshot = null` cứng (dòng gọi cũ:
`authorizeCliOperation(cliResolution, null)`), có blanket-allow cho
`init/repair/validate/emit`, và mặc định **allow** (không phải deny) cho
bất kỳ subcommand nào nó không nhận diện — đúng loại lỗ hổng mà exit
criteria của tài liệu này cảnh báo tránh. File này trước đó không có test
nào (`rg` xác nhận 0 kết quả trong `test/`).

### Hook adapters

- [~] SessionStart thực thi install manifest → recover → migrate →
  health → inject: **mục này viết sai kiến trúc thật, không sửa thành
  đúng như văn bản mô tả**. `sessionStart.ts` chỉ chạy
  recover → migrate → health (đúng thứ tự, không đổi); không có bước
  "install manifest" hay "inject" riêng trong SessionStart — "inject"
  (render context vào response) là trách nhiệm của `userPromptSubmit.ts`
  theo đúng tách bạch sự kiện hook thật của Claude Code (SessionStart và
  UserPromptSubmit là hai hook event khác nhau, SessionStart không có cơ
  chế trả `additionalContext` cho model). Không còn legacy
  `progress.json` init ở cuối pipeline — xác nhận đúng, không có trong
  file.
- [~] UserPromptSubmit chỉ map host context và issue capability: thực tế
  rộng hơn văn bản mô tả nhưng không phải bug — nó còn load interview
  script và render inject context (`renderInject`), vì response của
  UserPromptSubmit **phải** mang theo cả capability lẫn context đã
  render trong cùng một lần trả lời hook. Đánh giá là kiến trúc đúng,
  không phải scope creep cần cắt.
- [x] `authorizeCliOperation` không còn nhận `runtimeSnapshot = null`
  cứng: `pre-tool-use.mjs` giờ `loadInterviewStore(workspaceRoot)` thật
  trước khi gọi `authorizeCliOperation`, chỉ fallback về `null` khi load
  thất bại (store chưa tồn tại/hỏng — giữ nguyên hành vi an toàn cũ cho
  trường hợp đó thay vì khoá luôn `init`/`repair`). Red/green test:
  `test/integration/installed-runtime/hook-adversarial.test.ts` — "P8 —
  PreToolUse authorizes CLI deepen from the real canonical phase, not a
  hardcoded interview default".
- [x] `authorizeCliOperation` không còn default-allow cho subcommand lạ:
  đã thêm nhánh allow tường minh cho `next/start/verify/review` (4
  subcommand thật có handler trong `cliOperations.ts` nhưng trước đây
  chỉ lọt qua fallback ngầm), rồi đổi fallback cuối cùng thành
  `deny`/`UNRECOGNIZED_CLI_SUBCOMMAND`. Red/green test:
  `adapter/claude-code/hooks/resolve-cli-invocation.test.mjs` (mới, 13
  test — bộ test đầu tiên cho file này) và
  `hook-adversarial.test.ts` — "P8 — PreToolUse denies an unrecognized
  CLI subcommand instead of defaulting to allow".
- [x] `resolveCliInvocation`'s tokenizer giờ quote-aware (hỗ trợ path/
  argument có khoảng trắng và Unicode trong dấu nháy đơn/kép) thay vì
  `split(/\s+/)` thô làm vỡ mọi argument có dấu cách (vd.
  `--answer-text "hello world"` trước đây bị tách thành hai token lẫn cả
  ký tự nháy). Chưa phải full shell grammar (không hỗ trợ escape quote
  hay `$VAR`) — ghi rõ là giới hạn có chủ đích, khớp với gap "raw command
  parser" đã biết ở P4.3.
- [x] Session ID không còn hardcode: `preToolUse.ts`'s `onPreToolUse`
  nhận `sessionId?: string` từ ctx, dùng `ctx.sessionId || 'unknown'`
  (khớp convention Codex `payload.session_id || 'unknown'`) thay vì
  literal `'default-session'`. `pre-tool-use.mjs` (Claude) truyền
  `input.session_id` thật xuống. Lưu ý: `session_id` hiện chưa được bất
  kỳ policy nào trong `evaluatePreAction` tiêu thụ để ra quyết định (xác
  nhận qua `rg`), nên đây là fix đúng-theo-hợp-đồng/audit-trail, không
  phải một lỗ hổng an ninh đang khai thác được. Red/green test:
  `src/adapters/claude/preToolUse.test.ts` — 2 test case mới (session id
  thật truyền qua, và fallback "unknown" khi không có).
- [ ] Map đầy đủ MultiEdit, NotebookEdit, delete, rename: **chưa làm**.
  Wrapper `.mjs` coerce `MultiEdit`/`NotebookEdit` thành `'Edit'` trước
  khi gọi `onPreToolUse`, nhưng `PreActionRequest`/`onPreToolUse` không
  có `action_kind` riêng cho `delete`/`rename` — mọi xoá/đổi tên file
  thật hiện chỉ được gác qua nhánh Bash's shell classifier (`rm`, `mv`
  đã được `classifyCommand` phân loại là mutation), không qua một
  request kind riêng. Không có bằng chứng bypass cụ thể được tìm thấy
  trong đợt khảo sát này, nhưng đây vẫn là gap thật so với mô tả plan —
  cần thiết kế `action_kind` mở rộng, để lại cho lần sau.
- [x] Uninstalled thật mới bypass — **Claude side đã đúng từ P2.2a**
  (install-manifest.json đã nằm trong điều kiện bypass). **Codex side có
  bug thật, đã sửa đợt này**: `adapter/codex-plugin/hooks/pre-tool-use.mjs`
  trước đây chỉ check `interview-state.json`/`progress.json`/
  `execution-state.json` — một workspace vừa cài plugin xong (có
  `install-manifest.json`) nhưng chưa init state nào sẽ bypass hoàn
  toàn, khác hành vi với Claude. Nay thêm điều kiện thứ tư. Red/green
  test (mới, file trước đây không có test riêng cho pre-tool-use.mjs):
  `test/integration/installed-runtime/codex-pre-tool-use.test.ts`.
- [x] Codex post-hook dùng shared `matchesPathPattern`, không có
  `matchGlob` — xác nhận đúng từ P4.1, không đổi trong đợt này.

### Wrapper/CLI

- [ ] Resolver verify exact target-local launcher path, version và hash
  từ install manifest: chưa làm — chưa có install manifest với per-file
  hash nào tồn tại để verify against (đó là nội dung của P9 §13.1); phụ
  thuộc P9, không tách rời được ở đây.
- [x] Hỗ trợ quoted path có space/Unicode: xem tokenizer ở trên — áp
  dụng cho toàn bộ command, không riêng launcher path.
- [x] Không gọi authorizer (`authorizeCliOperation`) với runtime
  snapshot `null` khi store load được — xem trên. **Chưa đóng hoàn
  toàn**: các call site khác (`authorizeMutation` trong
  `artifactOwnership.ts`) đã luôn nhận target/actor thật từ trước, không
  cần sửa; nhưng `authorizeCliOperation` bản thân nó vẫn là một authority
  song song với `evaluatePreAction`/Core thật — hợp nhất hai đường quyết
  định thành một là việc chưa làm (xem "Việc còn lại" dưới).
- [x] Mỗi subcommand map sang authorization; unknown default deny — xem
  trên (`authorizeCliOperation`). Ở tầng dispatcher thật
  (`cliOperations.ts`'s `runCliOperation`), unknown subcommand đã luôn
  `UNKNOWN_SUBCOMMAND`/deny từ trước, không đổi.
- [~] `init/repair/validate/emit` không blanket allow: **chưa đổi hành
  vi** — 4 subcommand này vẫn allow không điều kiện ở
  `authorizeCliOperation`, nhưng đây là quyết định có chủ đích, không
  phải bỏ sót: `cliOperations.ts`'s handler thật cho từng subcommand này
  (`handleInit`, `handleRepair`, `handleValidate`, `activateTier1Emit`)
  đã tự re-validate đúng theo state/canonical revision của nó (xem P7),
  nên pre-check này không phải authority cuối; nó chỉ tồn tại để cho
  UX/early-deny tốt hơn. `deepen` giờ dùng phase thật (xem trên), nhưng
  `deepen` vẫn không có handler trong `runCliOperation` (X01, chưa nối —
  thuộc H0/P6/P7) nên allow ở tầng pre-check này chưa gây hại thật (tầng
  dispatcher thật sẽ tự `UNKNOWN_SUBCOMMAND`).
- [ ] Mỗi operation chỉ gọi Core service, không fork policy/state logic:
  **chưa đóng** — `authorizeCliOperation`/`resolveCliInvocation` vẫn là
  một bản sao độc lập của phần logic phân loại shell operator/launcher
  path (không dùng chung `classifyCommand`/`evaluatePreAction`). Đợt này
  chỉ sửa các bug cụ thể bên trong bản sao đó (null snapshot,
  default-allow, tokenizer) chứ chưa xoá bỏ sự trùng lặp kiến trúc — ghi
  nhận là gap còn lại, không phải đã đóng.
- [x] Stable exit classes — xác nhận đúng từ trước
  (`src/adapters/shared/cliResult.ts`'s `exitCodeFor`), không đổi.
- [x] JSON stdout một envelope, diagnostics ở stderr — xác nhận đúng từ
  trước ở cả hai launcher (`adapter/claude-code/cli.mjs`,
  `adapter/codex-plugin/cli.mjs`), không đổi. **Redact stack/sensitive
  path/token**: thêm `redactInternalError()`
  (`src/adapters/shared/cliResult.ts`) — cắt bỏ mọi dòng sau dòng đầu
  (chặn stack trace) và thay path tuyệt đối Windows/POSIX-home bằng
  `<path>`. Áp dụng ở nhánh catch-all `INTERNAL_ERROR` của cả hai
  launcher `.mjs` (nơi một lỗi Node chưa phân loại, ví dụ
  `ENOENT ... 'C:\Users\<tên>\...'`, có thể lộ path máy cục bộ/username
  trực tiếp ra stdout/stderr), **và** ở toàn bộ 9 call site còn lại
  trong `cliOperations.ts` (`init`/`validate`/`repair`/`next`×3/
  `start`×2/`verify`×2 — dòng 203, 317, 394, 525, 560, 653, 710, 769,
  790) vốn nội suy `(err as Error).message` thẳng vào response mà không
  qua nhánh `INTERNAL_ERROR`. Xác nhận không có test nào assert nguyên
  văn các message này trước khi sửa rộng (`rg` qua `test/`+`src/`), nên
  rủi ro thấp hơn đánh giá ban đầu. Red/green test:
  `src/adapters/shared/cliResult.test.ts` (4 test, cho hàm thuần) và
  `test/integration/cli-protocol.test.ts` — "P8 — a raw internal error
  surfaced by init does not leak the local filesystem path" (ép lỗi
  ENOTDIR thật qua CLI `init`, xác nhận response không còn chứa path
  tuyệt đối của máy chạy). Token/capability không nằm trong các message
  lỗi này ở đợt khảo sát — không có seam nào cần redact riêng cho token.
- [x] Blocking warning chưa ack trả `ok=false` — xác nhận đúng từ P6
  (`ANSWER_NEEDS_USER_ACK`), không đổi.
- [x] `status`/`next` không catch corruption thành null/uninvolved — xác
  nhận đúng từ trước, không đổi.

### Việc còn lại đáng chú ý

- `authorizeCliOperation`/`resolveCliInvocation` vẫn là một authority
  song song với Core thay vì được hợp nhất vào `evaluatePreAction`; đợt
  này chỉ vá các bug cụ thể bên trong, chưa xoá bỏ sự trùng lặp.
- `action_kind: 'delete' | 'rename'` chưa tồn tại trong
  `PreActionRequest`; MultiEdit/NotebookEdit vẫn chỉ coerce thành `Edit`.
- Resolver launcher-path/version/hash-từ-manifest phụ thuộc P9 (chưa có
  install manifest per-file hash để verify).

### Exit criteria

- [~] Adapter không còn homegrown state/path/command/gate mutation:
  path/command đã dùng chung Core ở nhánh Write/Edit/Bash chính
  (`evaluatePreAction`); nhánh CLI pre-check (`authorizeCliOperation`)
  vẫn là logic riêng, đã vá bug cụ thể nhưng chưa hợp nhất — chưa đạt
  đầy đủ.
- [x] Không production authorization call nào truyền null snapshot khi
  snapshot load được — xem trên; fallback `null` khi load thất bại vẫn
  còn (có chủ đích, xem trên).
- [ ] Claude/Codex dùng cùng Core reason code và state digest cho cùng
  fixture: chưa audit lại trong đợt này.

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
