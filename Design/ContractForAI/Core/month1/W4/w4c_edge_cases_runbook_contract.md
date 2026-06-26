# Contract — W4C Ca biên + runbook + backlog

> **Tầng:** Adapter/integration + process. Nguồn: [Week-04](../../../../RoadMap/Month1/Week-04.md) + [QualityRubric.md](../../../../Content/QualityRubric.md) + claude-code.md §"Ca biên".

## 1. Micro-task target
Làm cứng phiên web với ca người dùng "không đẹp", chấm output theo rubric, viết runbook tái lập, và lập backlog lỗi chỉ giữ thứ chặn Month 2.

## 2. Scope
**In scope**
- Thử ≥3 ca biên: (a) trả lời lan man chưa xác nhận → state đứng yên (không advance); (b) cố trả lời nhiều câu/lượt → chỉ một bước, hook chặn nếu skill cố commit > 1; (c) "đổi nhánh" sau S6 → không rollback ngầm.
- Chấm output web theo QualityRubric, ghi điểm.
- `RUNBOOK-web.md`: chuẩn bị gì, chạy lệnh nào, mong đợi gate chặn/mở ở đâu, output ra sao.
- `backlog-month1.md`: lỗi/thiếu sót đã phân loại — cái phải sửa Month 2 vs ý tưởng để sau.

**Out of scope**
- Sửa lỗi không chặn Month 2 (đưa vào backlog). Mobile.

## 3. Checklist
- [ ] 3 ca biên có kết quả ghi lại, đúng kỳ vọng hai lớp (skill/hook).
- [ ] Output web đạt QualityRubric mức reference; có bảng điểm.
- [ ] `RUNBOOK-web.md` đủ để tự tái lập demo mà không "nhớ bằng đầu".
- [ ] `backlog-month1.md` phân loại rõ chặn/không-chặn Month 2.

## 4. Interfaces / Files expected to change
- `[NEW]` `test/e2e/web-edge-cases.test.ts`
- `[NEW]` `RUNBOOK-web.md`
- `[NEW]` `Design/RoadMap/Month1/backlog-month1.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Coi "đủ tính năng" = "đủ ổn" | TB | Bắt buộc qua ca xấu trước khi đóng mốc. |
| Backlog phình thành việc Month 2 | TB | Chỉ giữ lỗi chặn mốc; còn lại đánh dấu "để sau". |

## 6. Verification plan
- Ca (a)(b)(c) cho kết quả đúng mô hình hai lớp (state không nhảy cóc).
- Một người theo `RUNBOOK-web.md` tái lập được demo.

## 7. Status
`WAITING_FOR_APPROVAL`
