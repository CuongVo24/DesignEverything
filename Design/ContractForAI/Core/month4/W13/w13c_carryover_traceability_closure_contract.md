# Contract — W13C (carry-over) Đóng vòng truy vết F-04/F-07 trượt khỏi Month 3

> **Tầng:** Process. Nguồn: review Month 3 + [pain-rank](../../../../RoadMap/Month3/dogfood/pain-rank.md) + [backlog-month3](../../../../RoadMap/Month3/backlog-month3.md) + [smoke-after-w11](../../../../RoadMap/Month3/dogfood/smoke-after-w11.md). Phụ thuộc: [W13A](w13a_carryover_anchor_prefix_flex_contract.md) + [W13B](w13b_carryover_hybrid_release_deploy_contract.md) `DONE` (ghi nhận sau khi đã vá).

## 1. Micro-task target
Cập nhật các artifact Month 3 để **không âm thầm bảo chứng** rằng mọi friction đã xử lý: ghi rõ F-04 (điểm 4, ưu tiên-1) và F-07 đã **trượt khỏi Month 3** vì nằm sai tầng so với tuần được phân, và nay đã/đang được vá ở W13A/W13B. Đóng lệch giữa [pain-rank action plan](../../../../RoadMap/Month3/dogfood/pain-rank.md) ("vá F-01,F-02,**F-04** ở W11") và [smoke report](../../../../RoadMap/Month3/dogfood/smoke-after-w11.md) (chỉ báo giải quyết #1/#2/#5).

## 2. Scope
**In scope** — chỉ tầng Process (sửa ghi chép, **không** đụng code):
- [backlog-month3.md](../../../../RoadMap/Month3/backlog-month3.md): cập nhật cột "Trạng thái" của F-04, F-07 → trỏ W13A/W13B Month 4 + ghi lý do trượt.
- [pain-rank.md](../../../../RoadMap/Month3/dogfood/pain-rank.md): thêm ghi chú dưới Action Plan rằng F-04 (≥4) bị trượt W11 do W11 chỉ tầng Content, đã đưa sang W13A.
- [DecisionLog.md](../../../../DecisionLog.md): **D20** — ghi nhận lỗ hổng quy trình (việc ưu tiên-1 rơi giữa khe khi tuần được phân sai tầng) + biện pháp: từ Month 4, pain-rank action plan phải ghi rõ *tầng* của mỗi fix để không giao nhầm tuần.

**Out of scope**
- KHÔNG sửa code (W13A/W13B đã làm).
- KHÔNG viết lại lịch sử (giữ nguyên smoke report cũ như chứng tích; chỉ **thêm** ghi chú đính chính, theo quy ước DecisionLog "không xoá").
- KHÔNG đụng số đo (đó là [W14A](../W14/w14a_external_validation_real_diff_contract.md)).

## 3. Checklist
- [ ] F-04, F-07 trong backlog có trạng thái mới trỏ đúng W13A/W13B + lý do trượt.
- [ ] pain-rank có ghi chú đính chính, không xoá Action Plan gốc.
- [ ] D20 ghi rõ lỗ hổng quy trình + biện pháp (gắn tầng vào action plan).
- [ ] Mọi link chéo (backlog ↔ pain-rank ↔ contract W13A/B) còn sống.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/RoadMap/Month3/backlog-month3.md` (cột trạng thái F-04, F-07)
- `[MODIFY]` `Design/RoadMap/Month3/dogfood/pain-rank.md` (ghi chú dưới mục 3)
- `[MODIFY]` `Design/DecisionLog.md` (D20)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Sửa thành "viết lại lịch sử" che lỗi | TB | Chỉ thêm ghi chú đính chính; giữ nguyên văn bản gốc làm chứng tích. |
| D20 thành lời than chung chung | Thấp | Bắt buộc nêu biện pháp đo được: action plan tương lai phải cột "tầng". |

## 6. Verification plan
- Review thủ công: đọc backlog + pain-rank, một người mới hiểu ngay F-04/F-07 đã trượt vì sao và đã đi đâu.
- `npm test` xanh (không đổi code → không kỳ vọng thay đổi kết quả test).

## 7. Status
`WAITING_FOR_APPROVAL`
