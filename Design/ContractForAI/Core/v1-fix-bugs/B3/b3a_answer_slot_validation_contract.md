# B3a — Answer and slot validation engine contract

## 1. Micro-task target

Biến answer/slots từ string/map tùy ý thành dữ liệu có schema theo question/slot, chống rỗng/generic, path escape và overwrite câu đã xác nhận.

## 2. Scope

### In scope

- Generic answer_contract schema và deterministic validator.
- Slot file containment/shape/provenance envelope.
- Immutable raw answers và acknowledgement state.

### Out of scope

- Nội dung rule cụ thể cho S/W/M/C/R; thuộc B3b.
- Chất lượng prose cuối cùng; thuộc B3b/B5c.

## 3. Implementation checklist

- [ ] Mở interview-script schema bằng answer_contract declarative: required, min_trimmed_chars, min_items, required_fields, enum/pattern và warning rules.
- [ ] Validator có ba outcome: valid, invalid, needs_user_ack; warning không tự biến thành pass.
- [ ] Luôn reject empty/whitespace, placeholder-only và invalid structured payload trước commit.
- [ ] Raw answer đã confirmed là append-only/immutable; correction tạo revision mới có supersedes + capability riêng.
- [ ] Slots envelope gồm slot_schema_version, question_id/derived_recipe_id, source_answer_revisions, producer_version, created_at và payload.
- [ ] Chỉ đọc slots dưới scratch path B2a đã canonicalize bằng B2c; reject absolute/outside/symlink/oversize/wrong extension.
- [ ] Allowlist key theo current question hoặc derived recipe; reject unknown, past/future và reserved state keys.
- [ ] Không cho slots override answers, progress, branch, capability, policy hoặc managed manifest.
- [ ] Commit chỉ nhận validated typed payload, không nhận raw JSON map.
- [ ] Error trả exact field/rule/reason_code và không consume capability khi user cần sửa.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Core/Schemas/interview-script.md — answer_contract và slot contract.
- [NEW] src/core/schemas/answerContract.ts — khoảng 60–100 dòng.
- [NEW] src/core/validateAnswer.ts — khoảng 100–160 dòng.
- [NEW] src/core/loadQuestionSlots.ts — khoảng 80–130 dòng.
- [MODIFY] src/core/schemas/index.ts và src/core/advanceState.ts.
- [NEW] src/core/validateAnswer.test.ts và loadQuestionSlots.test.ts.

Interface đích:

- validateAnswer(questionContract, payload) → valid | invalid | needs_user_ack
- loadQuestionSlots(root, scope, file) → typed slots | rejection
- applyAnswerRevision(store, validatedAnswer, capability) → transaction mutation

## 5. Risks & mitigations

- Over-validation làm newbie kẹt: invalid chỉ cho cấu trúc tối thiểu; rule chủ quan thành warning + user ack.
- Schema hardcode question ids trong Core: Core chỉ hiểu declarative contract, Content B3b sở hữu rule.
- Slots lớn/DoS: size/depth/item limits trước parse và schema parse bounded.

## 6. Verification plan

- Reject empty, whitespace, placeholder, zero-item Must, unknown keys, wrong question và outside-workspace slots.
- needs_user_ack không advance cho tới capability ở prompt xác nhận riêng.
- Past raw answer không bị overwrite; correction có revision/provenance.
- Valid fixtures cho mỗi supported payload shape.
- Property/fuzz malformed JSON/deep arrays không crash hoặc mutate state.

## 7. Status

WAITING_FOR_APPROVAL
