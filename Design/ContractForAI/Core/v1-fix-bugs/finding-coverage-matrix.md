# Finding Coverage Matrix

> Mỗi finding có một contract primary chịu trách nhiệm sửa và ít nhất một contract QA chịu trách nhiệm chứng minh. “Corrected” là hiệu chỉnh review, không phải bug cần code.

| ID | Phát hiện đã xác minh | Primary contract | Proof contract |
|---|---|---|---|
| U01 | Installer Claude thiếu deepen-script.yaml | B4d | B5a |
| U02 | /design-everything không bàn giao rõ sang /build | B1c, B4f | B5c |
| U03 | Thông điệp “gate đã mở/code được” trái hook | B4c, B4f | B5c |
| U04 | docs-emitted fail-open nhưng ready-to-build lại deny | B1c, B4a | B5a |
| U05 | Answer/slot whitespace, generic, Must rỗng vẫn lọt | B3a | B5c |
| U06 | Build-plan/rationale/glossary/mermaid dẫn xuất thiếu quality/provenance gate | B3b | B5c |
| U07 | ENGINE_ROOT tuyệt đối, dist build sẵn và không pin/integrity | B4d | B5a |
| U08 | Quickstart trộn simulation với journey thật | B5d | B5c |
| X01 | TURN_ID do caller tự đặt nên commit nhiều bước cùng user turn | B1a | B5a |
| X02 | Hook cho ghi thẳng state/docs/policy và pre-create managed docs | B2a, B4a | B5a |
| X03 | Wrapper allow command chỉ vì chứa substring adapter CLI | B4b | B5a |
| X04 | git/find được coi read-only theo basename dù có lệnh phá hủy | B2b | B5a |
| X05 | Thiếu progress.json làm wrapper fail-open như project chưa cài | B2e, B4a | B5a |
| X06 | blocked conflates validation và execution failure; validate gỡ nhầm block | B1d | B5a |
| X07 | Glob matcher tự chế sai dấu chấm, metachar và double-star | B2c | B5a |
| X08 | Commit lưu progress rồi answers, có thể partial | B1b | B5b |
| X09 | validate fail nhưng CLI có thể exit 0; warning severity không khóa | B4c | B5a |
| X10 | Gate so basename nên docs/archive có thể giả artifact | B2d | B5a |
| X11 | gates_passed append-only, không revoke khi artifact đổi/xóa | B2d | B5a |
| X12 | slots-file đọc path tùy ý, key tùy ý, overwrite raw/step khác | B3a | B5a |
| X13 | Rerun installer không thay hook stale vì match includes quá rộng | B4d | B5a |
| X14 | emit output gắn docs/ sai cho execution-plan | B3c, B4c | B5a |
| X15 | status/next-step nuốt state/plan/profile corruption | B2e, B4c | B5a |
| X16 | Emit nhiều write trước validation, crash để lại partial/stale files | B3d | B5b |
| X17 | Deepen chưa khóa phase tier-1 và chưa dùng capability một-lượt | B3e | B5a |
| X18 | Test hiện hành chưa chạy installer/wrapper/adversarial thật | B5a | B5d |
| X19 | Hai CLI Claude/Codex copy logic dễ drift | B4e | B5a |
| X20 | README/quickstart/glossary/conformance drift về câu hỏi, count, version | B3c, B5d | B5c |
| X21 | Gate artifact chỉ kiểm existence, không non-empty/content integrity | B2d | B5a |
| X22 | Re-emit có thể để file managed cũ nhưng không được xóa user-owned docs | B3d | B5b |
| X23 | Derived quality hiện phó thác executor yếu và không có user-visible acknowledgement | B3b, B4f | B5c |
| X24 | Deepen asset/runtime parity giữa Claude và Codex chưa được packaging guarantee | B4d, B4e | B5a |

## Hiệu chỉnh review, không mở bug riêng

| ID | Hiệu chỉnh | Cách giữ đúng |
|---|---|---|
| C01 | Runtime interview còn có câu nhánh W/M/C; hybrid dùng hai nhánh | B3c sinh journey manifest; B5d sync docs từ manifest |
| C02 | Output hiện là 12 docs cho web/mobile/CLI, 13 cho hybrid, cộng conventions và execution-plan | B3c bỏ count viết tay; B5d kiểm public docs |
| C03 | deepen-script.yaml đang tracked | Không yêu cầu git-add; U01 chỉ sửa packaging copy/integrity |

## Điều kiện đóng matrix

- Một finding chỉ chuyển CLOSED khi primary contract có unit/component evidence và proof contract có test ở seam thật.
- Không chấp nhận “test Core pass” thay cho installer/wrapper test đối với finding Adapter.
- Không chấp nhận snapshot text đơn thuần cho state transition, exit code, filesystem transaction hoặc security classifier.
