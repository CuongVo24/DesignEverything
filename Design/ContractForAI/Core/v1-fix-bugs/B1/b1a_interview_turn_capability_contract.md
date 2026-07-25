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

- [x] Bump progress/interview schema; thêm state_revision và pending_turn_capability (đã có trước lần sửa 2026-07-25; đã dùng chỗ này).
- [x] Capability gồm opaque id đủ entropy, session_id, operation_kind, question_id, expected_revision, issued_at, expires_at và consumed_at/status (`turnCapability.ts`, không đổi).
- [x] Chỉ UserPromptSubmit được issue capability; caller không truyền user_turn_id tùy ý vào commitStep — đã xoá hoàn toàn nhánh legacy fallback ở `commitStep`/`commitDeepenAnswer`; `capabilityToken` bắt buộc, `userTurnId` không còn là tham số.
- [x] Persist hash của token, không log hoặc echo plaintext sau khi issue — plaintext chỉ tồn tại trong biến cục bộ `onUserPromptSubmit` và trong `additionalContext` trả về UserPromptSubmit hook cho đúng lượt đó; state chỉ giữ `token_hash`.
- [x] commitStep nhận token + current revision; exact match tất cả binding mới được advance (không đổi logic verify, chỉ xoá đường vòng).
- [x] Consume capability trong cùng lệnh gọi `commitStep`/`commitDeepenAnswer`; lần gọi thứ hai trả TURN_CAPABILITY_REPLAY (unit + e2e + installed-hook subprocess test).
- [x] Capability cũ tự invalid khi câu hỏi, branch, session hoặc revision đổi (không đổi, đã có sẵn trong `verifyTurnCapability`).
- [x] Deepen commit dùng cùng primitive với operation_kind=deepen và module/question binding (`commitDeepenAnswer` nay bắt buộc capabilityToken giống commitStep).
- [x] Loại check "bắt ở lượt người dùng kế tiếp"; violation phải bị từ chối ngay tại commit (nhánh legacy đã xoá; deepen's `userTurnId === last_user_turn_id` no-op-else-allow bug cũng đã xoá).
- [ ] Migrator không biến last_user_turn_id cũ thành token hợp lệ; buộc issue capability mới — **CHƯA LÀM**: `migrateInterviewStore`/`loadProgress` chưa được audit riêng cho việc này trong lần sửa này; xem R02 trong finding-coverage-matrix.md, còn lại cho P2.2.

**Bổ sung ngoài checklist gốc, phát hiện khi nối dây (2026-07-25):** `src/core/loadProgress.ts`
`saveProgress` có bug alias nghiêm trọng — mutator truyền cho `transactInterviewStore` gán thẳng
tham chiếu `p` làm `payload.progress`, nên bước stamp revision nội bộ của `transactInterviewStore`
ghi đè `state_revision` của `p` ngay trong bộ nhớ, làm lệch khỏi `expected_revision` mà capability
vừa phát hành — khiến MỌI commit hợp lệ đều bị `TURN_CAPABILITY_WRONG_REVISION` một khi capability
bắt buộc. Đã sửa bằng `structuredClone(p)` trước khi truyền vào mutator. Đây là lý do
`TURN_CAPABILITY_WRONG_REVISION` không lộ ra trước đây: đường fallback legacy không kiểm revision
nên bug bị che giấu.

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

Spec: WAITING_FOR_APPROVAL | Implementation: PARTIAL (9/10 checklist items done, migrator audit
còn lại) | Proof: SEAM_PARTIAL

Cập nhật 2026-07-25: legacy `userTurnId`-based bypass (X01/R01) đã xoá khỏi
`commitStep`/`commitDeepenAnswer`; plaintext token nay thật sự được UserPromptSubmit trả về và
injected cho caller (trước đó bị tính/rồi vứt bỏ, khiến việc bật capability bắt buộc sẽ phá vỡ toàn
bộ luồng — xem ghi chú alias bug ở trên). Test: `src/core/advanceState.test.ts`,
`src/core/deepenState.test.ts`, `src/adapters/claude/userPromptSubmit.test.ts`,
`src/adapters/claude/skill/render-inject.test.ts`, `test/e2e/*-flow.test.ts`,
`test/e2e/*-edge-cases.test.ts`, `test/journey/newbie-shapes.test.ts`,
`test/integration/adapter-parity.test.ts` (thật spawn cả hai CLI), và
`test/integration/installed-runtime/hook-adversarial.test.ts` X01/X01b/X01c (thật spawn hook
subprocess qua stdin/stdout, không chỉ import Core). Chưa VERIFIED ở mức installed-runtime đầy đủ
vì chưa đi qua `install.mjs` thật (đó là B4d, chưa bắt đầu) — giữ ở SEAM_PARTIAL theo đúng quy tắc
"không dùng test Core pass thay cho installer/wrapper test" trong finding-coverage-matrix.md.
