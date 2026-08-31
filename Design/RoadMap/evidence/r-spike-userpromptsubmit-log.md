# R-spike — `UserPromptSubmit` log khi trả lời thẻ tương tác

> Nguồn: [r-spike-userpromptsubmit-probe.md](../../ContractForAI/Core/v7-expansion/r-spike-userpromptsubmit-probe.md).
> Trạng thái: **CHỜ CHẠY** — probe đã dựng xong (2026-08-16), chưa có log thật. Mục "Kết quả" và
> §7 của contract sẽ cập nhật sau khi chủ repo chạy đủ 6 lần thử bên dưới.

## Probe đã dựng ở đâu, dựng thế nào

- Workspace: `E:\rspike-8.1-probe` — thư mục trống, cài DesignEverything **thật** bằng
  `node adapter/claude-code/install.mjs E:/rspike-8.1-probe` (không giả lập), bundle 8.1.0.
- Thêm một hook log độc lập, KHÔNG phải một phần sản phẩm: `E:\rspike-8.1-probe\rspike-log-hook.mjs`
  — đọc stdin JSON của Claude Code, ghi một dòng vào `rspike-log.log` mỗi lần `UserPromptSubmit` bắn,
  gồm timestamp, `hook_event_name`, `session_id`, và 120 ký tự đầu của field `prompt`. Không chặn,
  không emit decision — chạy song song với hook `UserPromptSubmit` thật của sản phẩm (đăng ký thêm
  một entry trong mảng `hooks.UserPromptSubmit` của `.claude/settings.json`, không sửa entry sản
  phẩm). Đã smoke-test bằng stdin giả — ghi log đúng định dạng, không lỗi.

## Cách chạy (chủ repo thực hiện)

1. Mở một phiên Claude Code **mới** tại `E:\rspike-8.1-probe` (hook chỉ nạp lúc khởi động phiên).
2. Gõ `/design-everything` để bắt đầu phỏng vấn — câu đầu tiên là `CAL0` (meta, 2 lựa chọn
   `deep`/`fast`, có cả đường tự nhập/Other) — vừa khớp cả hai ca cần đo.

**Ca (a) — chọn nút có sẵn:**
- Trả lời CAL0 bằng cách bấm một lựa chọn có sẵn trên thẻ (không gõ).
- Mở `E:\rspike-8.1-probe\rspike-log.log`, xem có dòng mới xuất hiện đúng lúc trả lời không.
- Ghi kết quả vào bảng bên dưới (dán nguyên dòng log nếu có, hoặc "không thấy entry nào").
- **Reset để lặp lại:** xoá `E:\rspike-8.1-probe\.design-everything\interview-state.json` (và
  `progress.json` nếu có) — không cần mở phiên mới, chỉ cần gõ `/design-everything` lại trong cùng
  phiên để CAL0 được hỏi lại từ đầu.
- Lặp đủ 3 lần liên tiếp.

**Ca (b) — gõ vào ô tự nhập (Other) của thẻ:**
- Cùng câu CAL0, nhưng chọn ô Other trên thẻ rồi gõ tự do thay vì bấm nút có sẵn.
- Đọc log, ghi kết quả, reset như trên, lặp đủ 3 lần liên tiếp.

3. Ghi phiên bản Claude Code lúc đo (Help → About, hoặc `claude --version` nếu dùng CLI) vào mục
   dưới — hành vi này có thể đổi giữa các bản.
4. Dán toàn bộ nội dung `rspike-log.log` cuối cùng (6+ dòng) vào mục "Log thô" bên dưới, hoặc báo lại
   cho phiên trợ lý để điền vào đây.

## Version Claude Code lúc đo

`(điền khi chạy — Help → About hoặc `claude --version`)`

## Kết quả từng lần thử

| # | Ca | Thời điểm | Có entry log mới? | Ghi chú |
|---|---|---|---|---|
| 1 | (a) chọn nút | | | |
| 2 | (a) chọn nút | | | |
| 3 | (a) chọn nút | | | |
| 4 | (b) gõ Other | | | |
| 5 | (b) gõ Other | | | |
| 6 | (b) gõ Other | | | |

## Log thô (`rspike-log.log`)

```
(dán nguyên văn khi có)
```

## Kết luận

`(điền sau khi đủ 6 lần thử — chọn đúng một nhánh theo r-spike-userpromptsubmit-probe.md §5:
"CÓ bắn" → B22c bỏ cơ chế giữ câu trả lời, commit ngay trong lượt (khớp code hiện tại); "KHÔNG bắn"
→ B22c phải thiết kế cơ chế giữ câu trả lời qua lượt, cần thêm test chống double-commit ở B22e.)`
