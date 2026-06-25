# Tuần 6/16 — Adapter AGENTS.md (bậc B) + test Codex/Cursor

> Tháng 2 · Mốc: v1 dùng được · Phụ thuộc: Tuần 5

## Tại sao cần file này
{{AGENTS.md là đường ngắn nhất phủ mềm nhiều harness từ cùng một lõi (Codex, Cursor, Cline...).}}

## Mục tiêu tuần (Definition of Done)
{{Sinh được file AGENTS.md từ lõi + gate mềm + tuyên bố giới hạn enforcement; test trên ≥1 harness.}}

## Việc chi tiết
- [ ] Generator sinh `AGENTS.md` từ lõi theo [../../Adapters/agents-md.md](../../Adapters/agents-md.md).
- [ ] Map gate-policy → câu lệnh rules mềm.
- [ ] Ghi rõ giới hạn "không ép cứng".
- [ ] Test thật trên Codex và/hoặc Cursor.
- [ ] Cập nhật [../../Adapters/ConformanceMatrix.md](../../Adapters/ConformanceMatrix.md) trạng thái ✅.
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{agents-md.md spec, lõi nội dung.}}

## Đầu ra / Artifact
{{AGENTS.md generator + kết quả test harness.}}

## Rủi ro & cạm bẫy
{{Bán quá lời "chặn cứng" khi harness chỉ đọc rules.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được}}
