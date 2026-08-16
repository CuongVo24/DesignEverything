# Conformance Matrix — Adapter theo harness

> Một adapter phải làm đúng 3 việc INJECT/GATE/EMIT ([../Core/Contract.md](../Core/Contract.md)). Bảng này theo dõi từng harness làm được tới đâu và đã test chưa.

## Tại sao cần file này
"Chết vì bảo trì N nền tảng" là rủi ro lớn nhất. Bảng này giữ kỷ luật: chỉ phủ harness đã test thật, biết rõ cái nào ép cứng / mềm.

## Ma trận

| Harness | Bậc | INJECT | GATE | EMIT | `interactive_choice` (8.1–8.2) | Trạng thái | File |
|---|---|---|---|---|---|---|---|
| **Claude Code** | A (cứng) | skill / slash command đọc `script.yaml` | `SessionStart` + `UserPromptSubmit` + `PreToolUse` | cây taxonomy + anchor | ✅ thẻ tương tác thật (`AskUserQuestion`, `multiSelect` theo `multi_select`); batch (`question_ids`) + `checkRate` ép cứng số câu/lượt; `undo` hoàn tác 1 bước | ✅ Đã code + test | [sessionStart.ts](../../src/adapters/claude/sessionStart.ts), [userPromptSubmit.ts](../../src/adapters/claude/userPromptSubmit.ts), [preToolUse.ts](../../src/adapters/claude/preToolUse.ts), [render-inject.ts](../../src/adapters/claude/skill/render-inject.ts), [emit.ts](../../src/core/emit.ts) |
| **AGENTS.md** (Codex, Cursor, Cline...) | B (mềm) | sinh rules từ lõi vào `AGENTS.md` | rules text map từ gate-policy | cây taxonomy + anchor | text liệt kê (degradation) — cùng văn xuôi `deriveAnswerText`/`deriveMultiAnswerText` với Claude, không native card; batch/`undo` chỉ là chỉ dẫn best-effort trong prose — harness này KHÔNG có `checkRate`/token multi-câu nào ép buộc | Generator: ✅ (unit test) <br> Harness smoke run: ⏳ (defer Month 3) | [generateAgentsMd.ts](../../src/adapters/agents/generateAgentsMd.ts) |
| Cursor (native `.mdc`) | B | `.cursorrules`/`.mdc` | rules text | cây taxonomy | ⏳ để sau | ⏳ để sau | — |
| Antigravity | B | rules | rules text | cây taxonomy | ⏳ để sau | ⏳ để sau | — |
| Windsurf / Continue | B | rules | rules text | cây taxonomy | ⏳ để sau | ⏳ để sau | — |

`interactive_choice` mở ở lane 8.1 (Interactive Question Cards, `Design/RoadMap/InteractiveQuestionCardsPlan.md`) và mở rộng ở lane 8.2 (Interview Cadence, [InterviewCadencePlan.md](../RoadMap/InterviewCadencePlan.md)): câu có `options`/`option_hints` trong `script.yaml` được adapter render thành lựa chọn thay vì free-text thuần; từ 8.2 thêm gộp nhiều câu vào một lượt (batch, D60), chọn nhiều lựa chọn (`multi_select`, D61), và hoàn tác một bước (`undo`, D59). Claude Code render thẻ native VÀ có enforcement thật ở tầng engine (`turnCapability.ts`/`checkRate` ép đúng số câu batch, không phải quy ước); AGENTS.md/Codex chỉ có text liệt kê + chỉ dẫn prose, không có cơ chế ép nào tương đương — batch/multi_select/undo trên harness mềm là kỷ luật tự giác của agent, không phải gate (D53/D37 — dữ liệu ở Lõi, hai adapter dùng chung hàm derive nên không thể lệch nội dung văn xuôi, chỉ lệch mức enforcement). Không hứa Cursor/Antigravity/Windsurf đồng đều.

Chú thích: ✅ xong & test · 📐 đặc tả đã khoá, chưa code · ⏳ để sau.

## Adapter theo HARNESS, không theo MODEL
DeepSeek/GLM là model chạy trong harness → **không có dòng riêng**. Dùng GLM qua Cursor thì adapter Cursor đã phủ.

