# Brownfield Prep 02 — Giao thức Golden Corpus (D51 đề xuất)

> Trạng thái: tài liệu chuẩn bị. Định nghĩa cách dùng ba dự án đã có docset tay (DesignEverything, ReportSupport, Univillage) làm ground truth — cho cả eval tầng 2 greenfield (B21b dùng phần DE) lẫn lane brownfield tương lai.

## Tại sao cần file này

Mọi tool sinh doc đều tự khen được. Cái hiếm là **ground truth**: bộ tài liệu chi tiết viết tay, bởi chính người chủ phương pháp, cho dự án thật. Chúng ta có ba bộ. File này biến lợi thế đó thành giao thức đo lặp lại được, để "chất lượng" là con số + review có cấu trúc, không phải cảm giác.

## Nguyên tắc đo

1. **Freeze trước khi đo.** Chốt một commit của docset tay làm reference (`ref-sha`); bản sinh không được nhìn thấy reference trong lúc sinh (chống học vẹt).
2. **Đo hai lớp:** máy đo cấu trúc (rẻ, lặp lại được), người đo chất lượng theo rubric B19a (đắt, làm theo mẫu ngẫu nhiên).
3. **Trung thực hơn đầy đủ.** Khối `unknown — cần hỏi người` là kết quả TỐT (đúng fail-closed); khối bịa nguồn là fail nặng nhất, một khối bịa đáng giá hơn mười khối thiếu.

## Ba số liệu chuẩn (dùng chung mọi lần đo)

| Số liệu | Cách tính | Ngưỡng khởi điểm |
|---|---|---|
| Structural coverage | % mục trong bảng ánh xạ golden-map có mặt ở bản sinh | ≥70% (chốt lại sau lần đo đầu) |
| Grounding rate | % khối nội dung cite được nguồn (answers id, doc tầng 1, file:line, hoặc cờ `unknown` hợp lệ) | 100% — không thương lượng |
| Hallucinated-rationale | Số câu "vì sao/bởi vì/để" không truy được nguồn và không mang cờ | 0 — không thương lượng |

## Quy trình cho MỖI dự án trong corpus

1. **Kiểm kê** (điền bảng dưới): đường dẫn repo, stack, quy mô (file/LOC), trạng thái docset tay (đủ mục nào, cập nhật lần cuối), `ref-sha`.
2. **Dựng golden-map**: bảng ánh xạ mục-tay ↔ khối-sinh (mẫu: `test/fixtures/de-golden-map.json` của B21b). Manager duyệt map TRƯỚC khi đo. Ghi rõ mục cố ý không map + lý do.
3. **Chạy pipeline** (greenfield: từ fixture answers; brownfield: từ inventory→draft→confirm) → sinh docset.
4. **Đo máy** 3 số liệu; **review tay** ≥5 khối ngẫu nhiên theo rubric.
5. **Ghi báo cáo** vào `Design/RoadMap/evidence/` (một file mỗi lần đo, có ngày + sha + số liệu + ví dụ tốt/xấu + kết luận đạt/không).

## Bảng kiểm kê corpus (điền khi mở lane — hiện mới có DE)

| Mục | DesignEverything | ReportSupport | Univillage |
|---|---|---|---|
| Đường dẫn repo | `E:\DesignEverything` | ⏳ chủ repo cung cấp | ⏳ chủ repo cung cấp |
| Stack | Node/TS | ⏳ (dự kiến Node/TS — D10 nhắc "cùng hệ ReportSupporter") | ⏳ |
| Quy mô | ~56 test file, engine + 2 adapter | ⏳ | ⏳ |
| Docset tay | `Design/` đầy đủ (PRD, Glossary, DecisionLog, Contract lane, RoadMap) | ⏳ kiểm kê mức độ | ⏳ kiểm kê mức độ |
| `ref-sha` | chốt khi đo | ⏳ | ⏳ |
| Vai trò | Eval (a) tại B21b + ca brownfield dễ nhất | Ca brownfield thật #1 | Ca brownfield thật #2 |

## Thứ tự dùng corpus

1. **B21b (lane này):** chỉ DE, chỉ đường greenfield-fixture — đo chất lượng render (a).
2. **Mở lane brownfield:** DE chạy đường inventory→confirm đầy đủ (người xác nhận là chính chủ repo — vòng lặp khép kín nhanh).
3. **ReportSupport rồi Univillage:** mỗi dự án một báo cáo; chỉ claim "brownfield hoạt động" sau khi CẢ HAI đạt ngưỡng — một dự án là anecdote, hai mới là mẫu (nối tinh thần D40/D47: claim khoá sau bằng chứng đa quy mô).

## Chống gian lận đo (tự dặn mình)

- Không sửa golden-map sau khi thấy số (map đổi = đo lại từ đầu, ghi lý do).
- Không thêm nội dung tay vào bản sinh trước khi đo.
- Fixture answers phải cite nguồn (B21b checklist) — reviewer đối chiếu xác suất.
- Số xấu là dữ liệu quý: ghi nguyên vẹn vào evidence, không "đo lại cho đẹp".
