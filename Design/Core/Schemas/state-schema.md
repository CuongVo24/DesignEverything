# Schema — state (`progress.json`)

> Trạng thái của một phiên phỏng vấn. Hook đọc file này để biết "đã đi tới đâu" và có cho sinh code chưa.

## Tại sao cần file này
GATE không đọc được "ý định" hay chất lượng câu trả lời — nó chỉ thấy **file có chưa, state đủ chưa**. Vì thế enforcement phải dựa trên **artifact + state machine**, và `progress.json` chính là state machine đó.

## 1. Top-level shape
```json
{
  "version": "0.1.0",
  "phase": "interview",
  "branch": null,
  "current_step": "S4",
  "answered": ["S0", "S1", "S2", "S3"],
  "emitted_docs": ["00-vision.md", "01-personas.md", "02-scope.md"],
  "gates_passed": ["scope-locked"],
  "last_user_turn_id": "turn-0004",
  "updated_at": "2026-06-25T00:00:00Z"
}
```

## 2. Field đã khoá

| Field | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `version` | string | ✓ | Phiên bản schema state. Batch 1 khoá ở `0.1.0`. |
| `phase` | `interview` \| `docs-emitted` \| `ready-to-build` | ✓ | Pha hiện tại của phiên. |
| `branch` | `web` \| `mobile` \| null | ✓ | `null` trước khi chốt xong S6; sau S6 phải là `web` hoặc `mobile`. |
| `current_step` | string \| null | ✓ | `id` câu đang chờ câu trả lời người thật. `null` khi đã hoàn tất phỏng vấn và chuyển pha. |
| `answered` | array\<string\> | ✓ | Các `id` đã nhận câu trả lời người thật và đã được xác nhận. |
| `emitted_docs` | array\<string\> | ✓ | Danh sách file doc đã được EMIT ra theo taxonomy. |
| `gates_passed` | array\<string\> | ✓ | Các gate đã mở vì artifact yêu cầu đã có. |
| `last_user_turn_id` | string \| null | ✓ | Dùng để chống advance 2 lần cho cùng một `UserPromptSubmit`. |
| `updated_at` | string (ISO-8601 UTC) | ✓ | Timestamp lần cập nhật state gần nhất. |

## 3. Mẹo buộc câu trả lời là của NGƯỜI THẬT
Dùng `UserPromptSubmit` (chỉ fire khi có tin nhắn người thật) → state machine **chỉ tiến 1 bước mỗi lượt người dùng thật** → AI không tự bịa cả 7 câu trong một lượt rồi nhảy vào code.

## 4. Quy tắc chuyển bước

1. `SessionStart` khởi tạo state với:
   - `phase = "interview"`
   - `branch = null`
   - `current_step = "S0"`
   - các mảng rỗng
   - `last_user_turn_id = null`
2. Khi có `UserPromptSubmit` mới:
   - nếu `incoming_turn_id == last_user_turn_id` thì **không** được advance lần nữa;
   - nếu đây là lượt mới và câu trả lời hợp lệ cho `current_step`, thêm `current_step` vào `answered`, cập nhật `last_user_turn_id`, rồi mới tính bước kế tiếp.
3. Sau khi `S6` được xác nhận:
   - gán `branch = "web"` hoặc `branch = "mobile"`;
   - chọn `current_step` đầu tiên của nhánh tương ứng (`W1` hoặc `M1`).
4. Khi hoàn tất câu cuối của nhánh:
   - `phase` chuyển sang `docs-emitted` nếu còn thiếu file doc đầu ra;
   - `phase` chuyển sang `ready-to-build` khi mọi doc bắt buộc đã được emit và gate tương ứng đã mở.
5. Khi `phase = "ready-to-build"` thì `current_step = null`.

## 5. Bất biến

- `current_step` chỉ tiến tối đa **1 bước** cho mỗi `last_user_turn_id` mới.
- `answered`, `emitted_docs`, `gates_passed` là append-only trong một phiên; không xoá phần tử để "lùi" lịch sử âm thầm.
- `answered` không được chứa `id` ngoài `interview-script`.
- `branch` không được nhận giá trị khác `web`, `mobile`, `null`.
- Nếu `branch != null` thì `S6` phải nằm trong `answered`.
- Nếu `phase = "ready-to-build"` thì mọi gate cần cho build phải xuất hiện trong `gates_passed`.

## 6. Luật validate

1. Mọi field ở mục 2 đều bắt buộc phải tồn tại, kể cả khi mang giá trị `null`.
2. `phase` chỉ nhận một trong ba giá trị đã khoá.
3. `updated_at` phải là chuỗi ISO-8601 UTC hợp lệ.
4. `answered`, `emitted_docs`, `gates_passed` không chứa phần tử trùng lặp.
5. `current_step` là `null` hoặc phải là `id` có thật trong `interview-script`.
6. `last_user_turn_id` là `null` khi chưa nhận lượt người thật nào; nếu có giá trị thì phải là string không rỗng.
7. `emitted_docs` và `gates_passed` chỉ được chứa tên tài nguyên có thật trong taxonomy và gate-policy lõi.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt field `progress.json`, quy tắc chuyển bước và bất biến một-lượt-người-thật-một-bước. |
