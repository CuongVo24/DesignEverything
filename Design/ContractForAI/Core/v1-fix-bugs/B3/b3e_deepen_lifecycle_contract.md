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

- [ ] Deepen chỉ cho opt-in khi tier-1 active manifest healthy và interview không còn câu bắt buộc.
- [ ] Deny trong executing, verifying, repairing, reviewing hoặc blocked; policy nêu rõ thời điểm an toàn.
- [ ] Module/question state machine lấy từ deepen-script, bind source tier-1 generation digest.
- [ ] Mỗi deepen commit cần capability B1a và transaction B1b; không truyền TURN_ID tự đặt.
- [ ] Slot validation/provenance dùng B3a/B3b; arbitrary module/key/path bị reject.
- [ ] Tier-2 emit dùng catalog B3c và transaction B3d, không write docs/design trực tiếp.
- [ ] Nếu tier-2 làm đổi architecture/test/plan inputs, mark validation snapshot stale và yêu cầu /build validate lại.
- [ ] Re-run module là amendment/version mới, không silently overwrite confirmed answer.
- [ ] Missing/corrupt deepen asset ở project đã opt-in là health error, không warning mềm.
- [ ] next-step chỉ hiển thị deepen pending khi thật sự opt-in và không lấn execution recovery.

## 4. Interfaces / Files expected to change

- [MODIFY] src/core/deepenState.ts và schemas liên quan.
- [MODIFY] src/core/emitTier2.ts.
- [MODIFY] src/adapters/shared/renderNextStep.ts.
- [MODIFY] Design/Core/Schemas/state-schema.md.
- [MODIFY] Design/Content/taxonomy-tier2.md.
- [NEW] src/core/deepenLifecycle.test.ts.

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

WAITING_FOR_APPROVAL
