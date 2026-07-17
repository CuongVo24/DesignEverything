# Template — `docs/decisions.md`

## Tại sao cần file này
Sáu tháng nữa, khi bạn (hoặc người mới vào dự án) hỏi "vì sao hồi đó chọn cái này?", đây là chỗ trả lời. Mỗi quyết định kỹ thuật trong bảng đều nối ngược về một câu bạn đã trả lời lúc phỏng vấn — nên không có quyết định nào từ trên trời rơi xuống. Không có file này, các lựa chọn ban đầu dần biến thành luật bất thành văn mà không ai dám sửa, vì không ai còn biết nó dựa trên điều gì.

## Bảng Quyết Định
{{decision_table}}
<!-- anchor: id=decisions/table  src={{planned_src_decision_table}}::{{planned_symbol_decision_table}}  rev=  status=planned -->

## Vì Sao Chọn Như Vậy
{{architecture_decision_rationale}}
<!-- anchor: id=decisions/rationale  src={{planned_src_decision_rationale}}::{{planned_symbol_decision_rationale}}  rev=  status=planned -->

## Phương Án Đã Cân Nhắc Và Loại
{{architecture_alternatives_considered}}
<!-- anchor: id=decisions/alternatives  src={{planned_src_alternatives_considered}}::{{planned_symbol_alternatives_considered}}  rev=  status=planned -->

## Khi Muốn Đổi Một Quyết Định
Quyết định trong bảng trên không bất di bất dịch — nhưng đổi thì phải đổi tường minh, không đổi lén trong lúc code:

1. Ghi rõ **điều kiện nào đã thay đổi** so với lúc chốt: có nhu cầu mới, đo được nghẽn thật, hay rủi ro đã thành hiện thực?
2. Sửa file chi tiết tương ứng ở cột "Chi tiết tại", kèm lý do mới.
3. Nếu đổi stack hoặc thư viện: cập nhật `docs/conventions/` **trước**, vì đó là danh sách khóa.
4. Chạy lại `validate` — kế hoạch thực thi phải được kiểm tra lại theo quyết định mới.

Đổi quyết định vì đã học được điều mới là trưởng thành. Đổi vì thấy công nghệ khác trông hay hơn là scope creep.
<!-- anchor: id=decisions/change-policy  src={{planned_src_decision_change_policy}}::{{planned_symbol_decision_change_policy}}  rev=  status=planned -->
