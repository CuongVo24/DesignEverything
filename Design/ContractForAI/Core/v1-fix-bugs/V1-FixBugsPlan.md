# V1 Fix Bugs Plan — TaskBrief khóa trước code

## 1. Bối cảnh audit

Audit đi theo runtime thật: installer → SessionStart/UserPromptSubmit → skill → CLI commit/emit/deepen → PreToolUse → /build validate/next/start/verify/review. Các test đích hiện hành có thể xanh nhưng chưa chạm nhiều seam của bản cài thật.

Ba hiệu chỉnh bằng chứng cần giữ trong mọi tài liệu sửa:

1. Interview không chỉ CAL0 + S0–S8 + R1; còn có W1–W5, M1–M5 hoặc C1–C5 theo shape, hybrid chạy cả web và mobile.
2. Runtime hiện sinh 12 docs cho web/mobile/CLI, 13 docs cho hybrid, ngoài ra có docs/conventions và .design-everything/execution-plan.json. Các claim 10/11 file là drift.
3. deepen-script.yaml hiện đã tracked; bug thật là installer Claude không copy asset này sang target.

## 2. Mục tiêu và ngoài phạm vi

### In scope

- State schemas, transition table, single-use turn authorization và atomic stores.
- Protected paths, command/path classifiers, gate evidence và fail-closed recovery.
- Answer/slot quality, provenance, artifact catalog, transactional emit và deepen lifecycle.
- Claude/Codex CLI, hooks, installer, skill wording, packaging integrity.
- Integration, adversarial, fault-injection, newbie journey và release truth.

### Out of scope

- Thêm project shape mới hoặc câu hỏi nghiệp vụ mới không cần cho sửa lỗi.
- Autonomous deploy, network install service hoặc chấm chất lượng bằng LLM như nguồn pass duy nhất.
- Xóa/sửa tay output thuộc người dùng ngoài managed manifest.

## 3. Các quyết định khóa

| ID | Quyết định |
|---|---|
| F01 | Thay TURN_ID tự khai bằng capability do UserPromptSubmit phát hành, bind session + question + state revision, dùng đúng một lần và hết hạn. |
| F02 | Commit answer là một transaction gồm progress, answers, slot/provenance và capability consumption; không lưu từng file rời rạc. |
| F03 | Emit thành công tạo execution-state ở plan-validating. ready-to-build chỉ có nghĩa sẵn sàng vào /build, không có nghĩa được ghi code. |
| F04 | Không có execution-state trong project đã emit/cài đặt là deny + recovery, không được skip requires_validation. |
| F05 | blocked có blocked_kind/reason_code và bảng transition; validate chỉ gỡ validation block, không gỡ verification-abort hoặc task-failure. |
| F06 | Engine-owned artifacts không được sửa qua Write/Edit/Bash; scratch duy nhất là vùng session/question-scoped đã allowlist. |
| F07 | Command classifier parse argv theo tool/platform; unknown là deny. Không dùng basename hoặc substring để cấp quyền. |
| F08 | Mọi đường dẫn normalize theo workspace-relative POSIX form, reject traversal/symlink escape và match theo segment. |
| F09 | Gate dựa trên exact relative path + integrity/quality evidence; gates_passed là derived view được recompute và có thể revoke. |
| F10 | Answer/slot dùng schema theo question/slot; whitespace, placeholder và semantic-empty bị reject deterministic. Cảnh báo chủ quan phải hiện cho user xác nhận/sửa. |
| F11 | Nội dung dẫn xuất có source refs, input digest, producer/version và coverage; assertion không có nguồn phải marked unknown. |
| F12 | Artifact catalog là nguồn duy nhất cho file tree/count/path ownership; CLI/docs/tests không hardcode số file. |
| F13 | Emit render vào staging, validate trước promotion, atomic promote managed set và giữ nguyên user-owned files. |
| F14 | Installer ghi install manifest gồm version/build hash/asset hashes/hook IDs; rerun repair hook/asset cũ có chủ đích. |
| F15 | Claude và Codex dùng cùng shared CLI/runtime hoặc generated thin launchers có parity hash test; không duy trì hai bản logic copy tay. |
| F16 | Exit code 0 chỉ dành cho operation pass. Error/warning/recovery có reason code và JSON envelope ổn định. |
| F17 | Deepen chỉ opt-in sau tier-1 emit hợp lệ, dùng turn capability, asset có trong package và output tier-2 cũng transactional. |
| F18 | Public claim chỉ được release khi installed-runtime tests, fault injection và newbie journey report đều pass. |

## 4. State model đích

### Interview

uninstalled → interview → tier1-ready-to-emit → emitting → ready-for-validation

- capability pending chỉ tồn tại trong interview/deepen question confirmation.
- Mỗi successful commit tăng state_revision đúng 1.
- Mọi transaction lỗi giữ nguyên revision và capability chưa bị tiêu thụ hoặc phục hồi theo journal.

### Execution

plan-validating → ready-to-execute → executing → verifying → reviewing → ready-to-ship

Các nhánh blocked phải mang loại:

- validation
- artifact-integrity
- snapshot-stale
- verification-failed
- verification-aborted
- policy-corrupt

Chỉ remediation command đúng blocked_kind được phép chạy.

## 5. Threat model tối thiểu

- Agent tự bịa turn-a/turn-b trong cùng user turn.
- Agent Write trực tiếp progress.json, answers.json, gate-policy.yaml, script.yaml hoặc docs managed.
- Bash dùng git clean/restore/branch -D, find -delete/-exec, shell chaining, redirection hoặc command chứa chuỗi cli.mjs để lách.
- Xóa progress/execution-state để biến project thành “chưa tham gia”.
- Tạo docs/archive/00-vision.md để đánh lừa basename gate.
- Đổi/xóa artifact sau khi gate đã pass.
- slots-file trỏ ra ngoài workspace hoặc ghi đè answer đã xác nhận.
- Kill process giữa hai write hoặc giữa staging và promotion.
- Di chuyển repo engine, để dist stale hoặc rerun installer trên hook cũ.

## 6. Definition of Done toàn chương trình

- 24 contract trong README đều APPROVED rồi DONE theo dependency.
- Coverage matrix không còn dòng OPEN hoặc chỉ có manual assertion.
- Schema docs, DecisionLog, Versioning, ConformanceMatrix và runtime code cùng một target MAJOR version.
- Unit tests phủ transition/classifier/matcher/schema.
- Integration tests gọi installer, wrapper và CLI thật trên temporary target ở Windows-compatible paths.
- Failure-injection chứng minh không partial state/docs.
- Golden/newbie journey phủ web, mobile, CLI, hybrid và deep/fast.
- Quickstart thực tế kết thúc bằng chỉ dẫn /build validate; không nói “gate đã mở để code” trước ready-to-execute.

## 7. Chiến lược version/migration

Các thay đổi progress/execution-state/gate semantics là breaking. Target là 7.0.0 nếu 6.x vẫn là release hiện hành; nếu version repo đã tiến khi implement thì dùng next MAJOR. Installer phải phát hiện state cũ, backup có kiểm soát và chạy migrator explicit; không tự parse hoặc sửa âm thầm.

## 8. Trạng thái

WAITING_FOR_APPROVAL — TaskBrief này khóa intent; từng micro-contract mới cấp quyền code theo batch.
