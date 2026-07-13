## Tại sao cần file này
File này là cầu nối giữa tài liệu nền móng và dòng code đầu tiên. Các file 00–07 trả lời "xây gì, cho ai, vì sao, theo hướng nào" — file này trả lời "bắt đầu từ đâu, làm theo thứ tự nào, mỗi bước xong thì kiểm thế nào". Không có nó, người mới (và cả AI agent) dễ code lan man không theo thứ tự phụ thuộc, hoặc làm tính năng khó trước rồi bỏ cuộc giữa chừng.

## Nguyên Tắc Đi Từng Bước
Đi từng milestone một, theo đúng thứ tự — không nhảy cóc. Milestone đầu tiên luôn là "khung xương biết đi" (walking skeleton): một lát cắt mỏng nhất của flow chính chạy được từ đầu tới cuối, dù xấu. Mỗi milestone sau chỉ thêm đúng một mục Must, và phải chạy lại được flow chính trước khi sang milestone kế. Chưa xong Must thì chưa đụng Should/Could.
<!-- anchor: id=08-build-plan/principles  src=apps/mobile/src/features/build/plan.ts::buildPlanPrinciples  rev=  status=planned -->

## Milestone Theo Thứ Tự (kèm Done-When)
M0 — Khung xương biết đi: dựng project chạy được với lát cắt mỏng nhất của flow chính (xem 04-flows.md). Done-when: chạy được một lượt flow từ đầu tới cuối với dữ liệu cứng.

Các milestone kế tiếp — mỗi mục Must trong 02-scope.md là một milestone, xếp theo thứ tự xuất hiện trong flow chính:
Must: Đăng nhập, Tạo công việc, Giao việc, Thay đổi trạng thái công việc (To Do, In Progress, Done). Should: Gửi thông báo đẩy khi có task mới, Đính kèm tài liệu/hình ảnh.

Done-when của mỗi milestone: bước tương ứng trong 04-flows.md chạy được thật (không mock), và các milestone trước vẫn chạy.
<!-- anchor: id=08-build-plan/milestones  src=apps/mobile/src/features/build/plan.ts::buildMilestones  rev=  status=planned -->

## Kiểm Tra Sau Mỗi Milestone
Sau mỗi milestone: chạy lại toàn bộ flow chính trong 04-flows.md như một người dùng thật, và rà các điểm dễ vỡ đã ghi nhận: Minh tạo task -> Giao cho Sơn -> Sơn nhận thông báo trên điện thoại -> Sơn mở app làm và bấm hoàn thành task.
<!-- anchor: id=08-build-plan/verification  src=apps/mobile/src/features/build/plan.ts::buildVerificationNotes  rev=  status=planned -->
