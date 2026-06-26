# Month 2 — v1 dùng được: Mobile + AGENTS.md + chau chuốt

> Tháng 2/4 · Tuần 5–8/16 · Mốc RoadMap: **v1 dùng được**

## Tại sao cần file này
Month 1 mới chỉ chứng minh được một reference implementation hẹp nhưng thật. Month 2 là lúc sản phẩm bắt đầu giống thứ người khác có thể dùng: có cả web lẫn mobile, có một adapter mềm phủ nhiều harness, và output tài liệu đủ sạch để không bị cảm giác "demo được nhưng chưa dám tin".

## Mục tiêu tháng (Definition of Done)
Cuối tháng phải có một v1 dùng được theo nghĩa thực tế: nhánh mobile chạy trọn M1–M5 với hai cảnh báo quan trọng hiển thị đúng lúc, `AGENTS.md` sinh ra từ lõi và dùng được ít nhất trên một vài harness rules-only, các template/output mẫu pass QualityRubric một cách ổn định, và bộ regression đủ để thay đổi nội dung hay adapter không làm vỡ thầm lặng web/mobile.

## Các tuần
| Tuần | Tiêu đề | Mốc nhỏ |
|---|---|---|
| [Tuần 5](Week-05.md) | Nhánh mobile end-to-end + 2 bẫy M2/M5 | Mobile đi trọn tuyến, emit đúng `07-release.md`, và không bỏ sót cảnh báo bắt buộc |
| [Tuần 6](Week-06.md) | Adapter AGENTS.md (bậc B) + test Codex/Cursor | Sinh được rules mềm từ lõi và test trên ít nhất 1–2 harness đại diện |
| [Tuần 7](Week-07.md) | Chau chuốt template + phần "tại sao" + rubric | Output thật sự dễ đọc cho người mới và pass rubric có chủ ý |
| [Tuần 8](Week-08.md) | Hardening ca biên + regression 2 golden → đóng v1 | Web + mobile xanh cùng lúc và đủ chắc để gọi là v1 |

## Đầu ra cuối tháng
- Nhánh mobile chạy end-to-end với fixture `Design/Content/golden-example-mobile/` làm regression chính thức.
- Một bộ sinh `AGENTS.md`/rules mềm từ cùng lõi, có tuyên bố giới hạn enforcement rõ ràng.
- Bộ `doc-templates` và output mẫu được chau chuốt để người mới đọc không bị ngợp, nhưng vẫn đủ thông tin cho build.
- Bộ regression tối thiểu web + mobile + rules-only harness, đủ làm lưới an toàn cho Month 3.
- Một ghi chú chốt v1: làm được gì, không làm gì, và tiêu chuẩn nào dùng để nói "dùng được".

## Rủi ro & kỷ luật phạm vi
Rủi ro lớn nhất của tháng này là tham "phủ nhiều nơi" đến mức mỗi harness chỉ hỗ trợ nửa vời. Kỷ luật bắt buộc là: chỉ mở thêm mobile và `AGENTS.md`, không nhảy sang adapter native mới; chỉ đánh dấu đã phủ harness khi có test hoặc smoke run thật; và không hy sinh chất lượng nội dung để lấy độ phủ bề mặt.
