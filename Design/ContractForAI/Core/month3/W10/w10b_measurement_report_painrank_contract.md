# Contract — W10B Báo cáo đo lường + bảng xếp hạng điểm vướng

> **Tầng:** Process. Nguồn: [Week-10](../../../../RoadMap/Month3/Week-10.md) + số thô W10A ([metrics-raw.csv](../../../../RoadMap/Month3/dogfood/metrics-raw.csv)) + [backlog-month3](../../../../RoadMap/Month3/backlog-month3.md). Phụ thuộc: [W10A](w10a_multiproject_measurement_runs_contract.md) `DONE`.

## 1. Micro-task target
Tổng hợp số thô đa-dự-án thành **một báo cáo đo lường có so sánh** (thời gian soạn doc trước/sau so baseline "gần 1 tuần") + **bảng xếp hạng điểm vướng theo tần suất × mức đau**, để W11 sửa đúng chỗ đau nhất thay vì sửa cảm tính.

## 2. Scope
**In scope**
- `measurement-report.md`: bảng so sánh giữa các dự án (tổng thời gian, thời gian/giai đoạn, số lần dừng, tỷ lệ file sửa tay), tách rõ thật vs bán-thật.
- Ước lượng "rút được bao nhiêu so baseline gần 1 tuần" — nêu rõ giả định và độ tin cậy (mẫu nhỏ → không tô hồng).
- `pain-rank.md`: xếp hạng câu/section/template gây vướng theo (tần suất lặp qua các dự án) × (mức đau); đánh dấu top mục là pattern hệ thống vs lỗi lẻ.
- Cập nhật `backlog-month3.md`: gỡ cờ "chờ xác nhận tần suất" thành "đã xác nhận hệ thống / vẫn cá biệt".

**Out of scope**
- KHÔNG sửa `Content/`/script/golden (W11). KHÔNG mở rộng taxonomy (W12).
- KHÔNG đưa kết luận lớn vượt mức dữ liệu cho phép (ghi rõ "chưa đủ phủ" nếu mẫu mỏng).

## 3. Checklist
- [ ] `measurement-report.md` có bảng so sánh ≥2–3 dự án, tách thật/bán-thật.
- [ ] Có con số "rút được so baseline gần 1 tuần" kèm giả định + cảnh báo độ tin cậy.
- [ ] `pain-rank.md` xếp hạng theo tần suất × mức đau, phân biệt hệ thống vs lẻ.
- [ ] `backlog-month3.md` cập nhật cờ tần suất cho từng mục → W11 biết sửa cái nào trước.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/dogfood/measurement-report.md` (~60–120 dòng)
- `[NEW]` `Design/RoadMap/Month3/dogfood/pain-rank.md` (~40–80 dòng, bảng xếp hạng)
- `[MODIFY]` `Design/RoadMap/Month3/backlog-month3.md` (cập nhật cờ tần suất)
- Không đổi code, không đổi `Content/`.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Mẫu nhỏ nhưng kết luận to | Cao | Mọi con số kèm giả định + độ tin cậy; cấm tuyên bố lớn nếu chưa đủ phủ. |
| Xếp hạng theo cảm giác thay vì số | TB | pain-rank phải tính từ tần suất (đếm trên metrics/backlog) × mức đau, không xếp tay tuỳ hứng. |
| Báo cáo tô hồng để "trông hữu ích" | Cao | Tách thật/bán-thật; nêu cả chỗ công cụ KHÔNG rút được thời gian. |

## 6. Verification plan
- `npm test` — xanh (chưa chạm code/Content lõi).
- Review thủ công: mỗi mục trong `pain-rank.md` truy ngược được về dòng trong `metrics-raw.csv`/backlog (không có mục "trên trời").
- `measurement-report.md` có cả mặt tích cực lẫn hạn chế (không một chiều).

## 7. Status
`WAITING_FOR_APPROVAL`
