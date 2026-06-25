# Coding & Git Standard

## Tại sao cần file này
Dù dự án nhẹ code, vẫn cần quy ước nhất quán để adapter và lõi không lệch nhau, và lịch sử git đọc được.

## Git
- Branch: `main` ổn định; nhánh tính năng `feat/<tên>`, sửa lỗi `fix/<tên>`.
- Commit: dạng [Conventional Commits] — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Một commit = một ý. Đổi lõi phá tương thích → ghi rõ adapter bị ảnh hưởng (theo [../Core/Versioning.md](../Core/Versioning.md)).

## Code (khi bắt đầu viết adapter)
- Giữ **lõi béo, adapter gầy** — logic chung dồn về lõi, adapter chỉ INJECT/GATE/EMIT.
- File schema/script là nguồn sự thật; code đọc chúng, không hardcode câu hỏi.
- Mỏ neo truy vết ([../Core/AnchorFormat.md](../Core/AnchorFormat.md)) gắn từ đầu, không để dành.

## Tài liệu
- Mỗi file Design mở đầu bằng `## Tại sao cần file này`.
- Liên kết nội bộ bằng đường dẫn tương đối (clickable).
