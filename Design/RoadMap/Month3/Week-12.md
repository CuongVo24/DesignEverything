# Tuần 12/16 — Mở rộng taxonomy → bản "giống công ty"

> Tháng 3 · Mốc: Đáng chia sẻ · Phụ thuộc: Tuần 11 · ⚠️ optional ngoài MVP

## Tại sao cần file này
Đây là tuần duy nhất trong Month 3 được phép mở rộng phạm vi tài liệu, nhưng chỉ khi dữ liệu thật chỉ ra bản tối giản không đủ. Nó tồn tại để tránh hai cực đoan: hoặc giữ tối giản đến mức thiếu chỗ chứa quyết định quan trọng, hoặc phình ra "giống công ty" chỉ vì thấy hợp mắt.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải đưa ra một quyết định có căn cứ: giữ nguyên taxonomy tối giản, mở rộng một phần, hoặc mở rộng đủ sang bản "giống công ty". Nếu mở rộng, phải thêm file mẫu, cập nhật taxonomy, golden liên quan, và ghi rõ ảnh hưởng versioning. Nếu không mở rộng, cũng phải có lý do đủ thuyết phục để về sau không tranh luận lại từ đầu.

## Việc chi tiết
- [ ] Đánh giá dự án thật có cần ADR / test plan / ContractForAI không.
- [ ] Nếu có: thiết kế template mới + map câu hỏi + anchor.
- [ ] Cập nhật [../../Content/taxonomy.md](../../Content/taxonomy.md) + đánh dấu đổi MAJOR.
- [ ] Nếu chưa cần: ghi rõ "hoãn" + lý do vào DecisionLog.
- [ ] Phân biệt rõ phần "phải mở vì dữ liệu thật" với phần "nghe hợp lý nhưng chưa cần".
- [ ] Soát tác động lên adapter, validator và golden nếu taxonomy đổi.

## Đầu vào / Phụ thuộc
Phản hồi tích lũy từ tuần 9–11, taxonomy hiện tại, `doc-templates`, rubric và Versioning policy. Đây là tuần cần óc kỷ luật nhiều hơn óc sáng tạo, vì mỗi file thêm vào là một hứa hẹn bảo trì lâu dài.

## Đầu ra / Artifact
- Một taxonomy đã mở rộng có kỷ luật, hoặc một quyết định hoãn được viết rõ điều kiện kích hoạt lại.
- Nếu mở rộng: template/golden/versioning liên quan được cập nhật đồng bộ.
- Nếu không mở rộng: một ghi chú lý do để Month 4 không lại lôi đúng câu hỏi này ra tranh cãi mơ hồ.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là tự thuyết phục rằng thêm file nào cũng tốt vì "giống công ty hơn". Tuần này phải nhớ sản phẩm đang bán cho người mới; bất kỳ mở rộng nào cũng phải thắng được chi phí nhận thức mà nó tạo ra.

## Nghiệm thu
- [ ] Có một quyết định taxonomy rõ ràng, không treo lơ lửng.
- [ ] Nếu mở rộng thì mọi nơi liên quan đã cập nhật đồng bộ; nếu không mở rộng thì lý do hoãn đủ cụ thể.
- [ ] Không thêm file chỉ vì thói quen enterprise nếu dữ liệu thật chưa cần.
- [ ] Month 3 kết thúc với hiểu biết rõ hơn về người dùng thật, không chỉ với nhiều file hơn.
