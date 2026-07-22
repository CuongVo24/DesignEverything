# B4f — Skill handoff, deepen and message truth contract

## 1. Micro-task target

Sửa skill để người mới luôn nhận đúng một bước kế tiếp từ Core: emit xong gõ /build để validate, chưa code; deepen chỉ hiện khi hợp lệ/opt-in.

## 2. Scope

### In scope

- /design-everything và /build wording/control flow.
- CLI JSON/exit consumption.
- Handoff, warnings, recovery và deepen messaging.

### Out of scope

- State/policy implementation.
- Quickstart/README rộng; thuộc B5d.

## 3. Implementation checklist

- [ ] Sau emit success, nói rõ docs đã sinh nhưng execution plan chưa validate; next action là /build.
- [ ] Xóa mọi câu “gate đã mở”, “bắt đầu code từ M0” hoặc tương đương trước ready-to-execute.
- [ ] /build bắt đầu status/health rồi validate; chỉ next/start theo Core next_command, không tự suy phase.
- [ ] Skill dùng JSON result + exit code B4c; non-zero dừng và hiển thị recovery/correction, không tiếp tục.
- [ ] Blocking consistency/quality warning yêu cầu user sửa hoặc acknowledgement explicit bằng capability; model không tự ack.
- [ ] Không viết tay docs/progress/answers/slots ngoài scratch contract; mọi commit/emit/deepen qua CLI operation.
- [ ] Mô tả journey lấy từ runtime catalog, gồm câu branch; không hardcode count.
- [ ] deepen chỉ đề nghị sau tier-1 healthy/opt-in; invalid/busy phase giải thích vì sao và khi nào quay lại.
- [ ] Recovery message không khuyên xóa state/reinstall mù; dùng safe_next_command từ health.
- [ ] Installer completion text và skill final text dùng cùng renderNextStep source/snapshot test.

## 4. Interfaces / Files expected to change

- [MODIFY] adapter/claude-code/skill/SKILL.md.
- [MODIFY] adapter/claude-code/skill/build/SKILL.md hoặc build skill path hiện hành.
- [MODIFY] adapter/codex-plugin/skills tương ứng theo capability.
- [MODIFY] src/adapters/shared/renderNextStep.ts nếu cần presentation token.
- [NEW] test/integration/skill-handoff.test.ts.

Interface đích:

- Skill không sở hữu transition; chỉ thực thi next_command từ trusted CliResult/NextStepCard.

## 5. Risks & mitigations

- Prompt dài: dùng một card Now/Why/Command/If fails, không copy toàn schema.
- Model bỏ qua exit code: skill instruction + integration harness assert dừng ở non-zero.
- Text hai adapter drift: shared message keys/snapshots, host-specific khác biệt explicit.

## 6. Verification plan

- Snapshot sau emit chứa /build + “chưa code”, không chứa claim gate mở.
- Validate fail/non-zero không gọi next/start.
- Quality warning không tự ack; prompt chờ user.
- Deepen pending chỉ xuất hiện đúng opt-in/phase và không đè recovery.
- Newbie transcript web/mobile/CLI/hybrid có đúng branch journey từ catalog.

## 7. Status

WAITING_FOR_APPROVAL
