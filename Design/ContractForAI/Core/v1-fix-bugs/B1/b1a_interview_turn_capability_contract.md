# B1a — Single-use interview turn capability contract

## 1. Micro-task target

Thay TURN_ID do agent tự khai bằng capability do runtime phát hành, bind đúng session/câu hỏi/revision và chỉ commit được một lần cho mỗi lượt người thật.

## 2. Scope

### In scope

- Schema capability cho interview và deepen.
- Phát hành ở UserPromptSubmit, kiểm và tiêu thụ trong commit Core.
- Chống replay, token tự bịa, token của session/câu hỏi/revision khác và token hết hạn.
- Migration state cũ có last_user_turn_id/answered_len_at_last_turn.

### Out of scope

- Đánh giá ngữ nghĩa answer; thuộc B3a.
- Persistence nhiều artifact; thuộc B1b.
- Host-specific stdin/stdout; thuộc B4a.

## 3. Implementation checklist

- [ ] Bump progress/interview schema theo next MAJOR; thêm state_revision và pending_turn_capability.
- [ ] Capability gồm opaque id đủ entropy, session_id, operation_kind, question_id, expected_revision, issued_at, expires_at và consumed_at/status.
- [ ] Chỉ UserPromptSubmit được issue capability; caller không truyền user_turn_id tùy ý vào commitStep.
- [ ] Persist hash của token, không log hoặc echo plaintext sau khi issue.
- [ ] commitStep nhận token + current revision; exact match tất cả binding mới được advance.
- [ ] Consume capability và tăng revision trong cùng transaction B1b; lần gọi thứ hai trả TURN_CAPABILITY_REPLAY.
- [ ] Capability cũ tự invalid khi câu hỏi, branch, session hoặc revision đổi.
- [ ] Deepen commit dùng cùng primitive với operation_kind=deepen và module/question binding.
- [ ] Loại check “bắt ở lượt người dùng kế tiếp”; violation phải bị từ chối ngay tại commit.
- [ ] Migrator không biến last_user_turn_id cũ thành token hợp lệ; buộc issue capability mới.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Core/Schemas/state-schema.md — khóa capability, revision và migration.
- [MODIFY] src/core/schemas/state.ts — khoảng 25–45 dòng schema.
- [MODIFY] src/core/advanceState.ts — thay signature commitStep; bỏ authorization dựa trên string tự khai.
- [NEW] src/core/turnCapability.ts — khoảng 90–140 dòng; issue/verify/consume pure logic.
- [MODIFY] src/adapters/claude/userPromptSubmit.ts — chỉ gọi Core issue; wiring chi tiết ở B4a.
- [MODIFY] src/core/advanceState.test.ts và test mới turnCapability.test.ts.

Interface đích:

- issueTurnCapability(state, context) → { state, token, expiresAt }
- commitStep(state, script, { capabilityToken, branchChoice }) → state
- verifyTurnCapability(state, token, expected) → discriminated result có reason_code

## 5. Risks & mitigations

- Token lộ qua log: redact toàn bộ token; test snapshot không chứa plaintext.
- Hai commit đồng thời cùng token: B1b dùng compare-and-swap trên state_revision và lock transaction.
- Host không cung cấp stable session id: adapter sinh id lúc SessionStart và giữ trong canonical state.
- Timeout làm người dùng trả lời chậm: expiry cấu hình hợp lý và có flow re-issue không advance.

## 6. Verification plan

- Unit: token đúng commit một bước; replay, forged, expired, wrong-session, wrong-question, wrong-revision đều deny.
- Concurrency: hai commit song song cùng token chỉ một success.
- Sequence: agent tự đặt turn-a rồi turn-b trong cùng prompt không thể advance lần hai.
- Migration: state cũ yêu cầu prompt/capability mới, không silently commit.
- Deepen: token tier-1 không dùng cho deepen và ngược lại.

## 7. Status

WAITING_FOR_APPROVAL
