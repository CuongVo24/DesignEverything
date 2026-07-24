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
- [~] Tier-2 emit dùng catalog B3c và transaction B3d, không write docs/design trực tiếp — **chưa làm**: `emitTier2.ts` vẫn ghi trực tiếp qua `writeAtomic` (atomic per-file rename), KHÔNG qua `prepareEmit`/`activateEmit`. B3d's transaction engine đã hỗ trợ kênh riêng cho tier-2 (`channel: 'tier2'` → `emit-manifest-tier2.json` tách biệt tier-1, đã có sẵn trong `emitTransactionActivate.ts`/`recoverEmitTransaction.ts`) nhưng chưa được nối vào `emitTier2.ts`. Lý do hoãn: `emitTier2.ts` đã có cơ chế atomic-write + orphan-cleanup **riêng cho từng module** (không phải toàn-tier-2), được test qua (`emitTier2.test.ts`, 5 test xanh) — rewrite sang transaction chung sẽ đổi ngữ nghĩa cleanup (hiện tại re-emit module A không đụng file của module B; một manifest tier-2 chung sẽ cần coi cả 4 module là managed set, thay đổi hành vi cần bàn kỹ trước khi làm, không nên làm vội trong cùng phiên).
- [~] Mỗi deepen commit cần transaction B1b — `commitDeepenAnswer` là pure state mutation có capability check, nhưng **chưa đóng gói qua một transaction wrapper tường minh kiểu B1b** (nếu B1b nghĩa là một module transaction riêng biệt khác capability). Cần làm rõ B1b là gì trước khi có thể tick — ghi chú tồn đọng.
- [~] Re-run module là amendment/version mới — **hành vi hiện tại là overwrite-in-place** (module doc là "trạng thái hiện tại", giống cách tier-1 docs bị ghi đè khi re-emit), không tạo bản ghi amendment riêng. Nhất quán với cách tier-1 hoạt động nhưng khác chữ "amendment/version mới" trong contract gốc — cần quyết định của người duyệt xem đây có phải đúng ý định hay cần thêm version history.

## 4. Interfaces / Files expected to change

- [DONE] src/core/deepenState.ts — fix kiểu `commitDeepenAnswer` args (`capabilityToken?`/`userTurnId?` optional).
- [DONE] src/core/deepenLifecycle.ts (mới) — `canStartDeepen`, `isPlanAffectingModule`, `invalidateSnapshotForTier2`.
- [DONE] src/core/runtimeHealth.ts — thêm check `MISSING_DEEPEN_SCRIPT`/`CORRUPT_DEEPEN_SCRIPT`.
- [DONE] src/core/emitTransactionActivate.ts, src/core/recoverEmitTransaction.ts — thêm tham số `channel: 'tier1'|'tier2'` để tier-2 có manifest/journal/backup riêng, sẵn sàng cho khi `emitTier2.ts` nối vào (xem mục 3, còn hoãn).
- [UNCHANGED] src/core/emitTier2.ts — xem ghi chú hoãn ở mục 3.
- [UNCHANGED] src/adapters/shared/renderNextStep.ts — đã đúng hành vi từ trước, chỉ xác nhận lại bằng đọc code, không sửa.
- [DONE] Design/Core/Schemas/state-schema.md — thêm mục quan hệ progress.json / emit-manifest / deepen.
- [DONE] Design/Content/taxonomy-tier2.md — thêm mục "Vòng đời deepen và ảnh hưởng lên execution state (B3e)".
- [DONE] src/core/deepenLifecycle.test.ts — 14 test (opt-in preconditions × 6 kịch bản, plan-affecting classification, snapshot invalidation × 3 kịch bản).

Interface đích:

- canStartDeepen(runtimeSnapshot, moduleId) → decision
- commitDeepenAnswer(store, capability, payload) → transaction result
- activateTier2Generation(...) → manifest + validation invalidation result

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

PARTIALLY_IMPLEMENTED_WAITING_FOR_REVIEW — lifecycle gating (opt-in preconditions, plan-invalidation, health error, next-step) done and tested; tier-2 transactional rewrite of emitTier2.ts và B1b transaction wrapper còn lại (rủi ro đổi hành vi cleanup cần người duyệt quyết định trước khi làm).
