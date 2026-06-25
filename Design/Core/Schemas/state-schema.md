# Schema — state (`progress.json`)

> Trạng thái của một phiên phỏng vấn. Hook đọc file này để biết "đã đi tới đâu" và có cho sinh code chưa.

## Tại sao cần file này
GATE không đọc được "ý định" hay chất lượng câu trả lời — nó chỉ thấy **file có chưa, state đủ chưa**. Vì thế enforcement phải dựa trên **artifact + state machine**, và `progress.json` chính là state machine đó.

## 1. Hình dạng (DRAFT)
```json
{
  "version": "0.1.0",
  "branch": "web",
  "current_step": "S4",
  "answered": ["S0", "S1", "S2", "S3"],
  "emitted_docs": ["00-vision.md", "01-personas.md", "02-scope.md"],
  "gates_passed": ["scope-locked"],
  "updated_at": "2026-06-25T00:00:00Z"
}
```

## 2. Field
| Field | Ý nghĩa |
|---|---|
| `branch` | `core` rồi rẽ `web`/`mobile` sau S6. |
| `current_step` | id câu hỏi đang chờ trả lời. |
| `answered` | các id đã có câu trả lời người thật. |
| `emitted_docs` | các file doc đã sinh ra. |
| `gates_passed` | các cổng đã mở (xem [gate-policy.md](gate-policy.md)). |

## 3. Mẹo buộc câu trả lời là của NGƯỜI THẬT
Dùng `UserPromptSubmit` (chỉ fire khi có tin nhắn người thật) → state machine **chỉ tiến 1 bước mỗi lượt người dùng thật** → AI không tự bịa cả 7 câu trong một lượt rồi nhảy vào code.

## 4. Bất biến
- `current_step` chỉ tiến khi có lượt người thật.
- Không xoá phần tử khỏi `answered`/`emitted_docs` (chỉ thêm).

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khởi tạo skeleton |
