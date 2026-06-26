# Tuần 8/16 — Hardening ca biên + regression 2 golden → đóng v1

> Tháng 2 · Mốc: v1 dùng được (đóng mốc) · Phụ thuộc: Tuần 5–7

## Tại sao cần file này
Một bản v1 chỉ đáng tin nếu nó không vỡ khi đổi nội dung hoặc đi qua ca người dùng hơi xấu tay. Tuần này là lớp đệm giữa "mọi thứ đều có" và "mọi thứ đủ ổn để mang sang dự án thật".

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có bộ regression web + mobile chạy xanh, các ca biên chính của gate/state/anchor đã được khóa lại bằng test hoặc fixture, và có một bản chốt v1 nêu rõ phạm vi, chất lượng hiện tại, và cách tái lập demo. Đây là tuần đóng mốc "v1 dùng được".

## Việc chi tiết
- [ ] Bug bash ca biên gate (state lỗi, version lệch, double-advance).
- [ ] Regression test cả 2 golden (web + mobile) trong CI cục bộ.
- [ ] Kiểm anchor emit + EMIT đúng taxonomy ở mọi nhánh.
- [ ] Cập nhật [../MasterRoadMap.md](../MasterRoadMap.md) + Versioning changelog.
- [ ] Thử một vài ca nhập xấu: user trả lời lan man, nhảy chủ đề, xin code khi mới xong S1/S2.
- [ ] Chốt danh sách known limitations để Month 3 đo trên dự án thật thay vì tiếp tục sửa trong phòng kín.

## Đầu vào / Phụ thuộc
Toàn bộ kết quả Month 1 và Month 2: web/mobile goldens, template đã chau chuốt, Claude Code reference, AGENTS.md generator, schema và taxonomy đã ổn định. Tuần này là tuần hardening, không phải tuần mở thêm tính năng lớn. Regression và smoke run phải bám [../../Conventions/TestStrategy.md](../../Conventions/TestStrategy.md), nhất là tầng GATE và end-to-end adapter.

## Đầu ra / Artifact
- Bộ regression chính thức cho web và mobile.
- Một ghi chú phát hành v1: scope, setup, limitations, cách demo lại.
- Danh sách known issues/known limits để làm backlog dữ liệu cho Month 3.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là tự thuyết phục rằng "đủ tính năng" đồng nghĩa với "đủ dùng". Tuần này phải cưỡng lại cám dỗ thêm đồ mới; chỉ sửa những điểm làm regression, gate, output hoặc khả năng dogfood ở Month 3 bị lung lay.

## Nghiệm thu
- [ ] Regression web và mobile chạy xanh cùng lúc.
- [ ] Smoke test trên Claude Code và ít nhất một harness mềm vẫn cho kết quả chấp nhận được sau các chỉnh sửa nội dung.
- [ ] Có release note v1 đủ rõ để bước sang Month 3 mà không phải hồi tưởng bằng trí nhớ.
- [ ] Mốc "v1 dùng được" được đóng với phạm vi rõ, không mập mờ.
