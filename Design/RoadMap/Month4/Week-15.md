# Tuần 15/16 — Maintain v0: Drift Flagging dựa trên anchor

> Tháng 4 · Mốc: nền tầm xa · Phụ thuộc: anchor đã gieo từ scaffolding

## Tại sao cần file này
{{Maintain biến sản phẩm từ "init một lần" → "đồng hành liên tục"; làm Flagging trước vì rẻ, an toàn, giá trị thật.}}

## Mục tiêu tuần (Definition of Done)
{{Công cụ v0 đọc anchor + git blame, gắn cờ "doc có thể cũ" khi symbol đổi sau lần sửa doc.}}

## Việc chi tiết
- [ ] Parser resolve `src=file::symbol` → vị trí thật + git blame SHA.
- [ ] So `rev` đã ghi với SHA hiện tại → gắn cờ drift.
- [ ] Nguyên tắc: thà gắn cờ nghi ngờ, không âm thầm bảo chứng.
- [ ] CHƯA làm Drift Fixing (LLM tự sửa) — chỉ flag.
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{[../../Core/AnchorFormat.md](../../Core/AnchorFormat.md), output thật có anchor.}}

## Đầu ra / Artifact
{{Drift Flagging v0 + ví dụ phát hiện drift.}}

## Rủi ro & cạm bẫy
{{Symbol đổi tên làm anchor vỡ; cần trigger ngoài phiên (commit/CI) — kéo lại CLI/bot.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được}}
