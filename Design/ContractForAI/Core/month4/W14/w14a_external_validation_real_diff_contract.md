# Contract — W14A Validation người dùng thật bên ngoài + diff cơ học đủ cho 3 dự án

> **Tầng:** Process. Nguồn: review Month 3 + [measurement-report](../../../../RoadMap/Month3/dogfood/measurement-report.md) (confidence tự đánh THẤP–TB) + [metrics-raw.csv](../../../../RoadMap/Month3/dogfood/metrics-raw.csv) + [proj-01 docs-diff](../../../../RoadMap/Month3/dogfood/proj-01/docs-diff.md) (mẫu duy nhất có diff thật). Phụ thuộc: [W13D](../W13/w13d_readme_onboarding_packaging_contract.md) `DONE` (cần quickstart để người ngoài tự chạy).

## 1. Micro-task target
Nâng độ tin cậy số đo từ "self-dogfood mỏng" lên mức đủ tuyên bố mốc **Đáng chia sẻ**: chạy ≥1 phiên với **người dùng thật bên ngoài tác giả** (không biết trước cấu trúc câu hỏi), và bổ sung **diff cơ học** (`docs-generated` vs `docs-handfixed`) cho **cả proj-02 và proj-03** — hiện chỉ proj-01 có diff thật, nên cột "% sửa tay" của 2/3 dự án đang là ước lượng cảm tính, ngược cam kết [Month 3 contract](../../README.md) ("số đo cơ học, không cảm giác ổn").

## 2. Scope
**In scope** — tầng Process/đo lường:
- Mời ≥1 người ngoài chạy quickstart trên 1 dự án của họ; ghi `session-meta` (ai, mức quen công cụ, dự án gì) + friction-log + thời gian theo cùng format proj-01.
- Tạo `docs-handfixed/` + `docs-diff.md` **cơ học** cho proj-02 và proj-03 (đối chiếu generated vs sửa-tay), tính lại "% sửa tay" từ diff thật.
- Cập nhật [measurement-report.md](../../../../RoadMap/Month3/dogfood/measurement-report.md): thay ước lượng bằng số đo cơ học; nâng/điều chỉnh mục confidence nêu rõ điều gì còn yếu (cỡ mẫu, learning effect ở smoke proj-01).
- Cập nhật [metrics-raw.csv](../../../../RoadMap/Month3/dogfood/metrics-raw.csv) thêm dòng phiên người-ngoài.

**Out of scope**
- KHÔNG sửa `Content/`/code theo phản hồi mới ở đây — friction mới chỉ **ghi nhận** vào backlog Month 4, vá ở break_task/tuần sau (giữ đo tách khỏi sửa).
- KHÔNG bịa người dùng: nếu **không** mời được người ngoài trong tuần → đặt `BLOCKED`, ghi rõ, KHÔNG thay bằng self-run rồi gọi là "external".

## 3. Checklist
- [ ] ≥1 phiên người-ngoài có session-meta + friction-log + thời gian (format proj-01).
- [ ] proj-02 và proj-03 có `docs-handfixed/` + `docs-diff.md` cơ học; "% sửa tay" tính từ diff, không ước lượng.
- [ ] measurement-report thay số ước lượng bằng số đo; mục confidence nêu rõ giới hạn còn lại.
- [ ] metrics-raw.csv có dòng phiên người-ngoài.
- [ ] Friction mới (nếu có) vào backlog Month 4, không tự sửa ở đây.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-02/docs-handfixed/*` + `docs-diff.md`
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-03/docs-handfixed/*` + `docs-diff.md`
- `[NEW]` thư mục phiên người-ngoài (vd `proj-04-external/`) với session-meta + friction-log + docs-generated
- `[MODIFY]` `measurement-report.md`, `metrics-raw.csv`
- `[NEW/MODIFY]` `Design/RoadMap/Month4/backlog-month4.md` (friction mới nếu có)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Không mời được người ngoài → giả mạo "external" | Cao | Cấm thay bằng self-run; thiếu thì `BLOCKED` trung thực. |
| Diff làm qua loa thành lại ước lượng | TB | Diff phải cơ học (so file-với-file), số "% sửa tay" suy ra từ dòng đổi. |
| Sa vào sửa Content khi đang đo | TB | Scope cấm sửa; friction mới chỉ ghi backlog. |

## 6. Verification plan
- Review thủ công: 3 dự án cũ đều có `docs-diff.md`; số "% sửa tay" trong report khớp diff.
- Có ≥1 phiên external truy được danh tính/bối cảnh trong session-meta (hoặc `BLOCKED` có lý do).
- `npm test` xanh (artifact đo không đụng code).

## 7. Status
`WAITING_FOR_APPROVAL`
