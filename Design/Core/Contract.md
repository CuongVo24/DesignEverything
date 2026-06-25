# Contract — Hợp đồng Lõi ↔ Adapter

> Đây là **public API** của dự án. Adapter phụ thuộc vào nó → mọi thay đổi phải tuân [Versioning.md](Versioning.md).

## Tại sao cần file này
Trong kiến trúc core+adapter, thứ giết dự án là adapter phình ra và lõi đổi lung tung làm vỡ adapter. File này khoá ranh giới: lõi hứa gì, adapter chỉ được làm gì. Giữ "lõi béo, adapter gầy".

## 1. LÕI cung cấp (portable, viết một lần)
- `interview-script` — S0–S6 + nhánh W/M, định dạng trung tính. Xem [Schemas/interview-script.md](Schemas/interview-script.md).
- `doc-templates` + `taxonomy` — cây thư mục đầu ra + phần "tại sao cần file này". Xem [../Content/taxonomy.md](../Content/taxonomy.md).
- `state-schema` (`progress.json`) + `gate-policy`. Xem [Schemas/state-schema.md](Schemas/state-schema.md), [Schemas/gate-policy.md](Schemas/gate-policy.md).
- `anchor-format` — mỏ neo truy vết. Xem [AnchorFormat.md](AnchorFormat.md).

## 2. ADAPTER chỉ làm đúng 3 việc

| Việc | Ý nghĩa | Claude Code (bậc A) | Harness chỉ-đọc-rules (bậc B) |
|---|---|---|---|
| **INJECT** | Đưa kịch bản vào kênh chỉ thị của host | skill / slash command | viết vào `AGENTS.md` / `.cursorrules` |
| **GATE** | Chặn sinh code khi doc chưa xong | hook `PreToolUse` (cứng) | câu lệnh trong rules (mềm) |
| **EMIT** | Output rơi đúng cây doc chuẩn | giống nhau mọi nơi | giống nhau mọi nơi |

→ INJECT/EMIT gần như giống nhau khắp nơi. **Chỉ GATE khác** và xuống bậc theo năng lực harness. Đó là toàn bộ độ phức tạp phải nuôi.

## 3. Bậc enforcement
- **Bậc A — ép cứng:** harness có hook (Claude Code). "Không xong doc, không cho code" là thật.
- **Bậc B — ép mềm:** harness chỉ đọc rules (Cursor, Codex, Antigravity...). Khuyến nghị mạnh, không bảo đảm.

Chi tiết từng harness: [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md).

## 4. Adapter theo HARNESS, không theo MODEL
DeepSeek/GLM là **model**, chạy trong harness. Hook/rules nằm ở harness → không viết "adapter DeepSeek". Trục cần phủ:
`Claude Code · Cursor · Codex CLI · Cline · Antigravity · Windsurf · Continue` (nhiều cái hội tụ về `AGENTS.md`).

## 5. Bất biến (adapter KHÔNG được phá)
- Không tự chế câu hỏi ngoài `interview-script`.
- Không đổi cây taxonomy đầu ra.
- Không bỏ qua `gate-policy`.
- Mọi output phải mang `anchor-format` đúng chuẩn.
