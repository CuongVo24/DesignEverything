## Tại sao cần file này
File này là cầu nối giữa tài liệu nền móng và dòng code đầu tiên. Các file 00–07 trả lời "xây gì, cho ai, vì sao, theo hướng nào" — file này trả lời "bắt đầu từ đâu, làm theo thứ tự nào, mỗi bước xong thì kiểm thế nào". Không có nó, người mới (và cả AI agent) dễ code lan man không theo thứ tự phụ thuộc, hoặc làm tính năng khó trước rồi bỏ cuộc giữa chừng.

## Nguyên Tắc Đi Từng Bước
Đi từng milestone một, theo đúng thứ tự — không nhảy cóc. Milestone đầu tiên luôn là "khung xương biết đi" (walking skeleton): một lát cắt mỏng nhất của flow chính chạy được từ đầu tới cuối, dù xấu. Mỗi milestone sau chỉ thêm đúng một mục Must, và phải chạy lại được flow chính trước khi sang milestone kế. Chưa xong Must thì chưa đụng Should/Could.
<!-- anchor: id=08-build-plan/principles  src=apps/mobile/src/features/build/plan.ts::buildPlanPrinciples  rev=  status=planned -->

## Milestone Theo Thứ Tự (kèm Done-When)
M0 — Khung xương biết đi: dựng project chạy được với lát cắt mỏng nhất của flow chính (xem 04-flows.md). Done-when: chạy được một lượt flow từ đầu tới cuối với dữ liệu cứng.

Các milestone kế tiếp — mỗi mục Must trong 02-scope.md là một milestone, xếp theo thứ tự xuất hiện trong flow chính:
Must: Đăng nhập, Tạo thói quen, Tích chọn hoàn thành, Xem thống kê tuần. Should: Đồng bộ offline, Nhận thông báo nhắc nhở hàng ngày.

Done-when của mỗi milestone: bước tương ứng trong 04-flows.md chạy được thật (không mock), và các milestone trước vẫn chạy.
<!-- anchor: id=08-build-plan/milestones  src=apps/mobile/src/features/build/plan.ts::buildMilestones  rev=  status=planned -->

## Lịch Theo Tuần
Deadline bạn khai ở `06-constraints.md` quy ra khoảng **4 tuần**. Lịch dưới đây là ước lượng để giữ nhịp, không phải cam kết — thứ tự phụ thuộc mới là nguồn sự thật. Trượt một tuần thì dồn lịch, đừng bỏ Done-when.

> **Cảnh báo:** Deadline khoảng 4 tuần nhưng có 5 milestone bắt buộc — trung bình dưới một tuần cho mỗi milestone. Hoặc cắt bớt Must trong 02-scope.md xuống 3 mục, hoặc chấp nhận lùi hạn. Lịch dưới đây là phương án nhồi sát nhất có thể, KHÔNG phải cam kết an toàn.

| Tuần | Milestone |
|---|---|
| Tuần 1 | M0 — Khung xương biết đi (lát cắt mỏng nhất của flow chính) |
| Tuần 1 | Đăng nhập |
| Tuần 2 | Tạo thói quen |
| Tuần 2 | Tích chọn hoàn thành |
| Tuần 3 | Xem thống kê tuần |
| Tuần 4 | Đệm: sửa lỗi còn lại, chạy lại flow chính, chuẩn bị phát hành. |
<!-- anchor: id=08-build-plan/weekly-schedule  src=apps/mobile/src/features/build/plan.ts::buildWeeklySchedule  rev=  status=planned -->

## Kiểm Tra Sau Mỗi Milestone
Sau mỗi milestone: chạy lại toàn bộ flow chính trong 04-flows.md như một người dùng thật, và rà các điểm dễ vỡ đã ghi nhận: Mở ứng dụng -> Thêm thói quen (tên, tần suất) -> Mỗi ngày mở app tích chọn -> Xem màn hình thống kê tiến độ hình tròn.
<!-- anchor: id=08-build-plan/verification  src=apps/mobile/src/features/build/plan.ts::buildVerificationNotes  rev=  status=planned -->
