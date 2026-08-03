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

Spec: APPROVED | Implementation: PARTIAL | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. X12 (slots-file đọc path/key tuỳ ý) một phần đã sửa — path đã confine vào workspace
và same-key resubmission không còn ghi đè im lặng (`interviewApplicationServices.ts`), nhưng chưa có
directory allowlist ngoài workspace-confinement và slot key chưa scope theo câu hỏi hiện tại — vẫn
`finding-coverage-matrix.md` X12 PARTIAL. U05 (Must rỗng vẫn lọt) vẫn PARTIAL, chưa qua CLI thật.

Cập nhật 2026-08-03 (A1-P6, đối chiếu lại checklist §3 với code thật): nhiều mục đã đóng từ trước
nhưng checklist chưa cập nhật —

- `validateAnswer.ts` **đã** enforce đủ `required/min_trimmed_chars/min_items/required_fields/
  enum_values/pattern/warning_rules`, ba outcome `valid/invalid/needs_user_ack` đúng thiết kế. Ghi chú
  cũ ở B3b §3 nói "pattern/min_items/required_fields/enum_values còn lại của B3a" đã lỗi thời — không
  còn đúng với code hiện hành.
- "Raw answer đã confirmed là append-only" — cấu trúc code hiện tại (`advanceState.ts`'s `nextStepId`
  chỉ chọn câu chưa nằm trong `answered`) khiến `current_step` không bao giờ quay lại một câu đã trả
  lời; overwrite `answers[stepId]` **không có đường chạy được trong production** — cùng dạng "dead
  path" như capability issuer ở R07/B2a. Không cần implement thêm cho tới khi có surface amend thật
  (R21, hoãn sau 7.0.0).
- "Không consume capability khi user cần sửa" — đã đúng: `commitInterviewAnswer` trả sớm ở mọi nhánh
  invalid/needs_user_ack (`interviewApplicationServices.ts`) trước khi gọi `commitStep` (nơi capability
  thật sự bị tiêu thụ).
- Key allowlist theo current question — đóng ở A1-P4đ (`slot_keys` trong `script.yaml`, enforce ở
  `interviewApplicationServices.ts`), dùng chung code path cho cả B2a/R07 lẫn B3a/U05.

**Còn mở, thật sự chưa làm:** slots envelope chưa có đủ field `slot_schema_version`/
`source_answer_revisions`/`producer_version` như §4 mô tả (hiện chỉ `{value, provenance, updated_at}`)
— đây là một migration schema lớn hơn, chưa làm trong đợt này. `--slots-file` (production path, qua
`loadSlotsFile.ts`) đọc bất kỳ đâu trong workspace đã canonicalize, không bị bó hẹp về riêng
`.design-everything/scratch/` như §3 gợi ý — `loadQuestionSlots.ts` (đúng scratch path) vẫn không có
production caller.