## Thứ tự ra mắt
1. **Claude Code trước** — duy nhất chứng minh tầm nhìn đầy đủ bằng hook thật. Batch 8 đã khoá spec để dev code theo.
2. **`AGENTS.md`** — phủ mềm Codex + Cursor + nhiều harness từ cùng một lõi rule text.
3. Sau đó mới tính adapter native riêng.

## Test mỗi adapter (xem [../Conventions/TestStrategy.md](../Conventions/TestStrategy.md))
- INJECT: kịch bản có vào đúng kênh chỉ thị không?
- GATE: thử sinh code khi doc chưa xong → có bị chặn (A) / cảnh báo (B) không?
- EMIT: output có rơi đúng cây taxonomy không?

## Trạng thái v2 (Đồng bộ mốc v2.0.0 — [V2-ExpansionPlan](../RoadMap/V2-ExpansionPlan.md))
v2.0.0 mở **đa hình-hài dự án** (registry ở [taxonomy.md](../Content/taxonomy.md): `web`/`mobile`/`hybrid`/`cli` ✅ code) và thêm **critic role** (pass phản biện) + **meta-calibrate**. Cả hai adapter đã đồng bộ đầy đủ:
- **Claude Code (A):** inject câu chọn hình-hài `S7` + câu `meta` CAL0 (chốt `calibrate_mode`); chạy và bắt xác nhận critic-pass ở skill (cho `S3`, `W5`, `M5`, `C5`). ✅ Đã code + test.
- **AGENTS.md (B):** tích hợp luật mềm cho các hình-hài mới, critic, và calibrate. ✅ Đã code + test.

## Trạng thái v3 (mốc v3.0.0 — file dẫn xuất `08-build-plan.md`, [DecisionLog D28](../DecisionLog.md))
Smoke run W14A đầu tiên (2026-07-10, phiên Claude Code thật, dự án yt-cli) cho thấy docs 00–07 chưa đủ để người mới bắt tay code. v3.0.0 thêm `08-build-plan.md` (milestone có thứ tự + done-when, dẫn xuất từ S3+S5, KHÔNG thêm câu hỏi) cho MỌI hình-hài:
- **Claude Code (A):** skill soạn slot build-plan sau khi phỏng vấn xong, emit qua CLI `emit --slots-file`; engine có fallback deterministic. Siết thêm luật skill: `docs/` chỉ sinh từ `emit`, cấm viết tay giữa phỏng vấn. ✅ Đã code + test (golden 3 shape cập nhật, 74 test xanh).
- **AGENTS.md (B):** ⏳ generator chưa nhúng chỉ dẫn build-plan — cần đồng bộ ở batch kế (rules mềm: yêu cầu agent tự soạn 08 theo cùng cấu trúc).

## Đóng gói cài thật — Claude Code (2026-07-10)
Bộ đóng gói nằm ở [adapter/claude-code/](../../adapter/claude-code/): 3 entry hook theo giao thức stdin/stdout thật của Claude Code (`hooks/`), CLI `status|commit|emit` cho skill (`cli.mjs`), skill `/design-everything` (`skill/SKILL.md`) và installer (`install.mjs`). Cài vào dự án đích: `node adapter/claude-code/install.mjs <target>` — installer ghi `.claude/settings.json` + skill và copy lõi nội dung (`script.yaml`, `gate-policy.yaml`, `shapes.yaml`, doc-templates) vào workspace đích; engine (dist + node_modules) vẫn ở repo này.
Đã nghiệm thu vòng đời đầy đủ bằng mô phỏng giao thức hook: SessionStart khởi tạo `progress.json` → UserPromptSubmit inject câu hỏi + TURN_ID và chặn vi phạm một-bước-mỗi-lượt → PreToolUse deny `Write`/`Bash` khi gate `scope-locked` đóng, allow vùng `Design/`+`docs/` → commit CAL0→S7(`--branch`)→W5 qua CLI (kèm `--slots-file`) → `emit` sinh 10 docs có anchor (gồm 08-build-plan) → phase `ready-to-build`, gate mở cho Write code. Còn thiếu: smoke run trong phiên Claude Code thật với người dùng (bước W14A).

