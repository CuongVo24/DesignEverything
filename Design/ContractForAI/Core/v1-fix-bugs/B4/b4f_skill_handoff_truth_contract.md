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

- [x] Sau emit success, nói rõ docs đã sinh nhưng execution plan chưa validate; next action là /build.
- [x] Xóa mọi câu “gate đã mở”, “bắt đầu code từ M0” hoặc tương đương trước ready-to-execute.
- [x] /build bắt đầu status/health rồi validate; chỉ next/start theo Core next_command, không tự suy phase.
- [x] Skill dùng JSON result + exit code B4c; non-zero dừng và hiển thị recovery/correction, không tiếp tục.
- [x] Blocking consistency/quality warning yêu cầu user sửa hoặc acknowledgement explicit bằng capability; model không tự ack.
- [x] Không viết tay docs/progress/answers/slots ngoài scratch contract; mọi commit/emit/deepen qua CLI operation.
- [x] Mô tả journey lấy từ runtime catalog, gồm câu branch; không hardcode count.
- [x] deepen chỉ đề nghị sau tier-1 healthy/opt-in; invalid/busy phase giải thích vì sao và khi nào quay lại.
- [x] Recovery message không khuyên xóa state/reinstall mù; dùng safe_next_command từ health.
- [x] Installer completion text và skill final text dùng cùng renderNextStep source/snapshot test.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

**Implementation đóng 2026-08-06 (A1-P10).** Lịch sử: SKILL.md handoff wording ("chưa validate,
gate chưa mở") được sửa đúng ở 2026-07-25 (`85f78f2`) nhưng cùng lúc xóa mất ba thứ: cú pháp lệnh
`deepen` khả thi, quy tắc SourceRef/`⚠ unknown` user-visible, và quy tắc scope guard khi phỏng
vấn chưa xong. Ba gap đó đã đóng dần: `--turn` → `--capability-token` (2026-07-25, H0); `deepen`
wired vào dispatcher production + command block khả thi cho cả Claude/Codex +
`test/docs/skill-truth.test.ts` (`CLI_COMMAND_SURFACE` cross-check hai chiều, chặn drift) +
`test/integration/installed-runtime/deepen-fixture.test.ts` (2026-07-28/29); SourceRef/`⚠ unknown`
citation rule và scope guard line khôi phục lại cả hai SKILL.md (2026-08-06, A1-P10). Đóng luôn
U03: `docs/RUN-web-sample.md`, `RUNBOOK-web.md`, `RUNBOOK-mobile.md` không còn nói "docs tồn tại
là mở khóa code" — sửa thành đúng luồng `emit → plan-validating (deny) → /build validate →
ready-to-execute (allow)`.

**Nâng 2026-08-10 (SNAPSHOT_ONLY → UNIT_ONLY, không phải VERIFIED).** §7 bản cũ đánh giá thấp bằng
chứng đã có: `test/integration/skill-handoff.test.ts` (4 test, xác nhận chạy 2026-08-10) gọi thẳng
`renderNextStep()` và `runCliOperation()` — hành vi thật đang chạy (card `needs-validation` không
chứa "gate đã mở", card `deepen` chỉ hiện đúng phase không-busy, CLI `status` trả `CORRUPT_PROGRESS_STATE`
+ `next_command` chứa "repair" khi progress.json hỏng), không phải so khớp văn bản tĩnh. `SNAPSHOT_ONLY`
("chỉ so khớp văn bản/snapshot, không chạy hành vi thật") không còn mô tả đúng bằng chứng này.

**Gap thật còn lại (đây là lý do chưa `SEAM_PARTIAL`/`VERIFIED`):** cả 2 test file hiện có
(`skill-handoff.test.ts`, `skill-truth.test.ts`) đều gọi hàm Core trực tiếp hoặc so khớp text
SKILL.md — chưa có fixture spawn một tiến trình CLI/skill đã cài thật đi trọn handoff card (không chỉ
nhánh deepen, vốn đã có ở `deepen-fixture.test.ts`). Thuộc A2 (B5a/B5c), việc còn lại không phải việc mới.
