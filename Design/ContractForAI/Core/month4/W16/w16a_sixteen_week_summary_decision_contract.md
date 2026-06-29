# Contract — W16A Tổng kết 16 tuần + quyết định giai đoạn 2 dựa số đo

> **Tầng:** Process. Nguồn: [Week-16](../../../../RoadMap/Month4/Week-16.md) + [MasterRoadMap](../../../../RoadMap/MasterRoadMap.md) + [measurement-report](../../../../RoadMap/Month3/dogfood/measurement-report.md) (sau [W14A](../W14/w14a_external_validation_real_diff_contract.md)) + [DecisionLog](../../../../DecisionLog.md). Phụ thuộc: **tất cả** contract Month 4 `DONE`.

## 1. Micro-task target
Chốt 16 tuần bằng một báo cáo tổng kết đối chiếu kết quả với từng mốc RoadMap, và một quyết định giai đoạn-2 **dựa số đo + bài học**, không theo hứng. Tạo một điểm dừng có trí nhớ: người mới đọc hiểu 16 tuần đạt gì, còn nợ gì, nên làm gì tiếp và với điều kiện kích hoạt nào.

## 2. Scope
**In scope** — tầng Process:
- Tổng hợp số đo: thời gian soạn doc rút bao nhiêu (số cơ học từ W14A, không ước lượng), chất lượng output, độ phủ harness ([ConformanceMatrix](../../../../Adapters/ConformanceMatrix.md)).
- Đánh giá đạt/chưa-đạt từng mốc (Bản chạy được / v1 / Đáng chia sẻ).
- Quyết định giai đoạn 2 (Drift Fixing? adapter native mới? phân phối rộng? thêm validation thật?) — có thứ tự ưu tiên + **điều kiện kích hoạt** đo được.
- Cập nhật [MasterRoadMap.md](../../../../RoadMap/MasterRoadMap.md) (trạng thái mốc) + [DecisionLog.md](../../../../DecisionLog.md) (quyết định chiến lược mới, vd D21) + lessons learned.

**Out of scope**
- KHÔNG mở workstream/code mới ở tuần này.
- KHÔNG kết luận từ dữ liệu mỏng: nếu [W14A](../W14/w14a_external_validation_real_diff_contract.md) `BLOCKED` (chưa có người ngoài) → ghi rõ "Đáng chia sẻ đạt một phần", không tô hồng.

## 3. Checklist
- [ ] Báo cáo đối chiếu đủ 3 mốc RoadMap với bằng chứng.
- [ ] Số "rút thời gian soạn doc" lấy từ diff cơ học W14A, không ước lượng.
- [ ] Quyết định giai đoạn 2 có ưu tiên + điều kiện kích hoạt rõ.
- [ ] MasterRoadMap + DecisionLog phản ánh quyết định mới.
- [ ] Lessons learned: cái giữ-bằng-mọi-giá / nên-bỏ / không-đáng-làm-sớm.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month4/sixteen-week-summary.md`
- `[NEW]` `Design/RoadMap/Phase2-roadmap.md` (roadmap giai đoạn 2 ngắn, có ưu tiên + kích hoạt)
- `[MODIFY]` `Design/RoadMap/MasterRoadMap.md` (trạng thái mốc), `Design/DecisionLog.md` (quyết định chiến lược nếu có)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Kết luận quá nhanh từ dữ liệu mỏng | Cao | Bám số W14A; nếu external `BLOCKED` thì tuyên bố "đạt một phần". |
| Trì hoãn mọi quyết định vì muốn chắc tuyệt đối | TB | Chấp nhận "bất định có ghi chép + tiêu chí"; mỗi quyết định kèm điều kiện kích hoạt. |
| Ép thêm tính năng cho "tròn số" 16 tuần | TB | Scope cấm mở workstream mới; tuần này chỉ tổng hợp. |

## 6. Verification plan
- Review thủ công: người mới đọc summary hiểu 16 tuần đạt gì + bước tiếp + vì sao.
- Mọi con số trong summary truy được về artifact (W14A diff, ConformanceMatrix, golden score).
- `npm test` xanh; MasterRoadMap/DecisionLog không còn mốc treo mơ hồ.

## 7. Status
`WAITING_FOR_APPROVAL`
