# QA-01 — Baseline và chất lượng tĩnh

## Mục tiêu

Xác định repo có build/test sạch, các cổng chất lượng có ổn định và kết quả có lặp lại trên đúng trạng thái hiện tại hay không.

## Check bắt buộc

1. Ghi `git status`, Node/npm version và dung lượng trống.
2. Chạy riêng từng cổng để biết chính xác cổng nào fail:

   ```powershell
   rtk npm run typecheck
   rtk npm run lint
   rtk npm run build:bundle
   rtk npm test
   ```

3. Chạy full test lần hai:

   ```powershell
   rtk npm test
   ```

4. So sánh số test, thời lượng, test fail/skip giữa hai lần.
5. Kiểm tra build có tạo thay đổi ngoài `dist/` hoặc sửa source không:

   ```powershell
   rtk git status --short
   ```

## Novel probes bắt buộc

- Chạy test với timezone khác `Asia/Saigon` và ghi nhận khác biệt.
- Chạy một targeted suite hai lần liên tiếp trong cùng process runner để tìm state leakage.
- Kiểm tra có test `.only`, `.skip`, `todo` hoặc assertion vô hiệu hóa ngoài chủ ý.
- Đối chiếu `package.json` scripts với README/runbook: tên lệnh, thứ tự và exit code có đúng lời hứa.
- Kiểm tra output lỗi có làm lộ absolute path hoặc dữ liệu môi trường.

## Oracle

- Mọi quality gate exit 0.
- Hai lần full suite có cùng tập test và cùng kết luận.
- Không có test bị bỏ qua âm thầm.
- Build không sửa file nguồn.
- Lỗi CLI/test không lộ đường dẫn nhạy cảm trong envelope công khai.

## Báo cáo

Ghi vào `findings/QA-01-<ten-phien>.md` theo `report-template.md`.
