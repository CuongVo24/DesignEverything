# Contract — W11A Mài S3 (Must/Should/Could) + default + translate_back theo phản hồi thật

> **Tầng:** Nội dung. Nguồn: [Week-11](../../../../RoadMap/Month3/Week-11.md) + [pain-rank](../../../../RoadMap/Month3/dogfood/pain-rank.md) + [interview-script](../../../../Content/interview-script/) ([script.yaml](../../../../Content/interview-script/script.yaml), [S0-S6-core](../../../../Content/interview-script/S0-S6-core.md)). Phụ thuộc: [W10B](../W10/w10b_measurement_report_painrank_contract.md) `DONE`.

## 1. Micro-task target
Sửa **các điểm vướng tần suất × tác động cao nhất** trong `Content/` — ưu tiên logic **S3 (Must/Should/Could)**, **default thông minh sai**, và **câu translate_back lệch** — đúng tại file nguồn (không vá output/golden). Đây là tuần biến dữ liệu thật thành sản phẩm tốt hơn, ưu tiên gỡ chỗ chặn người mới hiểu, không tối ưu tiểu tiết câu chữ.

## 2. Scope
**In scope** — chỉ tầng `Content/`:
- Mài lại logic S3 (Must/Should/Could) theo case thật trong [S0-S6-core.md](../../../../Content/interview-script/S0-S6-core.md) + [script.yaml](../../../../Content/interview-script/script.yaml).
- Sửa default thông minh sai và câu `translate_back` lệch (đúng các mục `pain-rank` xếp top).
- Mỗi sửa ghi 1 dòng "vì phản hồi từ proj-0N" để truy nguồn.

**Out of scope**
- KHÔNG đụng schema/version trừ khi dữ liệu thật **buộc** đổi hợp đồng → nếu buộc thì DỪNG, ghi vào DecisionLog ở [W11B](w11b_golden_sync_decisionlog_smoke_contract.md), không tự đổi schema ở đây.
- KHÔNG đổi `{{placeholder}}` keys mà [emit.ts](../../../../../src/core/emit.ts) đang map (vỡ emit).
- KHÔNG cập nhật golden/rubric ở đây (W11B làm, để tách "sửa nguồn" khỏi "đồng bộ").
- KHÔNG mở rộng taxonomy (W12).

## 3. Checklist
- [ ] Top mục `pain-rank` (tần suất cao) đã xử lý ở đúng file nguồn `Content/`, không vá output.
- [ ] Logic S3 Must/Should/Could vẫn là trung tâm giá trị, không bị mài mòn thành mờ nhạt.
- [ ] Default sai + translate_back lệch đã sửa, mỗi cái truy được về proj nguồn.
- [ ] Placeholder keys **không đổi** (parity emit.ts). Schema **không đổi** (nếu phải đổi → để W11B quyết).

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/interview-script/script.yaml`
- `[MODIFY]` `Design/Content/interview-script/S0-S6-core.md` (và `W-web.md`/`M-mobile.md` nếu mục đau thuộc nhánh)
- Không đổi code, không đổi schema, không đổi golden (W11B).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Vá output/golden mà quên sửa nguồn `Content/` | Cao | Contract này **chỉ** cho sửa `Content/`; đồng bộ golden tách sang W11B. |
| Đổi schema quá sớm để vá 1 lỗi nội dung | Cao | Schema bất biến ở đây; nhu cầu đổi → DỪNG, đẩy lên W11B/DecisionLog. |
| Mài S3 nhiều lần thành mờ nhạt | TB | Checklist riêng giữ Must/Should/Could là trung tâm; review lại sau sửa. |
| Đổi placeholder làm vỡ emit | Cao | Khoá danh sách key từ emit.ts; chỉ sửa văn xung quanh. |

## 6. Verification plan
- `npx vitest run loadScript` — script.yaml vẫn parse đúng schema (không vỡ hợp đồng).
- `npx vitest run emit` — placeholder không vỡ, emit vẫn ra nội dung đúng.
- `npm test` — xanh (golden có thể đỏ tạm vì chưa đồng bộ → đó chính là việc W11B; ghi rõ test golden nào đỏ để W11B đóng).

## 7. Status
`WAITING_FOR_APPROVAL`
