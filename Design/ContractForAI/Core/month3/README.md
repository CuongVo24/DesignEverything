# Contracts — Month 3 (tuần 9–12) · Dogfood + kiểm chứng trên dự án thật

> Nguồn: [Month3 RoadMap](../../../RoadMap/Month3/README.md) + [Week-09](../../../RoadMap/Month3/Week-09.md)…[Week-12](../../../RoadMap/Month3/Week-12.md). Tuân [CONTRACT_STRUCTURE_RULE](../CONTRACT_STRUCTURE_RULE.md).

## Vì sao Month 3 vẫn có contract (dù §1 ghi "thường không cần")
[CONTRACT_STRUCTURE_RULE §1](../CONTRACT_STRUCTURE_RULE.md) nói Month 3 là dogfood/nội dung nên **thường** dùng nghiệm thu Week sẵn có, ít cần contract code. Đúng — nhưng "thường không cần" không phải "cấm". Month 3 vẫn có hai loại việc dễ trôi nếu không atom hoá:
- **Đo lường phải trung thực** (W9–W10): dogfood dễ tự dễ dãi → contract khoá *artifact bắt buộc* (docs tree thật, số đo cơ học) thay vì "cảm giác ổn".
- **Sửa nội dung phải ở đúng tầng** (W11–W12): vá output/golden mà quên nguồn `Content/`, hoặc đổi schema quá sớm → contract khoá *tầng được phép chạm* và *thứ tự ưu tiên content → taxonomy → schema*.

Vì vậy bộ contract này **không phải contract code lõi** mà chủ yếu là tầng **Nội dung / Process / Adapter (doc)** — vẫn giữ đủ 7 mục, vẫn một đơn vị triển khai được, để vòng manager-review (§7) có chỗ bám khi review output thật.

## Bản đồ tuần → contract
| Tuần | Tầng | Contract | Đơn vị |
|---|---|---|---|
| [W9](W9/) | Process/Nội dung | [w9a_dogfood_run_friction_log](W9/w9a_dogfood_run_friction_log_contract.md) | Chạy phiên dogfood #1 thật → docs tree + nhật ký ma sát |
| [W9](W9/) | Process | [w9b_findings_backlog_classification](W9/w9b_findings_backlog_classification_contract.md) | Phân loại phát hiện 4 nhóm + diff docs sinh-ra vs sửa-tay |
| [W10](W10/) | Process | [w10a_multiproject_measurement_runs](W10/w10a_multiproject_measurement_runs_contract.md) | Chạy + đo 2–3 dự án #2–#3 (có profile) |
| [W10](W10/) | Process | [w10b_measurement_report_painrank](W10/w10b_measurement_report_painrank_contract.md) | Báo cáo đo lường + bảng xếp hạng điểm vướng |
| [W11](W11/) | Nội dung | [w11a_content_iteration_s3_defaults](W11/w11a_content_iteration_s3_defaults_contract.md) | Mài S3/default/translate_back theo phản hồi thật |
| [W11](W11/) | Nội dung | [w11b_golden_sync_decisionlog_smoke](W11/w11b_golden_sync_decisionlog_smoke_contract.md) | Đồng bộ golden + rubric + DecisionLog/Versioning + smoke pass |
| [W12](W12/) | Nội dung/Adapter | [w12a_taxonomy_decision_assessment](W12/w12a_taxonomy_decision_assessment_contract.md) | Đánh giá nhu cầu + ra quyết định taxonomy có căn cứ |
| [W12](W12/) | Nội dung/Adapter | [w12b_taxonomy_expansion_or_defer](W12/w12b_taxonomy_expansion_or_defer_contract.md) | Thực thi quyết định: mở rộng đồng bộ HOẶC ghi hoãn (⚠️ optional) |

## Trạng thái lô
Cả 8 contract đang `WAITING_FOR_APPROVAL` — đã viết, chờ manager duyệt (VibeCode Step 2). Executor **chưa được chạm**. Sau khi 4 tuần báo `DONE`, mở vòng [break_task/Month3](../break_task/) theo §7 nếu review lộ điểm chưa sạch.
