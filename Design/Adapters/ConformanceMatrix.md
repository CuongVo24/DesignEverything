# Conformance Matrix — Adapter theo harness

> Một adapter phải làm đúng 3 việc INJECT/GATE/EMIT ([../Core/Contract.md](../Core/Contract.md)). Bảng này theo dõi từng harness làm được tới đâu và đã test chưa.

## Tại sao cần file này
"Chết vì bảo trì N nền tảng" là rủi ro lớn nhất. Bảng này giữ kỷ luật: chỉ phủ harness đã test thật, biết rõ cái nào ép cứng / mềm.

## Ma trận

| Harness | Bậc | INJECT | GATE | EMIT | Trạng thái | File |
|---|---|---|---|---|---|---|
| **Claude Code** | A (cứng) | skill / slash command đọc `script.yaml` | `SessionStart` + `UserPromptSubmit` + `PreToolUse` | cây taxonomy + anchor | ✅ Đã code + test | [sessionStart.ts](../../src/adapters/claude/sessionStart.ts), [userPromptSubmit.ts](../../src/adapters/claude/userPromptSubmit.ts), [preToolUse.ts](../../src/adapters/claude/preToolUse.ts), [render-inject.ts](../../src/adapters/claude/skill/render-inject.ts), [emit.ts](../../src/core/emit.ts) |
| **AGENTS.md** (Codex, Cursor, Cline...) | B (mềm) | sinh rules từ lõi vào `AGENTS.md` | rules text map từ gate-policy | cây taxonomy + anchor | Generator: ✅ (unit test) <br> Harness smoke run: ⏳ (defer Month 3) | [generateAgentsMd.ts](../../src/adapters/agents/generateAgentsMd.ts) |
| Cursor (native `.mdc`) | B | `.cursorrules`/`.mdc` | rules text | cây taxonomy | ⏳ để sau | — |
| Antigravity | B | rules | rules text | cây taxonomy | ⏳ để sau | — |
| Windsurf / Continue | B | rules | rules text | cây taxonomy | ⏳ để sau | — |

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
Bộ đóng gói nằm ở [adapter/claude-code/](../../adapter/claude-code/): 3 entry hook theo giao thức stdin/stdout thật của Claude Code (`hooks/`), CLI `status|commit|emit` cho skill (`cli.mjs`), skill `/design` (`skill/SKILL.md`) và installer (`install.mjs`). Cài vào dự án đích: `node adapter/claude-code/install.mjs <target>` — installer ghi `.claude/settings.json` + skill và copy lõi nội dung (`script.yaml`, `gate-policy.yaml`, `shapes.yaml`, doc-templates) vào workspace đích; engine (dist + node_modules) vẫn ở repo này.
Đã nghiệm thu vòng đời đầy đủ bằng mô phỏng giao thức hook: SessionStart khởi tạo `progress.json` → UserPromptSubmit inject câu hỏi + TURN_ID và chặn vi phạm một-bước-mỗi-lượt → PreToolUse deny `Write`/`Bash` khi gate `scope-locked` đóng, allow vùng `Design/`+`docs/` → commit CAL0→S7(`--branch`)→W5 qua CLI (kèm `--slots-file`) → `emit` sinh 10 docs có anchor (gồm 08-build-plan) → phase `ready-to-build`, gate mở cho Write code. Còn thiếu: smoke run trong phiên Claude Code thật với người dùng (bước W14A).

## V3 Execution Expansion — target 4.0.0

ORCHESTRATE, semantic validation, task-level gate và evidence **chưa được code**. Vì vậy không adapter nào được claim “newbie từ zero tới shipped” ở thời điểm này.

- **Claude Code (A):** B9a sẽ thêm core-driven build workflow và deterministic active-task/path gate sau B8 state/plan. Trạng thái: contract, chưa code.
- **AGENTS.md (B):** B9b sẽ sinh protocol active task/evidence/repair và nhãn self-reported. Trạng thái: contract; vẫn là soft enforcement.
- Evidence bắt được trực tiếp từ tool output chỉ có thể hứa trên harness hỗ trợ; mọi nơi khác phải nói rõ giới hạn.

## Trạng thái sau Month 2 (v1.0.0)
- Claude Code: Đã hoàn thành code và đầy đủ test suite (unit test + E2E web/mobile) chạy qua Vitest. Cổng chặn cứng (gating), inject cảnh báo (M2/M5), rẽ nhánh và cấm đổi nhánh đều hoạt động chính xác.
- AGENTS.md: Đã code bộ sinh rules `generateAgentsMd` và viết unit test xác thực. Tuy nhiên, việc chạy kiểm thử thực tế (smoke run) trên các harness mềm (Codex/Cursor/Cline) tạm hoãn (⏳ defer) sang Month 3 (xem thêm [v1-release-note.md](../RoadMap/Month2/v1-release-note.md) limitation #1 & #2 và [m2_polish_agents_md_artifact_drift_guard_contract.md](../ContractForAI/Core/break_task/Month2/m2_polish_agents_md_artifact_drift_guard_contract.md)).
