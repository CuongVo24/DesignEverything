# Template — `docs/09-execution-plan.md`

## Tại sao cần file này
Đối với người mới bắt đầu lập trình hoặc tiếp cận một dự án mới, rủi ro lớn nhất là cố gắng viết hàng trăm dòng code mà không có kiểm chứng, hoặc giả định rằng mọi công nghệ/API hoạt động đúng như mong đợi. File này hoạt động như một "hộp cát thực thi" an toàn bằng cách:
1. **Môi trường chạy thử đầu tiên**: Xác định rõ nền tảng duy nhất, gần nhất để kiểm thử nhanh thay vì ôm đồm đa nền tảng sớm.
2. **Bảng theo dõi rủi ro (Risk Register)**: Liệt kê các điểm chưa rõ, phân loại thành giả định hoặc cần khảo sát để không biến giả định thành sự thật.
3. **Khảo sát khả thi (Feasibility Spikes)**: Buộc phải nghiên cứu và thử nghiệm riêng các phần khó hoặc phụ thuộc bên ngoài trước khi bắt tay viết code nghiệp vụ.
4. **Task nhỏ kèm Bằng chứng (Evidence)**: Chia nhỏ công việc thành các bước từ 2-4 tiếng, mỗi bước xong phải chạy lệnh xác thực cụ thể để chứng minh code thực sự chạy ổn định.

## 1. Môi trường chạy thử đầu tiên (First Supported Environment)
Thiết lập môi trường phát triển cục bộ và thiết bị thử nghiệm thực tế đầu tiên. Không tự động mở rộng sang đa nền tảng hoặc môi trường production khi chưa có yêu cầu kiểm chứng cụ thể.
{{first_supported_environment}}
<!-- anchor: id=09-execution-plan/environment  src={{planned_src_environment}}::{{planned_symbol_environment}}  rev=  status=planned -->

## 2. Bảng theo dõi rủi ro (Risk Register)
Mỗi rủi ro kỹ thuật, API bên ngoài, chi phí hoặc quyền hạn phải được định vị, phân loại trạng thái rõ ràng (confirmed / assumption / spike-required) kèm theo tiêu chuẩn thoát (exit criterion).
{{risk_register}}
<!-- anchor: id=09-execution-plan/risk-register  src={{planned_src_risk_register}}::{{planned_symbol_risk_register}}  rev=  status=planned -->

## 3. Khảo sát tính khả thi (Feasibility Spikes)
Tất cả các rủi ro ở trạng thái `spike-required` hoặc `assumption` liên quan đến thư viện/API bên ngoài phải được lập kế hoạch khảo sát độc lập (Spike Task) trước khi tiến hành viết mã nguồn chính thức.
{{feasibility_spikes}}
<!-- anchor: id=09-execution-plan/spikes  src={{planned_src_spikes}}::{{planned_symbol_spikes}}  rev=  status=planned -->

## 4. Danh sách nhiệm vụ chi tiết (Task Cards)
Mỗi Task Card đại diện cho một phần việc nhỏ nhất, ghi rõ các file được phép chỉnh sửa (allowed paths), điều kiện tiên quyết (preconditions), lệnh kiểm chứng (verification commands) và kết quả kỳ vọng đạt được.
{{task_cards}}
<!-- anchor: id=09-execution-plan/task-cards  src={{planned_src_task_cards}}::{{planned_symbol_task_cards}}  rev=  status=planned -->

## 5. Quy tắc tiếp tục và nghiệm thu bằng chứng (Acceptance/Evidence & Resume Rules)
Nguyên tắc xác thực bằng chứng (evidence-driven resume):
- Chỉ được chuyển sang task tiếp theo khi lệnh kiểm chứng của task hiện tại chạy thành công và tạo ra bằng chứng (logs/artifacts) hợp lệ.
- Khi gặp lỗi kiểm chứng, lập tức dừng lại, phân tích log lỗi, sửa mã nguồn cục bộ và chạy lại lệnh kiểm chứng, không được viết tiếp tính năng mới.
{{acceptance_evidence_rules}}
<!-- anchor: id=09-execution-plan/resume-rules  src={{planned_src_resume_rules}}::{{planned_symbol_resume_rules}}  rev=  status=planned -->
