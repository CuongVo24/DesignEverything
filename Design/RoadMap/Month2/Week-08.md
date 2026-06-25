# Tuần 8/16 — Hardening ca biên + regression 2 golden → đóng v1

> Tháng 2 · Mốc: v1 dùng được (đóng mốc) · Phụ thuộc: Tuần 5–7

## Tại sao cần file này
{{Trước khi gọi là v1 phải vững ca biên gate và có lưới regression để không vỡ thầm lặng về sau.}}

## Mục tiêu tuần (Definition of Done)
{{Bộ regression chạy xanh trên web+mobile; ca biên gate/anchor xử lý hết; v1 đóng gói.}}

## Việc chi tiết
- [ ] Bug bash ca biên gate (state lỗi, version lệch, double-advance).
- [ ] Regression test cả 2 golden (web + mobile) trong CI cục bộ.
- [ ] Kiểm anchor emit + EMIT đúng taxonomy ở mọi nhánh.
- [ ] Cập nhật [../MasterRoadMap.md](../MasterRoadMap.md) + Versioning changelog.
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{toàn bộ Month 2.}}

## Đầu ra / Artifact
{{v1 đóng gói + bộ regression + ghi chú phát hành.}}

## Rủi ro & cạm bẫy
{{Coi "đủ tính năng" là "đủ chất lượng"; bỏ qua ca biên.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được — mốc "v1 dùng được" coi như đạt}}
