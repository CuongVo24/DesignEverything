# Tuần 5/16 — Nhánh mobile end-to-end + thực thi 2 bẫy M2/M5

> Tháng 2 · Mốc: v1 dùng được · Phụ thuộc: Month 1 (web chạy được)

## Tại sao cần file này
{{Mở rộng engine sang nhánh mobile; golden mobile đã có sẵn nên tận dụng làm fixture.}}

## Mục tiêu tuần (Definition of Done)
{{Phiên mobile chạy trọn S0→S6→M1–M5, emit đúng 07-release, cảnh báo 2 bẫy hiển thị đúng lúc.}}

## Việc chi tiết
- [ ] Rẽ nhánh mobile sau S6 trong advanceState (W vs M).
- [ ] Chạy trọn luồng mobile đối chiếu golden mobile có sẵn.
- [ ] Bảo đảm cảnh báo M2 (offline/sync) + M5 (store) bật ra sớm.
- [ ] EMIT `07-release.md` thay `07-deployment.md` đúng nhánh.
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{engine lõi, golden mobile, script.yaml nhánh M.}}

## Đầu ra / Artifact
{{Mobile end-to-end chạy + test regression.}}

## Rủi ro & cạm bẫy
{{Emit nhầm file 07; bỏ sót cảnh báo bẫy.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được}}
