# Tuần 13/16 — README / onboarding / đóng gói phân phối

> Tháng 4 · Mốc: Đáng chia sẻ · Phụ thuộc: Month 3 (đã kiểm chứng thật)

## Tại sao cần file này
Một sản phẩm có giá trị mà chỉ tác giả biết cách chạy thì vẫn chưa bước ra khỏi phòng làm việc. Tuần này biến bản v1 thành thứ người lạ có thể cài, hiểu và thử trong vòng vài phút đầu tiên mà không phải lục toàn bộ `Design/` để đoán quy trình.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có README rõ ràng, hướng dẫn cài/hook đủ thực tế cho ít nhất một tuyến dùng chính, và một flow onboarding 5 phút cho người mới: đọc gì trước, cài gì, chạy demo nào, mong đợi kết quả nào. Đây là tuần giảm ma sát dùng lần đầu, không phải tuần thêm năng lực cốt lõi mới.

## Việc chi tiết
- [ ] Viết README dự án (cài đặt, chạy, ví dụ).
- [ ] Đóng gói skill Claude Code + generator AGENTS.md để cài dễ.
- [ ] Viết onboarding ngắn cho người hoàn toàn mới.
- [ ] Kiểm thử cài lại từ đầu trên máy sạch.
- [ ] Viết phần troubleshooting tối thiểu cho các lỗi setup dễ gặp nhất.
- [ ] Kiểm tra mọi link đọc thêm đều trỏ đúng file thật trong repo.

## Đầu vào / Phụ thuộc
v1 đã được kiểm chứng qua Month 3, các golden examples, `ConformanceMatrix`, README/roadmap hiện tại và các quyết định đã chốt trong Design. Đây là tuần đóng gói kiến thức đã có, không mở thêm nhánh kỹ thuật mới.

## Đầu ra / Artifact
- README sản phẩm hoàn chỉnh.
- Quickstart/onboarding flow đủ ngắn để người mới tự chạy lần đầu.
- Hướng dẫn cài reference path và rules-only path ở mức đủ dùng.
- Một checklist setup để tái dùng cho người test sau này.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là tác giả vô thức giả định người đọc biết quá nhiều thứ nền. Tuần này phải viết như đang đón một người thông minh nhưng chưa biết lịch sử repo, và phải cắt các bước rườm rà không tạo ra giá trị cho lần thử đầu tiên.

## Nghiệm thu
- [ ] Một người mới có thể đi từ README đến chạy được quickstart mà không cần hỏi tác giả quá nhiều.
- [ ] Reference path và path rules-only đều có hướng dẫn đủ rõ.
- [ ] README không mâu thuẫn với RoadMap, ConformanceMatrix hay tài liệu lõi.
- [ ] Những lỗi setup hay gặp nhất đã có chỗ chỉ đường.
