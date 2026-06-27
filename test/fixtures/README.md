# Test Fixtures — Thư mục dữ liệu kiểm thử

> Thư mục này lưu trữ các bộ dữ liệu mẫu (fixtures) dùng để chạy các test case kiểm định logic cho Lõi (schemas) và Adapter (các hook Gate/Inject).

## Cấu trúc thư mục

```text
fixtures/
├── progress/
│   ├── init-s0.json           # State khi vừa tạo phiên phỏng vấn mới
│   ├── mid-web.json           # State đang ở giữa buổi phỏng vấn (nhánh Web)
│   ├── ready-to-build.json    # State khi hoàn thành toàn bộ phỏng vấn và xuất doc
│   └── invalid/
│       ├── missing-field.json        # Lỗi: Thiếu trường bắt buộc (ví dụ: version)
│       ├── invalid-branch.json       # Lỗi: Giá trị branch ngoài enum cho phép
│       ├── invalid-answered-len.json # Lỗi: baseline count vượt quá mảng answered
│       └── double-step.json          # Lỗi: answered tăng nhiều hơn 1 bước so với baseline
├── gate/
│   ├── docs-missing/          # Thư mục thiếu tài liệu bắt buộc (thiếu 02-scope.md)
│   └── docs-complete/         # Thư mục chứa đầy đủ 3 tài liệu bắt buộc để mở gate
└── README.md                  # Hướng dẫn chi tiết (File này)
```

---

## 1. Fixture Trạng thái phỏng vấn (`progress/`)

Dùng để kiểm thử schema loader, validator trạng thái, và logic kiểm soát nhịp phỏng vấn (`UserPromptSubmit`):

*   **`init-s0.json`**:
    *   *Mục đích*: Test khởi tạo phiên làm việc mới.
    *   *Trạng thái*: Phase `interview`, bước hiện tại `S0`, mảng `answered` rỗng, `answered_len_at_last_turn` bằng `0`.
*   **`mid-web.json`**:
    *   *Mục đích*: Test luồng phỏng vấn đang diễn ra.
    *   *Trạng thái*: Phase `interview`, nhánh `web`, bước hiện tại `W2`, mảng `answered` chứa 8 câu hỏi đã trả lời, `answered_len_at_last_turn` bằng `8`.
*   **`ready-to-build.json`**:
    *   *Mục đích*: Test trạng thái hoàn tất phỏng vấn và sẵn sàng cho phép lập trình.
    *   *Trạng thái*: Phase `ready-to-build`, nhánh `web`, bước hiện tại `null`, mảng `answered` chứa tất cả 12 câu hỏi đã trả lời.

---

## 2. Fixture Trạng thái không hợp lệ (`progress/invalid/`)

Dùng để kiểm định xem parser và hook validator có chặn chính xác các ca lỗi hoặc bất biến bị vi phạm không:

*   **`missing-field.json`**: Kiểm tra việc bắt lỗi thiếu trường bắt buộc (`version`) trong schema của `progress.json`.
*   **`invalid-branch.json`**: Kiểm tra việc bắt lỗi giá trị không hợp lệ của `branch` (ví dụ `"desktop"` thay vì `web`/`mobile`/`null`).
*   **`invalid-answered-len.json`**: Kiểm tra bất biến: `answered_len_at_last_turn` phải nhỏ hơn hoặc bằng độ dài mảng `answered`.
*   **`double-step.json`**: Mô phỏng lỗi tiến bước nhảy cóc: độ dài của `answered` tăng 2 đơn vị so với mốc `answered_len_at_last_turn` của lượt trước mà không qua chốt chặn nhịp.

---

## 3. Fixture Trạng thái tài liệu (`gate/`)

Dùng để kiểm thử hook `PreToolUse` nhằm thực thi cứng nguyên tắc "không xong doc thì không được code":

*   **`docs-missing/`**:
    *   *Mục đích*: Test ca bị chặn. Chỉ có `00-vision.md` và `01-personas.md`, thiếu `02-scope.md`.
    *   *Kết quả mong đợi*: Khi AI chạy các công cụ code/build, hook phải chặn đứng và trả ra message lỗi từ gate-policy.
*   **`docs-complete/`**:
    *   *Mục đích*: Test ca thông qua. Có đủ 3 tài liệu `00-vision.md`, `01-personas.md`, và `02-scope.md`.
    *   *Kết quả mong đợi*: Gate `scope-locked` được mở, cho phép AI sử dụng công cụ code/build bình thường.

---

## Nguồn tài liệu mẫu đầu ra đầy đủ (Golden Examples)
Để tham chiếu toàn bộ nội dung tài liệu đầu ra đầy đủ (bao gồm cả mỏ neo truy vết ẩn), vui lòng xem tại các thư mục chuẩn vàng:
*   [golden-example-web/](../../Design/Content/golden-example-web/)
*   [golden-example-mobile/](../../Design/Content/golden-example-mobile/)
