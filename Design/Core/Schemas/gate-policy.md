# Schema — gate-policy

> Khai báo các cổng (gate): điều kiện nào chưa thoả thì **cấm sinh code**. Adapter bậc A thực thi bằng hook; bậc B chỉ khuyến nghị bằng rules.

## Tại sao cần file này
Đây là cách giải quyết đúng nỗi đau gốc: **cấm nhảy cóc vào code khi chưa xong tài liệu**. Policy khai báo trung tính ở lõi; mỗi adapter dịch sang cơ chế của mình.

## 1. Hook ép được gì / không ép được gì
- ✅ Ép **gating dựa trên artifact:** chặn `Write`/`Edit`/`Bash` nếu một doc bắt buộc chưa tồn tại.
- ❌ KHÔNG đọc được "ý định" hay chất lượng từng câu. Chỉ thấy file có chưa, state đủ chưa.

## 2. Top-level shape
```yaml
version: 0.1.0
gates:
  - id: scope-locked
    requires_docs: ["00-vision.md", "01-personas.md", "02-scope.md"]
    blocks: ["Write", "Edit", "Bash"]   # khi viết code nguồn
    message: "Phỏng vấn chưa xong tới S3 (scope). Hoàn tất doc trước khi sinh code."
```

> **File này (`.md`) là hợp đồng/định nghĩa field cho dev.** Bản DỮ LIỆU runtime đã khoá ở [`../../Content/interview-script/gate-policy.yaml`](../../Content/interview-script/gate-policy.yaml) — adapter đọc file `.yaml` đó, không parse markdown này. Hai bản phải khớp; lệch thì dừng và báo.

Top-level bắt buộc có:

| Field | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `version` | string | ✓ | Phiên bản schema gate-policy, khoá ở `0.1.0`. |
| `gates` | array\<gate\> | ✓ | Danh sách gate trung tính mà mọi adapter phải hiểu giống nhau. |

## 3. Shape của một `gate`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `id` | string | ✓ | Tên gate dạng kebab-case, duy nhất toàn file. `interview-script.gate` phải trỏ đúng id này. |
| `requires_docs` | array\<string\> | ✓ | Danh sách file phải tồn tại để gate mở. Không được rỗng. Mọi phần tử phải tồn tại trong taxonomy. |
| `blocks` | array\<string\> | ✓ | Danh sách hành động bị chặn khi gate chưa mở. Giá trị hợp lệ ở `0.1.0`: `Write`, `Edit`, `Bash`. |
| `message` | string | ✓ | Thông báo người dùng nhìn thấy khi bị chặn. Phải nói rõ còn thiếu gì và phải làm gì tiếp theo. |

## 4. Cạm bẫy phải tránh
Đừng để `Stop` hook chặn **mọi** lần AI dừng — AI hỏi xong nhường lượt cũng là "stop" hợp lệ. Chỉ chặn khi AI định **chuyển sang build / kết thúc phiên** mà state chưa đủ.

`Stop` **không** phải là một giá trị hợp lệ của `blocks` trong schema `0.1.0`. Nếu harness muốn dùng `Stop` để nhắc nhở, đó chỉ là lớp triển khai phụ trợ và không được thay thế cho gate artifact-based.

## 5. Map sang adapter
| Bậc | Cơ chế | Đảm bảo |
|---|---|---|
| A (Claude Code) | `PreToolUse` đọc `requires_docs`, đối chiếu artifact/state rồi chặn theo `blocks` | Cứng, deterministic |
| B (rules-only) | câu lệnh trong `AGENTS.md`/`.cursorrules` dùng cùng `message` để nhắc/cảnh báo | Mềm, khuyến nghị |

Chi tiết: [../../Adapters/ConformanceMatrix.md](../../Adapters/ConformanceMatrix.md).

## 6. Luật validate

1. `version` phải là string SemVer rút gọn hợp lệ và ở Batch 1 là `0.1.0`.
2. `gates` là mảng không rỗng; mọi `id` là duy nhất.
3. `id` nên theo regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
4. `requires_docs` không được rỗng, không trùng lặp, và mọi doc đều có thật trong taxonomy lõi.
5. `blocks` không được rỗng, không trùng lặp, và chỉ chứa các giá trị cho phép của phiên bản hiện tại.
6. `message` là string không rỗng sau khi trim.
7. Mọi `gate` được tham chiếu từ `interview-script` phải có mặt trong file này.

## 7. Bất biến tương thích

- Gate luôn khai báo ở lõi; adapter không được tự chế thêm gate âm thầm trong code.
- Thêm một gate mới là thay đổi MINOR nếu không phá gate cũ.
- Đổi nghĩa `id`, đổi semantics của `blocks`, hoặc bỏ một gate đang dùng là thay đổi MAJOR.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt cấu trúc gate, luật validate và map bậc A/B. |
