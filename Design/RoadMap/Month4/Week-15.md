# Tuần 15/16 — Maintain v0: Drift Flagging dựa trên anchor

> Tháng 4 · Mốc: nền tầm xa · Phụ thuộc: anchor đã gieo từ scaffolding

## Tại sao cần file này
Nếu DesignEverything chỉ giúp khởi động rồi biến mất, nó vẫn mới làm được nửa câu chuyện. Tuần này tồn tại để đặt viên gạch đầu cho vế "đồng hành về sau", nhưng theo cách rẻ và an toàn nhất: gắn cờ drift thay vì cố tự sửa doc bằng LLM quá sớm.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có một Drift Flagging v0 đọc anchor, đối chiếu với trạng thái code/git, và gắn cờ "doc có thể cũ" khi symbol hoặc file neo đã đổi sau lần doc được viết. Mục tiêu là chứng minh trục maintain này tractable, không phải giải quyết trọn bài toán đồng bộ hai chiều.

## Việc chi tiết
- [ ] Parser resolve `src=file::symbol` → vị trí thật + git blame SHA.
- [ ] So `rev` đã ghi với SHA hiện tại → gắn cờ drift.
- [ ] Nguyên tắc: thà gắn cờ nghi ngờ, không âm thầm bảo chứng.
- [ ] CHƯA làm Drift Fixing (LLM tự sửa) — chỉ flag.
- [ ] Ghi rõ giới hạn của v0: false positive nào chấp nhận được, false negative nào chưa xử lý.
- [ ] Chuẩn bị một ví dụ mini để dùng trong README/pitch khi nói về hướng maintain.

## Đầu vào / Phụ thuộc
`AnchorFormat`, output thật đã có anchor trong repo, hiểu biết từ Month 3 về nơi nào doc hay bị chỉnh tay, và khả năng đọc git blame/metadata theo TechStack đã chốt. Tuần này chưa đụng đến LLM tự sửa tài liệu.

## Đầu ra / Artifact
- Một công cụ hoặc flow Drift Flagging v0.
- Một báo cáo mẫu liệt kê doc có thể cũ.
- Ghi chú phạm vi: v0 làm gì, cố ý chưa làm gì.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là nhảy quá sớm sang Drift Fixing hoặc tự tin quá mức vào kết quả flagging. Tuần này phải giữ ranh giới: flag đúng mức "có thể cũ", chứ không phán doc sai tuyệt đối hay tự sửa mà chưa có review.

## Nghiệm thu
- [ ] Công cụ phát hiện được ít nhất vài ca drift giả lập hoặc có thật.
- [ ] Báo cáo drift đủ rõ để một người đọc biết cần xem lại file nào trước.
- [ ] Giới hạn và trade-off của v0 được viết ra trung thực.
- [ ] Không lấn sang Drift Fixing.
