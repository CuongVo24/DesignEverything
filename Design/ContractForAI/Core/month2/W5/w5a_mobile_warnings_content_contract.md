# Contract — W5A Cảnh báo M2 (offline/sync) + M5 (store) trong script

> **Tầng:** Nội dung. Nguồn: [Week-05](../../../../RoadMap/Month2/Week-05.md) §"2 bẫy M2/M5" + [M-mobile interview-script](../../../../Content/interview-script/M-mobile.md) + [QualityRubric](../../../../Content/QualityRubric.md) §D + [backlog-month1](../../../../RoadMap/Month1/backlog-month1.md) §1.1–1.2.

## 1. Micro-task target
Bổ sung wording cảnh báo bắt buộc vào `translate_back` của hai câu mobile trong `script.yaml`: **M2** làm rõ chi phí offline/sync tăng mạnh, **M5** làm rõ quy trình review/ký app/phí developer. Cảnh báo phải hiện như **quyết định sản phẩm**, không phải ghi chú kỹ thuật lạc điệu.

## 2. Scope
**In scope** — `Design/Content/interview-script/script.yaml` (chỉ 2 câu M2, M5):
- M2: thêm vào `translate_back`/`warning` câu cảnh báo: chọn offline/sync → độ phức tạp + chi phí phát triển tăng đáng kể (đồng bộ xung đột, hàng đợi, trạng thái cục bộ). Hiện **trước khi** chốt kiến trúc.
- M5: thêm cảnh báo: phát hành Store cần review của Apple/Google, ký ứng dụng (App Signing), phí Developer — "code xong ≠ có app trên store".
- Wording tiếng Việt, giọng người-mới-hiểu, ngắn; bám phong cách golden mobile.

**Out of scope**
- KHÔNG đổi schema `interview-script` (chỉ điền nội dung field đã có). KHÔNG đụng câu S0–S6/W1–W5.
- KHÔNG viết code logic hiển thị (đó là W5B: skill inject đọc `translate_back`/`warning` đã có sẵn cơ chế).
- KHÔNG sửa template `05-architecture.md`/`07-release.md`.

## 3. Checklist
- [x] M2 có cảnh báo offline/sync rõ chi phí, đặt ở `translate_back`/`warning`.
- [x] M5 có cảnh báo review + signing + phí developer.
- [x] `loadScript` vẫn validate xanh (zod không vỡ vì field mới đúng schema).
- [x] Wording khớp tinh thần QualityRubric §D (thực tế, không bán quá lời).
- [x] Đối chiếu golden-example-mobile để giọng nhất quán.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/interview-script/script.yaml` (2 câu M2, M5 — chỉ field text)
- Không thêm file code.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Cảnh báo ra quá muộn (sau khi user "chốt") | Cao | Đặt trong `translate_back` của chính M2/M5 → hiện ngay tại bước, trước xác nhận. |
| Cảnh báo nghe như note kỹ thuật lạc điệu | TB | Viết dạng "quyết định sản phẩm + đánh đổi", bám golden mobile. |
| Field mới làm vỡ zod schema | TB | Chỉ điền field đã khai báo; chạy `loadScript` test. |

## 6. Verification plan
- `npx vitest run loadScript` — script.yaml vẫn parse/validate xanh.
- Đọc thủ công M2/M5 đối chiếu QualityRubric §D + golden mobile.
- `npm test` — không vỡ test cũ.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã chỉnh sửa trực tiếp nội dung `translate_back` của 2 câu hỏi Mobile trong **[script.yaml](file:///e:/DesignEverything/Design/Content/interview-script/script.yaml)**:
  - **M2 (offline/sync)**: Tích hợp cảnh báo trực quan bằng tiếng Việt về việc độ phức tạp và chi phí phát triển tăng đáng kể (gấp đôi do phải viết thêm các cơ chế lưu trữ nội bộ, đồng bộ hàng đợi, đồng bộ dữ liệu chéo và phân giải xung đột).
  - **M5 (store)**: Tích hợp cảnh báo thực tế rõ ràng "Code xong ≠ Có app trên Store" — bắt buộc chuẩn bị các khâu ký ứng dụng (App Signing), phí tài khoản Apple/Google Developer hàng năm và tuân thủ quy trình xét duyệt (review) kiểm duyệt chặt chẽ của các hãng.
- Đảm bảo định dạng text thô của tệp YAML chuẩn xác, không tạo thêm field mới nằm ngoài Zod schema của `interviewScript`.
- Chạy `npx vitest run loadScript` và toàn bộ suite `npm test` xanh sạch 100% (47 tests).
- Ngữ điệu các cảnh báo mang tính quyết định sản phẩm chân thực, bám sát Rubric chất lượng §D và mẫu golden-example-mobile.
