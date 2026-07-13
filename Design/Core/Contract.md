# Contract — Hợp đồng Lõi ↔ Adapter

> Đây là **public API** của dự án. Adapter phụ thuộc vào nó → mọi thay đổi phải tuân [Versioning.md](Versioning.md).

## Tại sao cần file này
Trong kiến trúc core+adapter, thứ giết dự án là adapter phình ra và lõi đổi lung tung làm vỡ adapter. File này khoá ranh giới: lõi hứa gì, adapter chỉ được làm gì. Giữ "lõi béo, adapter gầy".

## 1. LÕI cung cấp (portable, viết một lần)
- `interview-script` — khung lõi S0–S6 + câu chọn hình-hài **S7** + bộ câu theo hình-hài (web/mobile/hybrid/cli…) + câu `meta` calibrate + **nội dung critic** (điểm phản biện + câu thách thức), định dạng trung tính. Xem [Schemas/interview-script.md](Schemas/interview-script.md).
- `doc-templates` + `taxonomy` — cây thư mục đầu ra + phần "tại sao cần file này". Xem [../Content/taxonomy.md](../Content/taxonomy.md).
- `state-schema` (`progress.json`) + `gate-policy`. Xem [Schemas/state-schema.md](Schemas/state-schema.md), [Schemas/gate-policy.md](Schemas/gate-policy.md).
- `anchor-format` — mỏ neo truy vết. Xem [AnchorFormat.md](AnchorFormat.md).

## 2. ADAPTER hiện hành làm 3 việc; V3 thêm điều phối mỏng

| Việc | Ý nghĩa | Claude Code (bậc A) | Harness chỉ-đọc-rules (bậc B) |
|---|---|---|---|
| **INJECT** | Đưa kịch bản (+ critic pass + calibrate) vào kênh chỉ thị của host | skill / slash command | viết vào `AGENTS.md` / `.cursorrules` |
| **GATE** | Chặn sinh code khi doc chưa xong | hook `PreToolUse` (cứng) | câu lệnh trong rules (mềm) |
| **EMIT** | Output rơi đúng cây doc chuẩn | giống nhau mọi nơi | giống nhau mọi nơi |

→ INJECT/GATE/EMIT gần như giống nhau khắp nơi. **Chỉ GATE khác** và xuống bậc theo năng lực harness. Mốc 4.0.0 thêm ORCHESTRATE: adapter chỉ nối host với core state/CLI để đọc task active, validate/start/record/repair; không tự chế task, business logic hay agent mới.

## 3. Bậc enforcement
- **Bậc A — ép cứng:** harness có hook (Claude Code). "Không xong doc, không cho code" là thật. Đảm bảo cứng gồm đúng hai thứ: (1) **gate dựa artifact** (`PreToolUse` chặn khi doc bắt buộc chưa có) và (2) **giới hạn nhịp** (mỗi lượt người thật chỉ tiến tối đa một bước). Hook **không** validate ngữ nghĩa câu trả lời hay tự chọn nhánh — đó là việc của lớp skill/LLM (mô hình hai lớp, xem [Schemas/state-schema.md](Schemas/state-schema.md) §3).
- **Bậc B — ép mềm:** harness chỉ đọc rules (Cursor, Codex, Antigravity...). Khuyến nghị mạnh, không bảo đảm — kể cả giới hạn nhịp cũng chỉ là chỉ dẫn best-effort.

Chi tiết từng harness: [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md).

### Critic & calibrate (lớp skill/ngữ nghĩa, từ v2)
- **Critic (agent phản biện)** chạy ở **lớp skill/LLM**, KHÔNG phải hook (giữ [DecisionLog D14] hook không đọc ý định + [D24] không dùng multi-agent generation — critic chỉ là một role/pass trong agent sẵn có). Fire ở **2 điểm đòn bẩy**: (1) sau khi chốt **S3** (thách thức scope creep / MVP phình), (2) sau bộ câu **kiến trúc của shape** (bới phức tạp ẩn — tổng quát hoá cảnh báo kiểu M2/M5). Cơ chế: **cảnh báo + bắt người dùng xác nhận** ('Tôi đồng ý' hoặc điều chỉnh) giống `translate_back` M2/M5 — devil's advocate, KHÔNG chặn cứng, người dùng vẫn là người quyết.
- **Calibrate** là câu `kind=meta` đầu phiên, set chế độ giải thích (kỹ vs nhanh) + độ gắt critic; không neo doc.
- Bậc A: critic + calibrate inject qua skill, cảnh báo mạnh. Bậc B: cùng nội dung nhưng mềm (chỉ chỉ dẫn, không đảm bảo).

### Plan validation & execution evidence (Hoàn thành mốc 4.0.0)
- Ba phase khác nhau: docs-emitted chỉ nói docs đã tồn tại; plan-validated cần validator pass, traceability và risk acknowledgement; executing chỉ cho đúng một task active chạy.
- Validator deterministic là điều kiện pass. Critic/LLM chỉ nêu warning có dẫn chứng, không được tự cấp pass.
- Mỗi task phải có precondition, allowed paths, verify, expected result và evidence append-only. Test fail giữ agent ở repair/blocked, không mở milestone sau.
- Rủi ro dependency, platform, cost, permission hoặc điều khoản chưa xác nhận phải thành feasibility spike; core không kết luận pháp lý.

## 4. Adapter theo HARNESS, không theo MODEL
DeepSeek/GLM là **model**, chạy trong harness. Hook/rules nằm ở harness → không viết "adapter DeepSeek". Trục cần phủ:
`Claude Code · Cursor · Codex CLI · Cline · Antigravity · Windsurf · Continue` (nhiều cái hội tụ về `AGENTS.md`).

## 5. Bất biến (adapter KHÔNG được phá)
- Khi V3 execution được bật: không tự mở task ngoài execution plan, không ghi evidence không có output/nhãn self-reported, không hứa hard enforcement trên rules-only.
- Không tự chế câu hỏi ngoài `interview-script`.
- Không đổi cây taxonomy đầu ra.
- Không bỏ qua `gate-policy`.
- Mọi output phải mang `anchor-format` đúng chuẩn.
