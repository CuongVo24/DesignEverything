# Tuần 1/16 — Chốt phạm vi MVP + scaffold repo code + golden example web

> Tháng 1 · Mốc: Bản chạy được · Phụ thuộc: toàn bộ `Design/` đã khoá (Batch 1–9)

## Tại sao cần file này
Tuần này là cái phanh đầu tiên của cả roadmap. Nếu không khóa thật chặt phạm vi MVP và dựng sẵn fixture web để test, những tuần sau sẽ vừa code vừa tranh luận lại xem "bản chạy được" thực ra nghĩa là gì.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải chốt được phạm vi MVP Month 1 bằng văn bản, dựng xong repo code skeleton bám `TechStack.md`, và có một golden example web đủ nhỏ để dùng làm fixture cho test và demo end-to-end. Không cần có logic chạy thật trong tuần này, nhưng cấu trúc code và bộ dữ liệu mẫu phải rõ đến mức tuần 2 chỉ còn việc đổ logic vào.

## Việc chi tiết
- [ ] Chốt phạm vi MVP web: số câu giữ/cắt, 3 hook nào, doc nào bắt buộc mở gate `scope-locked`.
- [ ] Scaffold repo code theo [../../Conventions/TechStack.md](../../Conventions/TechStack.md): Node + TS `strict` + `yaml` + `zod`.
- [ ] Dựng cấu trúc module theo [../../Adapters/claude-code.md](../../Adapters/claude-code.md) (core/* + adapters/claude/*).
- [ ] Tạo golden example WEB (`_interview-transcript.md` + cây `docs/`) làm fixture, theo 4 quy tắc vàng.
- [ ] Chuẩn bị thư mục fixture/test data cho web: script subset, progress mẫu, docs expected và ca gate mở/chưa mở.
- [ ] Viết một file quyết phạm vi MVP tháng 1: cái gì làm ngay, cái gì cố ý chưa làm trong Month 1.

## Đầu vào / Phụ thuộc
`script.yaml`, bộ `doc-templates`, `taxonomy`, `claude-code.md`, `ConformanceMatrix.md` và golden mobile đã có sẵn tại `Design/Content/golden-example-mobile/` để tham chiếu phong cách điền nội dung. Tuần này cũng phụ thuộc vào việc `Design/` đã qua Batch 9 nên schema và taxonomy không còn ở trạng thái mơ hồ.

## Đầu ra / Artifact
- Một repo code skeleton với tối thiểu: `src/core/`, `src/adapters/claude/`, `test/fixtures/`, cấu hình TypeScript, lint và test.
- Một golden example web tại `Design/Content/golden-example-web/` gồm transcript + cây `docs/` tương tự fixture mobile tại `Design/Content/golden-example-mobile/`.
- Một ghi chú phạm vi MVP tháng 1, nêu rõ "web only", "1 gate", "Claude Code only", "chưa mobile", "chưa AGENTS.md".

## Rủi ro & cạm bẫy
Hai bẫy lớn nhất là phình phạm vi và chọn dự án web mẫu quá to. Dự án mẫu của tuần này phải đủ nhỏ để có thể phỏng vấn trọn vẹn trong một phiên ngắn, nhưng vẫn chạm vào các quyết định W1–W5 như SEO, responsive, deploy, auth và admin/realtime.

## Nghiệm thu
- [ ] Có một văn bản chốt phạm vi MVP tháng 1 mà tuần 2–4 chỉ cần bám theo, không phải tranh luận lại.
- [ ] Repo code khởi động test/lint được với cấu hình TypeScript `strict`.
- [ ] Golden example web có transcript, cây `docs/`, và pass QualityRubric ở mức tương đương golden mobile.
- [ ] Team một người nhìn vào artifact tuần 1 là biết tuần 2 phải code gì trước.
