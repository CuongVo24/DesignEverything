# Brownfield Prep 03 — Rủi ro, câu hỏi mở, điều kiện mở lane

> Trạng thái: tài liệu chuẩn bị. Đây là "cửa" của lane brownfield: chừng nào các điều kiện dưới chưa tick, chưa ai được viết contract brownfield.

## Điều kiện mở lane brownfield (tất cả phải đạt)

- [ ] Phần (a) ship trọn: B19a→B21b DONE, eval B21b đạt ngưỡng trên DE.
- [ ] Pilot người thật B18a hoàn tất, feedback tổng hợp (đặc biệt: sức chịu số-câu-xác-nhận mỗi phiên).
- [ ] Kiểm kê ReportSupport + Univillage điền xong bảng ở [02-golden-corpus-protocol](02-golden-corpus-protocol.md).
- [ ] Quyết định hướng tiếp cận (đề xuất: hướng C của [01-approach-options](01-approach-options.md)) được ghi vào DecisionLog.
- [ ] ExpansionPlan brownfield viết xong theo đúng ngoại lệ expansion của CONTRACT_STRUCTURE_RULE §0.

## Rủi ro chính (xếp theo mức đau)

| # | Rủi ro | Mức | Hướng giảm thiểu đã thấy |
|---|---|---:|---|
| 1 | **Bịa "vì sao"**: agent suy lý do kiến trúc từ code rồi viết như sự thật — phá uy tín sản phẩm đúng chỗ nó tự hào nhất | Rất cao | Cite-validation pha 2 hướng C; hallucinated-rationale = 0 không thương lượng; câu "vì sao" luôn thuộc pha người |
| 2 | **Doc tay có sẵn bị coi là sự thật** trong khi chính nó đã drift so với code | Cao | Doc tay chỉ dùng làm reference ĐO, không làm input sinh; mọi khẳng định phải cite code hiện tại |
| 3 | **Phình parser theo stack** (mỗi framework một kiểu) → chết vì bảo trì | Cao | Inventory chỉ quét lớp vỏ chuẩn (manifest/entrypoint/script); stack đợt đầu khoá Node/TS + Python |
| 4 | **Người bỏ cuộc giữa pha confirm** vì quá nhiều câu | TB | Nhịp theo module (kế thừa D49); ưu tiên Must trước; số câu/phiên lấy từ pilot |
| 5 | **Anchor `status=live` sai rev** ngay từ đầu → drift flagging về sau vô nghĩa | TB | Anchor brownfield bắt buộc lấy rev từ git blame thật (D8), có test |
| 6 | **Repo ngoài không truy cập được / đổi cấu trúc** giữa chừng | Thấp | Freeze `ref-sha` theo protocol 02 |

## Câu hỏi mở (trả lời trong ExpansionPlan brownfield, không trả lời ở đây)

1. **Ranh giới inventory:** quét đến đâu thì dừng? (đề xuất khởi điểm: manifest + entrypoint + schema/model + surface lệnh/route; KHÔNG đọc business logic từng hàm)
2. **Monorepo/đa app** (nếu Univillage thuộc dạng này): một docset hay mỗi app một docset? Tiêu chí tách?
3. **Doc tay sẵn có xử lý thế nào trên dự án đích:** giữ song song, đối chiếu ra báo cáo lệch, hay đề xuất merge? (nghiêng về: báo cáo lệch — sản phẩm không nuốt tài liệu người khác)
4. **Quyền riêng tư:** code dự án đích có được gửi đi đâu ngoài máy không? (mặc định đề xuất: không — mọi phân tích local, đúng tính portable text-first)
5. **Nhịp cập nhật:** brownfield sinh xong rồi thì lần chạy sau là re-generate hay incremental theo anchor? (chạm thẳng sản phẩm maintain FirstIdea §12 — có thể là ranh giới V7/V8)
6. **Định vị sản phẩm:** brownfield mở cho người ngoài ngay, hay là chế độ nội bộ để tự phục vụ 3 dự án nhà trước? (nghiêng về: nội bộ trước, đúng bài "dogfood rồi mới mở" đã lặp lại nhiều lần)

## Điều KHÔNG được làm kể cả khi lane mở

- Không claim "hỗ trợ dự án legacy" ở README/tài liệu công khai trước khi cả ReportSupport lẫn Univillage đạt ngưỡng (kế thừa kỷ luật claim của D40/D47).
- Không nới `hallucinated-rationale = 0` để số đẹp.
- Không xây parser cho stack chưa có dự án thật trong corpus cần đến nó.
