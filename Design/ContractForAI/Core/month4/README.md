# Contracts — Month 4 (tuần 13–16) · Phân phối + đặt nền maintain

> Nguồn: [Month4 RoadMap](../../../RoadMap/Month4/README.md) + [Week-13](../../../RoadMap/Month4/Week-13.md)…[Week-16](../../../RoadMap/Month4/Week-16.md) **+** nợ systemic còn lại từ dogfood Month 3 ([pain-rank](../../../RoadMap/Month3/dogfood/pain-rank.md), [backlog-month3](../../../RoadMap/Month3/backlog-month3.md)). Tuân [CONTRACT_STRUCTURE_RULE](../CONTRACT_STRUCTURE_RULE.md).

## Vì sao Month 4 có contract (gồm cả phần code lõi)
[CONTRACT_STRUCTURE_RULE §1](../CONTRACT_STRUCTURE_RULE.md) đã báo trước: **W15 (Drift Flagging) là code lõi → viết contract khi tới tuần**. Ngoài W15, Month 4 còn ba việc dễ trôi nếu không atom hoá:
- **Đóng gói/phân phối phải trung thực** (W13–W14): không được tuyên bố "Đáng chia sẻ" khi còn bug đã biết hoặc số đo còn thiên vị → contract khoá *artifact bắt buộc* (machine sạch chạy được, diff cơ học cho cả 3 dự án) thay vì "cảm giác đủ tốt".
- **Maintain v0 phải giữ ranh giới** (W15): chỉ flag, **không** fix → contract khoá *scope* để không lấn sang Drift Fixing quá sớm.
- **Tổng kết phải dựa số đo** (W16): chốt 16 tuần bằng dữ liệu, không theo hứng.

## Nợ Month 3 được dọn ở đầu Month 4 (carry-over)
Review Month 3 lộ ra hai friction **systemic đã biết nhưng bị trượt** vì nằm sai tầng so với tuần được phân (W11 = chỉ Content; W12 = hoãn toàn bộ taxonomy):
- **F-04** (điểm pain-rank **4**, 2/2 mobile): [emit.ts:161](../../../../src/core/emit.ts) ép cứng tiền tố anchor `apps/mobile/src/` → vỡ với dự án Expo standalone.
- **F-07** (điểm 2, 1/3 — proj-03): ép cứng một-trong-hai `07-release.md`/`07-deployment.md` → dự án Hybrid (web+mobile) không biểu diễn được; [taxonomy-decision §5](../../../RoadMap/Month3/taxonomy-decision.md) đã hứa vá ở W12B nhưng nhánh "hoãn" không thực thi gì → văn bản lệch thực thi.

Hai bug này **chặn cửa "Đáng chia sẻ"**: không thể onboard người lạ (W13) và mời người dùng thật (W14) trên một tool đã biết là vỡ với hai loại dự án phổ biến. Vì vậy chúng được dọn **trước** mọi việc phân phối, đặt ở nhóm carry-over W13a–c. Đây là tầng **Lõi** thật, không phải dogfood — nên có contract code đầy đủ + lệnh verify.

## Bản đồ tuần → contract
| Tuần | Tầng | Contract | Đơn vị |
|---|---|---|---|
| [W13](W13/) | **Lõi** (carry-over F-04) | [w13a_carryover_anchor_prefix_flex](W13/w13a_carryover_anchor_prefix_flex_contract.md) | `emit.ts` cho phép cấu hình tiền tố anchor, mặc định giữ nguyên |
| [W13](W13/) | **Lõi/Nội dung** (carry-over F-07) | [w13b_carryover_hybrid_release_deploy](W13/w13b_carryover_hybrid_release_deploy_contract.md) | Thêm nhánh `hybrid` emit cả hai file `07-*` + đồng bộ taxonomy/version |
| [W13](W13/) | Process (carry-over) | [w13c_carryover_traceability_closure](W13/w13c_carryover_traceability_closure_contract.md) | Đóng vòng truy vết: ghi nhận F-04/F-07 đã trượt M3 + vá DecisionLog/backlog |
| [W13](W13/) | Onboarding | [w13d_readme_onboarding_packaging](W13/w13d_readme_onboarding_packaging_contract.md) | README + quickstart + đóng gói, người lạ cài chạy trên máy sạch |
| [W14](W14/) | Process | [w14a_external_validation_real_diff](W14/w14a_external_validation_real_diff_contract.md) | ≥1 người dùng thật bên ngoài + diff cơ học đủ cho cả 3 dự án + nâng confidence |
| [W14](W14/) | Nội dung/Process | [w14b_competitor_positioning_landing](W14/w14b_competitor_positioning_landing_contract.md) | So sánh đối thủ + định vị + landing 1 trang, mọi claim bám repo |
| [W15](W15/) | **Lõi** | [w15a_drift_anchor_resolver](W15/w15a_drift_anchor_resolver_contract.md) | Parser đọc anchor + resolve `src=file::symbol` + git blame SHA |
| [W15](W15/) | **Lõi/Adapter** | [w15b_drift_compare_report_cli](W15/w15b_drift_compare_report_cli_contract.md) | So `rev` ↔ SHA hiện tại → báo cáo drift + CLI entry, chỉ flag |
| [W16](W16/) | Process | [w16a_sixteen_week_summary_decision](W16/w16a_sixteen_week_summary_decision_contract.md) | Báo cáo tổng kết 16 tuần + quyết định giai đoạn 2 dựa số đo |

## Thứ tự chạy (có phụ thuộc)
```
W13a (F-04) ─┐
W13b (F-07) ─┼─► W13c (truy vết) ─► W13d (đóng gói) ─► W14a (validation thật) ─► W14b (định vị)
             │
W15a (resolver) ─► W15b (report+CLI)        [W15 độc lập W13/W14, có thể chạy song song]
                                            W16a phụ thuộc TẤT CẢ (tổng kết cuối)
```
W13a và W13b cùng đụng `emit.ts` nhưng **khác mục**: W13a sở hữu biến `srcPrefix` + tham số options; W13b sở hữu danh sách file `07-*` + logic nhánh. Làm W13a trước (nhỏ, additive, không đổi taxonomy), W13b sau (đụng taxonomy + version). W13d/W14 không được mở trước khi W13a–c `DONE` — đóng gói phải đứng trên lõi đã sạch.

## Trạng thái lô
Cả 9 contract đang `WAITING_FOR_APPROVAL` — đã viết, chờ manager duyệt (VibeCode Step 2). Executor **chưa được chạm code**. Sau khi mỗi tuần báo `DONE`, mở vòng [break_task/Month4](../break_task/) theo §7 nếu manager-review output lộ điểm chưa sạch.
