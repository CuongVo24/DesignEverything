# Tuần 11/16 — Lặp nội dung kịch bản theo phản hồi

> Tháng 3 · Mốc: Đáng chia sẻ · Phụ thuộc: Tuần 10 (backlog phản hồi)

## Tại sao cần file này
Tuần này là chỗ biến dữ liệu thật thành sản phẩm tốt hơn. Nếu phản hồi chỉ nằm trong một file notes mà không quay lại sửa `Content/`, DesignEverything sẽ mãi là công cụ "đã từng học được nhiều điều" chứ không phải công cụ tiến bộ sau mỗi vòng dùng thật.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải sửa xong các điểm vướng có tần suất và tác động cao nhất trong `Content/`, cập nhật golden tương ứng, và chỉ đụng schema/version nếu dữ liệu thật thật sự buộc phải đổi hợp đồng. Tuần này ưu tiên sửa những gì chặn người mới hiểu và trả lời đúng hơn là tối ưu tiểu tiết câu chữ.

## Việc chi tiết
- [ ] Mài lại logic S3 (Must/Should/Could) theo case thật.
- [ ] Sửa default thông minh sai và câu translate_back lệch.
- [ ] Cập nhật golden examples + chấm lại rubric.
- [ ] Ghi quyết định vào [../../DecisionLog.md](../../DecisionLog.md); bump [../../Core/Versioning.md](../../Core/Versioning.md) nếu cần.
- [ ] Kiểm riêng S3 để chắc logic Must/Should/Could vẫn là trung tâm giá trị, không bị mài mòn sau nhiều chỉnh sửa nhỏ.
- [ ] Chạy lại một smoke pass ngắn trên ít nhất một dự án đã đo để xem chỉnh sửa có làm giảm ma sát thật không.

## Đầu vào / Phụ thuộc
Backlog đã ưu tiên từ tuần 10, toàn bộ `Content/`, fixture `golden-example-web/` và `golden-example-mobile/`, rubric chất lượng, và DecisionLog/Versioning nếu cần ghi quyết định mới. Đây là tuần mài sản phẩm thật, không phải tuần nhảy sang viết tính năng maintain.

## Đầu ra / Artifact
- Bộ `Content/` đã được chỉnh theo phản hồi thật.
- Golden web/mobile cập nhật để phản ánh trạng thái mới.
- Changelog hoặc quyết định mới nếu phải chạm đến schema/taxonomy.

## Rủi ro & cạm bẫy
Hai cạm bẫy lớn là sửa tay output/golden mà quên sửa nguồn ở `Content/`, và đổi schema quá sớm chỉ để vá một lỗi nội dung. Tuần này phải ưu tiên sửa ở tầng thấp nhất có thể: content trước, taxonomy sau, schema là lựa chọn cuối cùng.

## Nghiệm thu
- [ ] Top điểm vướng có tần suất cao đã được xử lý ở đúng file nguồn.
- [ ] Golden web/mobile vẫn nhất quán sau chỉnh sửa.
- [ ] Nếu có đổi schema/taxonomy thì đã ghi log và nêu rõ lý do.
- [ ] Ít nhất một smoke run cho thấy ma sát thực tế giảm, không chỉ "trông có vẻ hay hơn".