**Phạm vi thật của `PreToolUse` (H3, 2026-08-16):** matcher hook đăng ký đúng
`Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell` ([settingsMerge.mjs](../../adapter/claude-code/installer/settingsMerge.mjs)).
Đây là toàn bộ tool ghi/thực thi tích hợp sẵn của Claude Code trên cả hai hệ điều hành (Bash trên
Linux/macOS, PowerShell mặc định trên Windows) — không phải mọi đường ghi file có thể có trong một
phiên. Một MCP server ghi file trực tiếp (ví dụ filesystem MCP) đứng ngoài matcher này và **không** đi
qua gate — đây là giới hạn đã biết của mô hình "adapter-wrapper" (D37: hook chỉ intercept một tập tool
hữu hạn do harness khai báo, không phải sandbox toàn diện), không phải lỗi. Trước 2026-08-16, matcher
thiếu `PowerShell` — một agent bị Bash chặn có thể chuyển hẳn sang PowerShell để ghi/xoá file mà không
qua gate nào; đã vá cùng đợt với năm lỗi chặn thật khác của phiên test đầu tiên
([v8-hotfix H1–H6](../ContractForAI/Core/v8-hotfix/)).

## DX Hardening — 2026-07-16 (nhánh v5/dx-hardening)

Các fix rút ra từ smoke run ytm thật tại E:/DE-TestDrive (dự án Python CLI, greenfield):

- **Skill đổi tên `/design` → `/design-everything`**: tên cũ đụng lệnh built-in `/design` của Claude Code desktop (built-in ưu tiên, skill không bao giờ được gọi). Installer tự dọn thư mục skill tên cũ ở dự án đích.
- **Greenfield stack inference**: `emit` suy target từ câu trả lời phỏng vấn (`inferProfileAnswersFromInterview`, C/W-series) khi workspace trống — execution plan không còn rơi vào blocked stub mâu thuẫn với 08-build-plan. Build notes README + anchor `src=` theo ngôn ngữ đã chốt (Python → `.py` + snake_case).
- **Build skill dạy đúng interface**: `verify --task --command` (engine tự chạy lệnh kiểm chứng, chống done giả) thay cho `record-evidence` không tồn tại.
- **Conventions lock**: `emit` sinh `docs/conventions/` (tech-stack, allowed-paths, coding-standards, test-tiers, allowed-dependencies). Slot `allowed_dependencies` do skill điền từ 05-architecture; re-emit không truyền giữ danh sách curated.
- **Consistency pass**: `emit` trả `consistency_warnings` khi docs tự mâu thuẫn (`path-convention-conflict`: file còn XDG thuần sau khi chốt Windows/platformdirs; `stack-command-conflict`: lệnh sai ngôn ngữ dự án). Skill phải sửa slot rồi re-emit.
- **Profile drift**: `validate` so profile đã lưu với inspect tươi, lệch target → issue `profile-drift` + hướng dẫn re-emit; state machine cho phép re-validate từ `blocked`/`ready-to-execute` (luồng "sửa docs → validate lại" trước đây crash).
- **README onboarding**: template thêm "Mười Phút Đầu Tiên" (bảng theo phút + 4 câu tự kiểm) và "Thuật Ngữ Dự Án" (slot `docs_readme_glossary`, fallback thuật ngữ phương pháp).

## V3 Execution Expansion — target 4.0.0 (Hoàn thành — 2026-07-13)

Toàn bộ lõi trạng thái thực thi V3, kiểm duyệt ngữ nghĩa và luồng build điều khiển bởi Claude Code adapter đã được code và nghiệm thu hoàn chỉnh:

- **Claude Code (A):** Tích hợp đầy đủ luồng build: validate, next, start, record-evidence, và repair. Triển khai PreToolUse hook kiểm duyệt ghi/sửa mã nguồn dựa trên `allowed_paths` của active task từ `execution-plan.json`. Đã kiểm chứng qua E2E test `buildWorkflow.test.ts` và `execution-flow.test.ts`. ✅ Đã code + test.
- **AGENTS.md (B):** Tích hợp sinh quy trình rules cho trạng thái active task, evidence và repair dưới dạng soft enforcement. Đã cập nhật generator để sinh chỉ dẫn đúng mốc 4.0.0. ✅ Đã code + test.
- Hệ thống hỗ trợ hoàn hảo chế độ soft enforcement ở các harness quy tắc (AGENTS.md) và hard enforcement ở harness tích hợp sâu (Claude Code).

