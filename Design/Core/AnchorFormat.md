# AnchorFormat — Mỏ neo truy vết

> **QUYẾT SỚM.** Đây là quyết định rẻ hôm nay nhưng khoá độ khó của tính năng maintain sau này (xem FirstIdea mục 12–13).

## Tại sao cần file này
Doc free-text thuần → về sau gần như không thể maintain (phải suy lại toàn bộ mapping doc↔code). Nếu mỗi mẩu doc mang một **mỏ neo** trỏ tới code (file/symbol), việc phát hiện "doc nào đã cũ" chỉ còn là kiểm mấy mỏ neo. Phải gieo mỏ neo từ phase scaffolding.

## 1. Vấn đề mỏ neo giải quyết
- **Drift detection:** code ở mỏ neo X đổi sau lần sửa doc Y → gắn cờ doc Y có thể cũ.
- **Truy vết hai chiều:** từ doc tìm code và ngược lại.

## 2. Format đã CHỐT
Mỗi mục doc neo bằng một khối metadata ẩn (HTML comment để không lộ khi render):

```md
<!-- anchor: id=02-scope/feature-login  src=src/auth/login.ts::loginUser  rev=<git-blame-sha>  status=planned|live -->
```

Trường:
- `id` — định danh ổn định của mẩu doc (gắn với `id` câu hỏi trong interview-script khi có).
- `src` — `<đường-dẫn-file>::<symbol-name>` mà mẩu doc mô tả.
- `rev` — **git blame SHA** của symbol tại thời điểm doc được viết.
- `status` — `planned` (chưa có code) hoặc `live` (đã có code).

## 3. Ba quyết định đã chốt (2026-06-25)
1. **Neo theo SYMBOL NAME**, không theo line-range. Bền hơn khi thêm/bớt dòng — đổi vị trí mà tên hàm/class còn nguyên thì mỏ neo không vỡ. Cái giá: cần parser để định vị symbol (chấp nhận, vì line-range giòn tới mức vô dụng khi maintain).
2. **`rev` = git blame SHA** (không phải content checksum). Lý do: SHA cho biết *commit nào* chạm symbol → so với SHA đã ghi là biết ngay "có đổi sau lần sửa doc không", lại nối thẳng được vào diff để xem đổi gì. Checksum chỉ trả lời "có/không đổi", không cho lịch sử.
3. **Khi scaffolding chưa có code: TRỎ TỚI FILE DỰ KIẾN** (đường dẫn dự định) + `status=planned`, `rev` để trống. Khi code ra đời, chuyển `status=live` và điền `rev`. Như vậy mỏ neo tồn tại liền mạch từ doc → ý định → code thật, không có quãng đứt.

> Hệ quả cho parser: cần một bước resolve `src` từ `file::symbol` → vị trí thật + `git blame` để lấy SHA. Symbol không tìm thấy mà `status=live` → gắn cờ (có thể symbol bị đổi tên/xoá).

## 4. Nguyên tắc an toàn (cho maintain sau này)
**Thà gắn cờ nghi ngờ, không âm thầm bảo chứng.** Maintain báo "vẫn ổn" trong khi âm thầm sai sẽ phá huỷ lòng tin.
