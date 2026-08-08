# B3e — Deepen lifecycle and tier-2 transaction contract

## 1. Micro-task target

Khóa deepen đúng thời điểm, cùng one-turn capability/quality/transaction như tier-1 và làm validation snapshot stale khi tier-2 ảnh hưởng plan.

## 2. Scope

### In scope

- Preconditions opt-in/deepen question/commit/emit.
- State schema cho module tier-2.
- Capability, provenance, catalog và transactional activation.

### Out of scope

- Installer copy asset; thuộc B4d.
- Skill wording; thuộc B4f.

## 3. Implementation checklist

- [x] Deepen chỉ cho opt-in khi tier-1 active manifest healthy (`activated_at !== null`) và interview không còn câu bắt buộc — [`canStartDeepen`](../../../../src/core/deepenLifecycle.ts).
- [x] Deny trong `executing`, `verifying`, `repairing`, `reviewing`, `blocked`; `reason_code: EXECUTION_BUSY` nêu rõ pha hiện tại.
- [x] Module/question state machine đã lấy từ `deepen-script.yaml` từ trước B3e (`expandQuestionInstances`, `canEmitModule`); `computeSourceDigest` bind digest tier-1 docs + deepen answers theo module — không đổi, đã có sẵn và test qua.
- [x] Mỗi deepen commit cần capability B1a: sửa lỗ hổng kiểu (`commitDeepenAnswer`'s `args` thiếu field `capabilityToken`, khiến nhánh capability không bao giờ compile-safe) — nay `capabilityToken?`/`userTurnId?` đều optional đúng như `commitStep` (B1a) đã làm cho tier-1.
- [x] Slot validation/provenance dùng B3a/B3b — không đổi (`commitDeepenAnswer` đã reject unknown module/question/subject từ trước; kế thừa nguyên vẹn).
- [x] Nếu tier-2 làm đổi architecture/test/plan inputs (module `adr`/`test-strategy`), mark validation snapshot stale (`block_reason.kind='snapshot-stale'`, `recoverable_by='/build validate'`) qua [`invalidateSnapshotForTier2`](../../../../src/core/deepenLifecycle.ts); `glossary`/`feature-spec` không bao giờ invalidate.
- [x] Missing/corrupt deepen asset (`deepen-script.yaml`) ở project đã opt-in ≥1 module là `inspectRuntimeHealth` **error** (`MISSING_DEEPEN_SCRIPT`/`CORRUPT_DEEPEN_SCRIPT`), không phải warning mềm.
- [x] next-step chỉ hiển thị deepen pending khi `deepenPending.length > 0` và không nằm trong busy phases — **đã đúng từ trước B3e** ([renderNextStep.ts](../../../../src/adapters/shared/renderNextStep.ts) mục 0b), xác nhận lại không cần sửa.
- [x] Tier-2 emit dùng catalog B3c và transaction B3d, không write docs/design trực tiếp — **note 2026-07-30 đã lỗi thời khi viết lại 2026-08-08**: `emitTier2.ts` đã đi qua `prepareEmit`/`activateEmit` từ commit `623477b`/`81c5769` (2026-07-28, TRƯỚC cả ngày ghi PARTIAL) — managed set/manifest partition theo `module_id` qua `tier2ChannelFor()` (kênh `tier2-${module}` riêng biệt), mỗi module activation CAS-guarded độc lập; re-emit module A không đụng manifest/artifact của module B (đã test ở `emitTier2.test.ts`). Đây là gap tài liệu, không phải gap code.
- [x] Mỗi deepen commit cần transaction B1b — `transactDeepenStore` (deepenState.ts, cùng lock `interview-state.lock` với `transactInterviewStore` — không tạo authority store thứ hai) nay bọc cả 3 loại writer: opt-in (`optInDeepenModule`), capability issue (`issueDeepenCapability`/`issueDeepenRerunCapability`) và commit (`commitDeepen`/`rerunDeepen` qua `commitOrRerunDeepen`). `commitDeepenAnswer` (capability verify + state mutation) chạy TRONG mutator của transaction, trên state vừa reload dưới lock — không còn quyết định dựa trên snapshot đọc trước khi giữ lock. `persistDeepenAnswerText` (answer text + history) chạy như `sideEffect`, cùng trong lock, TRƯỚC khi `deepen-state.json` được ghi: nếu sideEffect throw, cả transaction abort — capability không bị tiêu thụ mà answer text không được ghi là không thể xảy ra.
- [x] Re-run module là amendment/version mới — `deepenAnswerRefSchema` thêm `generation`/`supersedes` (additive, `.default()` tương thích ngược file cũ trên đĩa). `commitDeepenAnswer` nhận `rerun?: boolean`: false (mặc định) giữ nguyên hành vi one-shot cũ (reject nếu đã answered); true yêu cầu đã có entry, push entry MỚI (`generation = cũ+1`, `supersedes = generation cũ`) — entry cũ không bị xoá/sửa. `issueDeepenRerunCapability` (application service mới, khác `issueDeepenCapability` — chỉ nhắm instance ĐÃ answered thay vì tìm "next" chưa answered) + `rerunDeepen`. `persistDeepenAnswerText` ghi vào `deepen-answer-history.json` (append-only, mọi generation) TRƯỚC khi cập nhật current-value projection trong `answers.json` — mọi reader hiện có (renderers, `computeSourceDigest`, `emitTier2`) tiếp tục đọc `answers.json` không đổi, chỉ giá trị hiện hành mới nhất. CLI/adapter wiring cho rerun (một subcommand `--rerun`) cố ý CHƯA làm trong phase này — B3e chỉ ở Core layer (xem README.md); B4b/B4c đã đóng IMPLEMENTED trước đó và mở lại CLI surface là phạm vi B4, không phải B3e.

## 4. Interfaces / Files expected to change

- [DONE] src/core/deepenState.ts — fix kiểu `commitDeepenAnswer` args (`capabilityToken?`/`userTurnId?` optional); thêm `transactDeepenStore` (CAS + shared lock); `commitDeepenAnswer` nhận `rerun?: boolean` + đẩy `generation`/`supersedes`; export `fillTargetDoc`.
- [DONE] src/core/schemas/deepenState.ts — `deepenAnswerRefSchema` thêm `generation`/`supersedes` (additive, có default).
- [DONE] src/core/deepenLifecycle.ts (mới) — `canStartDeepen`, `isPlanAffectingModule`, `invalidateSnapshotForTier2`.
- [DONE] src/core/runtimeHealth.ts — thêm check `MISSING_DEEPEN_SCRIPT`/`CORRUPT_DEEPEN_SCRIPT`.
- [DONE] src/core/emitTransactionActivate.ts, src/core/recoverEmitTransaction.ts — tham số `channel: 'tier1'|'tier2'` (tier-2 dùng kênh `tier2-${module}` riêng từng module).
- [DONE] src/core/emitTier2.ts — đã nối `prepareEmit`/`activateEmit` từ 2026-07-28 (commit `623477b`/`81c5769`); mục 3 trước đây ghi nhầm "chưa làm".
- [DONE] src/core/deepenApplicationServices.ts — `issueDeepenCapability`/`commitDeepen` route qua `transactDeepenStore`; thêm `issueDeepenRerunCapability`, `rerunDeepen`, `commitOrRerunDeepen`, `appendDeepenAnswerHistory` (ghi `Design/.interview/deepen-answer-history.json`, append-only).
- [UNCHANGED] src/adapters/shared/renderNextStep.ts — đã đúng hành vi từ trước, chỉ xác nhận lại bằng đọc code, không sửa.
- [DONE] Design/Core/Schemas/state-schema.md — thêm mục quan hệ progress.json / emit-manifest / deepen; bổ sung generation/supersedes + answer-history.json.
- [DONE] Design/Content/taxonomy-tier2.md — thêm mục "Vòng đời deepen và ảnh hưởng lên execution state (B3e)"; bổ sung rerun/versioning.
- [DONE] src/core/deepenLifecycle.test.ts — 14 test (opt-in preconditions × 6 kịch bản, plan-affecting classification, snapshot invalidation × 3 kịch bản).
- [DONE] src/core/deepenState.test.ts — thêm test `transactDeepenStore` (happy path, REVISION_CONFLICT, sideEffect fail-closed) và rerun (`commitDeepenAnswer` generation/supersedes, reject rerun-chưa-answered).
- [DONE] test/integration/deepen-rerun.test.ts (mới) — issueDeepenRerunCapability/rerunDeepen end-to-end trên workspace thật: generation tăng, history giữ nguyên bản cũ, replay bị chặn, rerun không phá completeness.

Interface đích:

- canStartDeepen(runtimeSnapshot, moduleId) → decision
- commitDeepenAnswer(store, script, {..., rerun?}) → state mới (generation/supersedes) — chạy trong transactDeepenStore's mutator ở tầng application service
- issueDeepenRerunCapability(workspace, moduleId, questionId, subjectId) → capability cho instance đã answered
- rerunDeepen(workspace, args) → { ok: true; generation } — amendment transaction, giữ history trong deepen-answer-history.json

## 5. Risks & mitigations

- Deepen làm người dùng kẹt trước build: opt-in và next-step mềm; không tự bật.
- Tier-2 sửa plan ngầm: source digest + explicit snapshot-stale transition.
- Re-emit mất ADR/feature cũ: managed manifest/versioned amendment và stale cleanup đúng ownership.

## 6. Verification plan

- Deny deepen trước tier-1 emit, khi tier-1 unhealthy và trong busy/blocked execution phases.
- Forged/replayed tier-1/deepen token đều deny.
- Tier-2 failure injection không partial docs/design.
- Tier-2 plan-affecting change bắt revalidate; non-plan module không invalidation thừa.
- Re-run giữ history/provenance và không overwrite raw confirmed data.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): sửa từ vocabulary cũ đã bỏ
(`PARTIALLY_IMPLEMENTED_WAITING_FOR_REVIEW`) về đúng 3 trục khớp README.md. Lifecycle gating
(opt-in preconditions, plan-invalidation, health error, next-step) done và tested; tier-2
transactional rewrite của `emitTier2.ts` và B1b transaction wrapper còn lại (rủi ro đổi hành vi
cleanup cần người duyệt quyết định trước khi làm). X17 (deepen chưa khóa phase tier-1, chưa dùng
capability một-lượt) vẫn OPEN.

