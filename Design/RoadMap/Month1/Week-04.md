# Tuần 4/16 — EMIT cây docs end-to-end + chạy thử luồng web

> Tháng 1 · Mốc: Bản chạy được (đóng mốc) · Phụ thuộc: Tuần 3 (3 hook chạy)

## Tại sao cần file này
Tuần này ráp mọi phần rời thành một câu trả lời duy nhất cho câu hỏi "nó có chạy được không?". Không có một demo end-to-end thật thì Month 1 mới chỉ là một đống module đúng đắn nhưng chưa chứng minh được trải nghiệm sản phẩm.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải chạy được một phiên Claude Code thật theo hướng web, từ S0 đến W5, sinh đúng cây `docs/` web, mở gate đúng lúc sau khi docs bắt buộc đã có, và cho thấy một thao tác code/build bị chặn trước gate rồi được cho qua sau gate. Đây là mốc "Bản chạy được" theo nghĩa có thể demo lại.

## Việc chi tiết
- [ ] EMIT output rơi đúng taxonomy + anchor `status=planned`.
- [ ] Chạy thử trọn luồng web trên 1 dự án giả, đối chiếu golden web.
- [ ] Sửa ca biên: người dùng trả lời lan man, đổi nhánh, trả lời nhiều câu/lượt.
- [ ] Chấm output theo [../../Content/QualityRubric.md](../../Content/QualityRubric.md).
- [ ] Viết hướng dẫn chạy thử ngắn (cho chính mình tái lập).
- [ ] Ghi lại màn chạy mẫu: input chính, gate bị chặn ở đâu, gate mở ở đâu, output docs cuối cùng ra sao.
- [ ] Lập backlog lỗi còn lại nhưng chỉ giữ những lỗi không chặn Month 2.

## Đầu vào / Phụ thuộc
Ba hook Claude Code đã chạy, bộ `doc-templates`, `taxonomy`, golden web của tuần 1, và bộ test/fixture từ tuần 2–3. Tuần này chưa cần đẹp cho người lạ dùng; nó chỉ cần demo lại được một luồng web đúng contract.

## Đầu ra / Artifact
- Một bản demo web end-to-end tái lập được.
- Bộ output `docs/` web so sánh được với golden web.
- Một runbook ngắn: chuẩn bị gì, chạy lệnh nào, mong đợi gate chặn ở đâu và mở ở đâu.
- Một backlog lỗi/thiếu sót đã được phân loại: cái gì phải sửa ở Month 2, cái gì là ý tưởng để sau.

## Rủi ro & cạm bẫy
Các lỗi dễ phá mốc nhất là emit lệch taxonomy, thiếu anchor, gate mở quá sớm, hoặc hook bị phụ thuộc vào đúng một transcript quá "ngoan". Tuần này phải thử ít nhất một ca người dùng trả lời không đẹp để chắc hệ thống không chỉ chạy trên đường bằng phẳng.

## Nghiệm thu
- [ ] Chạy được một phiên web trọn vẹn từ phỏng vấn đến emit docs.
- [ ] `PreToolUse` chặn được thao tác code khi thiếu docs và cho qua sau khi docs bắt buộc xuất hiện.
- [ ] Output web pass QualityRubric ở mức chấp nhận được cho bản reference.
- [ ] Có runbook đủ rõ để đầu Month 2 không phải "nhớ bằng đầu" cách demo lại.
