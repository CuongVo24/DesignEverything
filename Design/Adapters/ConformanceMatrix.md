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

## Trạng thái v2 (đang khoá spec — [V2-ExpansionPlan](../RoadMap/V2-ExpansionPlan.md))
v2.0.0 mở **đa hình-hài dự án** (registry ở [taxonomy.md](../Content/taxonomy.md): `web`/`mobile`/`hybrid` ✅ code; `cli` 📐 spec khoá B2, chưa code) và thêm **critic role** (pass phản biện) + **meta-calibrate**. Cả hai adapter phải đồng bộ khi code B5–B6:
- **Claude Code (A):** inject thêm câu chọn hình-hài `S7` + câu `meta`; critic ép mạnh (chặn/cảnh báo scope creep qua kênh hook/skill).
- **AGENTS.md (B):** critic + calibrate ở dạng rule mềm (không đảm bảo cứng).
MAJOR → bảng ma trận trên phải cập nhật cùng commit khi B5–B6 land (DecisionLog D21–D26).

## Trạng thái sau Month 2 (v1.0.0)
- Claude Code: Đã hoàn thành code và đầy đủ test suite (unit test + E2E web/mobile) chạy qua Vitest. Cổng chặn cứng (gating), inject cảnh báo (M2/M5), rẽ nhánh và cấm đổi nhánh đều hoạt động chính xác.
- AGENTS.md: Đã code bộ sinh rules `generateAgentsMd` và viết unit test xác thực. Tuy nhiên, việc chạy kiểm thử thực tế (smoke run) trên các harness mềm (Codex/Cursor/Cline) tạm hoãn (⏳ defer) sang Month 3 (xem thêm [v1-release-note.md](../RoadMap/Month2/v1-release-note.md) limitation #1 & #2 và [m2_polish_agents_md_artifact_drift_guard_contract.md](../ContractForAI/Core/break_task/Month2/m2_polish_agents_md_artifact_drift_guard_contract.md)).
