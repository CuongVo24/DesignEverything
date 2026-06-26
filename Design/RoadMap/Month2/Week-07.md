# Tuần 7/16 — Chau chuốt template + phần "tại sao" + QualityRubric pass

> Tháng 2 · Mốc: v1 dùng được · Phụ thuộc: Tuần 5–6

## Tại sao cần file này
Đây là tuần biến bản v1 từ "đúng kỹ thuật" thành "đáng tin khi dùng". Giá trị DesignEverything không nằm ở việc tạo ra đủ file, mà ở chỗ người mới mở bộ docs ra là hiểu mình đang xây gì, vì sao file này tồn tại, và chỗ nào là quyết định phải giữ.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có bộ template và golden output web/mobile pass QualityRubric một cách có chủ ý, không phải pass vì may mắn. Phần "Tại sao cần file này" ở từng file phải đủ rõ cho người mới, headings phải gọn, branch note phải nhất quán, và template phải parity với golden chứ không drift.

## Việc chi tiết
- [ ] Rà từng doc-template: heading, placeholder, anchor, "tại sao".
- [ ] Chau chuốt giọng văn người-mới-đọc-hiểu, cắt thừa chữ.
- [ ] Chấm lại toàn bộ theo [../../Content/QualityRubric.md](../../Content/QualityRubric.md).
- [ ] Đồng bộ fixture `golden-example-web/` và `golden-example-mobile/` với template mới nhất.
- [ ] Kiểm tra nhịp câu và độ dài heading để người mới đọc nhanh mà không thiếu ngữ cảnh.
- [ ] Viết ghi chú "chất lượng đủ dùng của v1" để phân biệt bug nội dung với ý tưởng mở rộng tương lai.

## Đầu vào / Phụ thuộc
Toàn bộ `doc-templates`, hai golden examples web/mobile, `QualityRubric`, `taxonomy`, và các quyết định mới nhất trong `DecisionLog`. Đây là tuần nội dung, không phải tuần thêm tính năng adapter mới.

## Đầu ra / Artifact
- Bộ template đã chau chuốt và khớp golden.
- Bảng điểm rubric cập nhật cho golden web và golden mobile.
- Một danh sách ngắn những điểm chất lượng còn chưa chạm v1 nhưng được cố ý defer.

## Rủi ro & cạm bẫy
Rủi ro hay gặp là sửa cho "hay" quá mức khiến template dài, nặng, hoặc mỗi file có giọng điệu khác nhau. Tuần này ưu tiên dễ đọc, nhất quán, và trung thực với cách sản phẩm sẽ emit ra ngoài hơn là cố văn vẻ.

## Nghiệm thu
- [ ] Template và golden không còn lệch cấu trúc ở các section chính.
- [ ] Web/mobile golden được chấm lại và pass rubric với lý do rõ ràng.
- [ ] Người mới đọc thử một file bất kỳ vẫn hiểu vì sao file đó tồn tại.
- [ ] Không thêm file mới ngoài taxonomy chỉ để "trông có vẻ đầy đủ".
