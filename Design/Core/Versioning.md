# Versioning — Chính sách phiên bản Lõi

## Tại sao cần file này
Adapter gầy **phụ thuộc** lõi béo. Đổi lõi mà không version → vỡ hết adapter một cách âm thầm. File này quy định cách thay đổi lõi an toàn.

## 1. Đối tượng được version
Tất cả thành phần trong [Contract.md](Contract.md) mục 1: `interview-script`, `taxonomy`, `state-schema`, `gate-policy`, `anchor-format`. Mỗi cái mang một trường `version`.

## 2. SemVer rút gọn
- **MAJOR** — phá tương thích: bỏ/đổi nghĩa field, đổi cây taxonomy, đổi id câu hỏi. Adapter phải sửa.
- **MINOR** — thêm tương thích: thêm câu hỏi mới có default, thêm field optional. Adapter cũ vẫn chạy.
- **PATCH** — sửa chữ/typo/làm rõ, không đổi cấu trúc.

## 3. Quy tắc khoá
- `interview-script` và `taxonomy` đổi MAJOR → **phải** cập nhật [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md) cùng commit.
- Không bao giờ tái dùng một `id` câu hỏi cho nghĩa khác (id là vĩnh viễn — liên quan anchor truy vết, xem [AnchorFormat.md](AnchorFormat.md)).

## 4. Ghi nhận
Mỗi file schema có bảng changelog ở cuối. Khi MAJOR, ghi rõ adapter nào cần đụng.

| Version | Ngày | Thay đổi | Adapter bị ảnh hưởng |
|---|---|---|---|
| 0.1.0 | (init) | Khởi tạo skeleton | — |
| 1.0.0 | 2026-06-27 | Đóng mốc v1: Thêm nhánh mobile, adapter AGENTS.md, hardening ca biên và đồng bộ 2 golden | — |
| 1.0.1 | 2026-06-28 | Sửa chữ/làm rõ gợi ý S3 (MoSCoW) và cảnh báo M2 (Sync)/M5 (Store) trong kịch bản | Không có |
| 1.1.0 | 2026-06-29 | Hỗ trợ cấu hình `srcPrefix` cho mỏ neo `planned_src_*` trong `emitTree` | Không có |
| 1.2.0 | 2026-06-29 | Bổ sung nhánh `'hybrid'` sinh đồng thời `07-deployment.md` và `07-release.md` | Không có |
| 2.0.0 | 2026-07-09 | Mở `branch` thành hình-hài dự án (registry ở taxonomy); thêm `kind: anchored\|meta`; tách câu chọn hình-hài `S7` khỏi S6; thêm shape `cli` + `07-distribution.md`; critic role + meta-calibrate. **MAJOR** — xem [V2-ExpansionPlan](../RoadMap/V2-ExpansionPlan.md), DecisionLog D21–D26. | Claude Code + AGENTS.md (Đồng bộ đầy đủ và pass kiểm thử tại B5-B6) |