Cập nhật 2026-08-08 (A1-P7 tiếp tục): đóng nốt cả 3 mục §3 còn lại. (1) Tier-2 transactional emit
hoá ra đã đúng từ 2026-07-28 (`623477b`/`81c5769`) — note cũ ghi "chưa làm" là lỗi thời, chỉ cần sửa
tài liệu. (2) `transactDeepenStore` (CAS + lock chung với B1b's `transactInterviewStore`) nay bọc
toàn bộ 3 loại deepen-state.json writer (opt-in, capability issue, commit); `commitDeepenAnswer`
chạy trong mutator trên state vừa reload dưới lock, `persistDeepenAnswerText` chạy như sideEffect
trước khi ghi — fail-closed đúng như thiết kế. (3) Rerun/versioning: `generation`/`supersedes`
thêm vào `deepenAnswerRefSchema` (additive); `commitDeepenAnswer(..., rerun: true)` push generation
mới thay vì reject hay overwrite; `issueDeepenRerunCapability`/`rerunDeepen` (application service
mới) + `deepen-answer-history.json` (append-only, giữ mọi bản answer cũ) hoàn tất "current pointer +
history" đúng semantics đã duyệt. CLI/adapter wiring cho rerun cố ý chưa làm (B4 territory, ngoài
layer Core của B3e). 948/950 test xanh (2 skip — symlink, môi trường Windows). X17 vẫn OPEN (chưa
thuộc §3 checklist của B3e; theo dõi riêng).
