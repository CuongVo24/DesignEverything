# Interview Cadence — báo cáo số lượt theo batch (B24f, thay thế báo cáo 8.1)

> Nguồn đo: [test/journey/interactive-cards-turn-count.test.ts](../../../test/journey/interactive-cards-turn-count.test.ts)
> (giữ nguyên tên file — cùng vị trí, nội dung viết lại theo D60 ở B24f). Chạy
> `npx vitest run test/journey/interactive-cards-turn-count.test.ts` để tái tạo. Số liệu đo qua
> state machine thật (`commitStep` + `computeBatch`, B24b) đi hết hành trình web và cli canonical,
> không phải mô hình hoá kích thước batch.

## Đối tượng đo

Hành trình web canonical: `CAL0, S0–S7, R1, S8, W1–W5` (16 câu) và hành trình cli canonical:
`CAL0, S0–S7, R1, S8, C1–C5` (16 câu). Cả hai đi qua `commitStep` thật, token phát bằng
`issueTurnCapability` **một lần cho mỗi batch** (không phải một lần cho mỗi câu) — đúng khuôn sản
xuất thật của `issuePromptCapability` (`interviewApplicationServices.ts`).

## Định nghĩa

- **Một lượt (turn)** = một lần gọi `issueTurnCapability` cho một batch mới — tức một lần
  `issuePromptCapability` phải chạy trong sản xuất (D60, khác định nghĩa cũ của báo cáo 8.1: "một
  lượt = một commit").
- **Một batch** = danh sách `question_ids` do `computeBatch(progress, script)` tính, agent không tự
  chọn (xem thuật toán ở [InterviewCadencePlan.md](../InterviewCadencePlan.md) §5).

## Kết quả đo

| Chỉ số | Web | CLI | Nguồn |
|---|---:|---:|---|
| Tổng số câu | 16 | 16 | test, khớp hành trình canonical mỗi nhánh |
| Tổng số lượt commit (D54, không đổi) | 16 | 16 | mỗi câu vẫn đúng một `commitStep` |
| **Tổng số turn (D60, batch)** | **10** | **10** | test, đếm số lần `issueTurnCapability` phát cho batch mới |
| Giảm turn so với "một lượt một câu" trước 8.2 | **37.5%** (`Math.round` → 38%) | 38% | `Math.round((1 - 10/16) * 100)` |

Batch thực tế (web):

```
[CAL0,S0] [S1] [S2] [S3] [S4] [S5] [S6,S7] [R1,S8] [W1,W2,W3,W4] [W5]
```

Batch thực tế (cli) — giống hệt 8 batch đầu (phần core), khác 2 batch cuối:

```
[CAL0,S0] [S1] [S2] [S3] [S4] [S5] [S6,S7] [R1,S8] [C1,C2,C3,C4] [C5]
```

## Vì sao đây KHÔNG phải con số cuối cùng cho release note

Con số 16→10/38% đo đúng **cơ chế Core** (`computeBatch`/`commitStep`) — không đo trải nghiệm người
dùng thật trong Claude Code. Batch nhiều-hơn-một-câu đòi hỏi agent gọi `status --json` giữa các lần
commit **mà không cần** `UserPromptSubmit` mới. Đây chính xác là giả định mà R-spike
([r-spike-userpromptsubmit-probe.md](../../ContractForAI/Core/v7-expansion/r-spike-userpromptsubmit-probe.md))
còn đang treo (trả lời một thẻ `AskUserQuestion` có bắn `UserPromptSubmit` không). Nếu R-spike phát
hiện trả lời thẻ **có** bắn `UserPromptSubmit`, con số turn thật trong một phiên Claude Code thật có
thể khác 10 — cần đo lại bằng một phiên thật, không phải suy ra từ con số này.

## Giới hạn

- Đo trên hành trình canonical duy nhất mỗi nhánh (không dùng Other, không timeout, không hoàn tác
  giữa chừng bằng `undo`).
- Không đo độ trễ hay trải nghiệm thẻ thật — đó là phạm vi R-spike.
- `golden-web.test.ts`/`golden-mobile.test.ts` không đo lượt — test riêng, không phải mở rộng của
  báo cáo này.
- Thay thế hoàn toàn báo cáo cũ
  [interactive-cards-turn-count-report.md](interactive-cards-turn-count-report.md) (số 32/5/84% đo
  một cơ chế — thẻ xác nhận dịch ngược — đã bị D59 gỡ bỏ khỏi build hiện tại).
