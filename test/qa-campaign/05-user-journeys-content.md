# QA-05 — Hành trình người dùng và chất lượng output

## Mục tiêu

Đóng vai người mới thật, kiểm tra sản phẩm có dẫn dắt đúng, không tự bịa và sinh tài liệu nhất quán cho web, mobile, CLI và hybrid.

## Check bắt buộc

```powershell
rtk npx vitest run test/e2e
rtk npx vitest run test/journey
rtk npx vitest run test/regression/golden-web.test.ts test/regression/golden-mobile.test.ts test/regression/golden-cli.test.ts
rtk npx vitest run test/replay/featureJourneyReplay.test.ts
rtk npx vitest run test/eval/tier2-golden-corpus.test.ts
```

## Persona replay bắt buộc

Chạy ít nhất bốn persona:

1. Người mới trả lời rất ngắn và mơ hồ.
2. Người trả lời dài, gộp nhiều ý và đổi ý giữa chừng.
3. Builder chọn web nhưng yêu cầu một đặc tính nghe giống mobile.
4. Builder chọn CLI/hybrid, có deadline và constraint mâu thuẫn.

Với mỗi persona, đánh giá:

- Câu hỏi tiếp theo có đúng ngữ cảnh và chỉ hỏi một việc không.
- Default có được trình bày như gợi ý, không bị âm thầm coi là quyết định.
- Branch/shape không bị đổi ngầm.
- Warning/ack/correction có giúp người mới hiểu phải làm gì.
- Docs output có đủ taxonomy đúng shape, không có placeholder/hallucination.
- Persona, scope, data model, flow, architecture, constraints và release path không mâu thuẫn.
- Anchor/traceability và “tại sao cần file này” có thật, hữu ích, không chỉ tồn tại hình thức.
- Sau emit, hướng dẫn validate/build trước code có trung thực với gate.

## Novel probes bắt buộc

- Câu trả lời rỗng, chỉ emoji, tiếng Việt không dấu, Markdown và JSON-like text.
- Cùng một ý được sửa ba lần.
- Must-have không thể hoàn thành trong deadline.
- Entity trong flow không tồn tại trong data model.
- Feature Should/Could rò vào execution plan như Must.
- Tên feature Unicode, dấu gạch, ký tự path và hai tên slug đụng nhau.

## Oracle

Không tự bịa quyết định, không mất correction/provenance, output đúng shape và nhất quán chéo, gate/message đúng trạng thái thật, người mới luôn có next step rõ.

## Báo cáo

Ghi vào `findings/QA-05-<ten-phien>.md` theo `report-template.md`.