## Trạng thái sau Month 2 (v1.0.0)
- Claude Code: Đã hoàn thành code và đầy đủ test suite (unit test + E2E web/mobile) chạy qua Vitest. Cổng chặn cứng (gating), inject cảnh báo (M2/M5), rẽ nhánh và cấm đổi nhánh đều hoạt động chính xác.
- AGENTS.md: Đã code bộ sinh rules `generateAgentsMd` và viết unit test xác thực. Tuy nhiên, việc chạy kiểm thử thực tế (smoke run) trên các harness mềm (Codex/Cursor/Cline) tạm hoãn (⏳ defer) sang Month 3 (xem thêm [v1-release-note.md](../RoadMap/Month2/v1-release-note.md) limitation #1 & #2 và [m2_polish_agents_md_artifact_drift_guard_contract.md](../ContractForAI/Core/break_task/Month2/m2_polish_agents_md_artifact_drift_guard_contract.md)).

## Trạng thái v6.0.0 (package hiện tại — 2 đợt B16a + B4e)
Lõi định nghĩa và kiểm duyệt hợp đồng (Contract + Conventions) đã được cài đặt và nghiệm thu hoàn chỉnh:

**B16a Contract schema & Conventions bind — 2026-07-14:**
- **Contract Schema:** `contractSchema` (Zod) tại `src/core/schemas/contract.ts` đóng gói 7 mục của `CONTRACT_STRUCTURE_RULE`.
- **Conventions Emitter:** Sinh tài liệu tech-stack, allowed paths, coding standards, test tiers dựa trên ProjectProfile vào `docs/conventions/`.
- **Validation Engine:** `validateContract` xác thực chặt chẽ hình-hài, cấu trúc lệnh, chống done giả (chặn file-exists-only), và cấm trộn stack công nghệ.
- **Task card compiler:** `compileContractToTaskCard` ánh xạ trực tiếp Contract thành cấu trúc TaskCard của V3.
- Toàn bộ unit test cho B16a đã được bổ sung và chạy thành công. ✅ Đã code + test.

**B4e Claude/Codex Shared Runtime Parity — 2026-07-25:**
Đã hợp nhất và loại bỏ duplicate logic CLI giữa Claude Code adapter và Codex plugin:
- **Shared Runtime Runner:** 100% logic CLI operations (`status`, `init`, `commit`, `validate`, `emit`, `repair`, `next`, `start`, `verify`, `review`) được xử lý bởi `src/adapters/shared/cliOperations.ts`.
- **Thin Launchers:** Cả `adapter/claude-code/cli.mjs` và `adapter/codex-plugin/cli.mjs` đều trở thành launcher mỏng (< 100 dòng), ủy quyền toàn bộ việc thực thi cho shared runner.
- **Parity Verification:** Đã viết integration test `test/integration/adapter-parity.test.ts` và E2E benchmark `test/replay/crossRuntimeReplay.test.ts` đảm bảo 100% tương thích về JSON envelope, reason code, version evidence và state transitions. ✅ Đã code + test.
- **Cập nhật 2026-08-06 (A1-P9, đóng R17):** post-tool hook của Codex trước đây tự suy allowed-path bằng `matchGlob` tự chế, khác semantics với Core — đã thay bằng `filterUnexpectedFiles` (`src/adapters/codex/filterUnexpectedFiles.ts`) dùng chung `matchesPathPattern` của Core, cùng policy semantics với Claude's PreToolUse thay vì fork riêng. Bằng chứng: `test/integration/installed-runtime/codex-post-tool-use.test.ts`.

## Trạng thái v7.0.0 (v1-fix-bugs Release Truth Sync) — PLANNED, chưa cắt

**Sửa 2026-07-30:** mục này trước đó ghi các mốc dưới đây như đã hoàn thành và phát hành ngày
2026-07-25 kèm dấu ✅ — sai sự thật, đúng finding R15 mà chính B5d phải bắt lại. Package hiện tại
vẫn `6.0.0`; xem [v7-release-note.md](../RoadMap/v7-release-note.md) (UNRELEASED — BLOCKED) cho
trạng thái thật từng mục. Trạng thái tiến độ thật (2026-07-30, đối chiếu với
`Design/ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md`):
**Cập nhật 2026-08-10** (đối chiếu lại, không tin nguyên văn cũ — xem §7 từng contract B5 để có bằng
chứng chi tiết):
- **Adversarial Installed Runtime (B5a):** IMPLEMENTED/SEAM_PARTIAL. 15 file, 76 test pass trên target
  cài thật (`test/integration/installed-runtime/`), gồm 1 file mới `phase-authorization-matrix.test.ts`
  đóng U04/R04. 2 gap thật còn lại trước VERIFIED: X09 exit-class chưa đủ 5 lớp, X23 ack-capability
  chưa có coverage installed.
- **Transaction Fault Injection (B5b):** IMPLEMENTED/SEAM_PARTIAL (nâng từ off-axis
  INVALID_FOR_PRODUCTION_SEAM). Xác nhận `prepareEmit`/`activateEmit`/`transactInterviewStore` chính
  là hàm production `cliOps/emit.ts` gọi — tiền đề cũ "production không gọi các hàm này" sai.
  `crash-worker.mjs` spawn tiến trình con thật, hard-kill đúng bước, recovery hai lần idempotent. Gap
  còn lại: crash-worker import thẳng `dist/`, chưa đi qua toàn bộ tầng CLI trước khi gọi.
- **Newbie Journey & Weak Executor Evaluation (B5c):** IMPLEMENTED/UNIT_ONLY. R14 (hai reviewer độc
  lập) đã hạ theo quyết định khoá 2026-08-03 — contract B5c §3 sửa bỏ claim, không chờ người ngoài mới
  cắt 7.0.0. Journey suite (`test/journey/`) vẫn qua Core loop thuần, chưa qua CLI thật — đây là gap
  còn lại, khác bản chất với R14 (gap kỹ thuật, không phải claim không kiểm được).
- **Release Truth Sync (B5d):** đã dọn 100% link `file:///e:/...`; `check-matrix.mjs` nay chặn
  vocabulary/dependency-range sai và cross-check contract-file ↔ README, nhưng docs vẫn cần một lượt
  đối chiếu cuối trước khi coi B5d là VERIFIED.

Không phần nào ở trên là "đã phát hành" — chỉ là tiến độ thật của một milestone vẫn PLANNED.

## Trạng thái v8.1.0 / v8.1.1 / v8.2.0 (Interactive Cards → hotfix → Interview Cadence)

- **v8.1.0 (Interactive Question Cards):** RC — 5/6 contract DONE, R-spike (xác nhận `AskUserQuestion`
  có bắn `UserPromptSubmit` không) còn mở. Xem [v8.1-release-note.md](../RoadMap/v8.1-release-note.md),
  [InteractiveQuestionCardsPlan.md](../RoadMap/InteractiveQuestionCardsPlan.md).
- **v8.1.1 (hotfix H1–H6):** DONE 2026-08-16 — mở bế tắc bootstrap (`init` bị chặn bởi đúng lỗi nó
  phải sửa), thông `--slots-file`, vá gate PowerShell (matcher `PreToolUse` thiếu tool này), trả
  question card về `status --json`, sửa `gates_passed`/`ready-for-validation` (trước bản vá này không
  đường thật nào từng tới được `emit`). 6/6 contract DONE tại [v8-hotfix/](../ContractForAI/Core/v8-hotfix/).
- **v8.2.0 (Interview Cadence — đang chạy):** D59 (bỏ thẻ xác nhận dịch ngược, bù bằng `undo`), D60
  (gộp nhiều câu vào một lượt — Core quyết batch qua `computeBatch`, không phải agent), D61
  (`multi_select` cho S1/S2/S4/S5). Xem [InterviewCadencePlan.md](../RoadMap/InterviewCadencePlan.md),
  contract B24a–B24f tại `Core/v8-expansion/B24/`.


