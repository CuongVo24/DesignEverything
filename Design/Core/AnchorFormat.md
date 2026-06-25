# AnchorFormat — Mỏ neo truy vết

> **QUYẾT SỚM.** Đây là quyết định rẻ hôm nay nhưng khoá độ khó của tính năng maintain sau này (xem FirstIdea mục 12–13).

## Tại sao cần file này
Doc free-text thuần → về sau gần như không thể maintain (phải suy lại toàn bộ mapping doc↔code). Nếu mỗi mẩu doc mang một **mỏ neo** trỏ tới code (file/symbol), việc phát hiện "doc nào đã cũ" chỉ còn là kiểm mấy mỏ neo. Phải gieo mỏ neo từ phase scaffolding.

## 1. Vấn đề mỏ neo giải quyết
- **Drift detection:** code ở mỏ neo X đổi sau lần sửa doc Y → gắn cờ doc Y có thể cũ.
- **Truy vết hai chiều:** từ doc tìm code và ngược lại.

## 2. Đề xuất format (DRAFT — cần chốt)
Mỗi mục doc có thể neo bằng một khối metadata ẩn (HTML comment để không lộ khi render):

```md
<!-- anchor: id=02-scope/feature-login  src=src/auth/login.ts#L1-L40  rev=<git-sha-hoặc-checksum> -->
```

Trường:
- `id` — định danh ổn định của mẩu doc (gắn với `id` câu hỏi trong interview-script khi có).
- `src` — đường dẫn file (+ optional symbol/line-range) mà mẩu doc mô tả. Có thể rỗng ở phase scaffolding (chưa có code).
- `rev` — checksum/sha của `src` tại thời điểm doc được viết → so sánh để phát hiện drift.

## 3. Quyết định cần chốt
- [ ] Neo theo **line-range** (giòn) hay **symbol name** (bền hơn, cần parser)?
- [ ] `rev` dùng **git blame SHA** hay **content checksum**?
- [ ] Khi scaffolding chưa có code: để `src` rỗng hay trỏ tới file dự kiến?

## 4. Nguyên tắc an toàn (cho maintain sau này)
**Thà gắn cờ nghi ngờ, không âm thầm bảo chứng.** Maintain báo "vẫn ổn" trong khi âm thầm sai sẽ phá huỷ lòng tin.
