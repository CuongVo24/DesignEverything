# Schema — gate-policy

> Khai báo các cổng (gate): điều kiện nào chưa thoả thì **cấm sinh code**. Adapter bậc A thực thi bằng hook; bậc B chỉ khuyến nghị bằng rules.

## Tại sao cần file này
Đây là cách giải quyết đúng nỗi đau gốc: **cấm nhảy cóc vào code khi chưa xong tài liệu**. Policy khai báo trung tính ở lõi; mỗi adapter dịch sang cơ chế của mình.

## 1. Hook ép được gì / không ép được gì
- ✅ Ép **gating dựa trên artifact:** chặn `Write`/`Edit`/`Bash` nếu một doc bắt buộc chưa tồn tại.
- ❌ KHÔNG đọc được "ý định" hay chất lượng từng câu. Chỉ thấy file có chưa, state đủ chưa.

## 2. Hình dạng (DRAFT)
```yaml
version: 0.1.0
gates:
  - id: scope-locked
    requires_docs: ["00-vision.md", "01-personas.md", "02-scope.md"]
    blocks: ["Write", "Edit", "Bash"]   # khi viết code nguồn
    message: "Phỏng vấn chưa xong tới S3 (scope). Hoàn tất doc trước khi sinh code."
```

| Field | Ý nghĩa |
|---|---|
| `id` | tên gate (interview-script trỏ tới qua field `gate`). |
| `requires_docs` | các file phải tồn tại để mở cổng. |
| `blocks` | hành động bị chặn khi cổng đóng. |
| `message` | thông báo hiển thị khi chặn. |

## 3. Cạm bẫy phải tránh
Đừng để `Stop` hook chặn **mọi** lần AI dừng — AI hỏi xong nhường lượt cũng là "stop" hợp lệ. Chỉ chặn khi AI định **chuyển sang build / kết thúc phiên** mà state chưa đủ.

## 4. Map sang adapter
| Bậc | Cơ chế | Đảm bảo |
|---|---|---|
| A (Claude Code) | `PreToolUse` chặn theo `blocks` | Cứng, deterministic |
| B (rules-only) | câu lệnh trong `AGENTS.md`/`.cursorrules` | Mềm, khuyến nghị |

Chi tiết: [../../Adapters/ConformanceMatrix.md](../../Adapters/ConformanceMatrix.md).

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khởi tạo skeleton |
