# Conformance Matrix — Adapter theo harness

> Một adapter phải làm đúng 3 việc INJECT/GATE/EMIT ([../Core/Contract.md](../Core/Contract.md)). Bảng này theo dõi từng harness làm được tới đâu và đã test chưa.

## Tại sao cần file này
"Chết vì bảo trì N nền tảng" là rủi ro lớn nhất. Bảng này giữ kỷ luật: chỉ phủ harness đã test thật, biết rõ cái nào ép cứng / mềm.

## Ma trận

| Harness | Bậc | INJECT | GATE | EMIT | Trạng thái | File |
|---|---|---|---|---|---|---|
| **Claude Code** | A (cứng) | skill / slash command | hook `PreToolUse` | cây taxonomy | 🔜 reference impl | [claude-code.md](claude-code.md) |
| **AGENTS.md** (Codex, Cursor, Cline...) | B (mềm) | viết vào `AGENTS.md` | rules text | cây taxonomy | 🔜 sau Claude Code | [agents-md.md](agents-md.md) |
| Cursor (native `.mdc`) | B | `.cursorrules`/`.mdc` | rules text | cây taxonomy | ⏳ để sau | — |
| Antigravity | B | rules | rules text | cây taxonomy | ⏳ để sau | — |
| Windsurf / Continue | B | rules | rules text | cây taxonomy | ⏳ để sau | — |

Chú thích: ✅ xong & test · 🔜 đang/sắp làm · ⏳ để sau.

## Adapter theo HARNESS, không theo MODEL
DeepSeek/GLM là model chạy trong harness → **không có dòng riêng**. Dùng GLM qua Cursor thì adapter Cursor đã phủ.

## Thứ tự ra mắt
1. **Claude Code trước** — duy nhất chứng minh tầm nhìn đầy đủ (ép cứng). Reference để chốt hợp đồng Lõi↔Adapter.
2. **`AGENTS.md`** — một phát phủ mềm Codex + Cursor + nhiều harness.
3. Sau đó mới tính adapter native riêng.

## Test mỗi adapter (xem [../Conventions/TestStrategy.md](../Conventions/TestStrategy.md))
- INJECT: kịch bản có vào đúng kênh chỉ thị không?
- GATE: thử sinh code khi doc chưa xong → có bị chặn (A) / cảnh báo (B) không?
- EMIT: output có rơi đúng cây taxonomy không?
