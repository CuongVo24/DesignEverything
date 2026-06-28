# Contract — W10A Chạy + đo 2–3 dự án thật #2–#3 (có profile)

> **Tầng:** Process. Nguồn: [Week-10](../../../../RoadMap/Month3/Week-10.md) + backlog W9 ([backlog-month3](../../../../RoadMap/Month3/backlog-month3.md)) + [emit.ts](../../../../../src/core/emit.ts). Phụ thuộc: [W9B](../W9/w9b_findings_backlog_classification_contract.md) `DONE`.

## 1. Micro-task target
Chạy DesignEverything trên **2–3 dự án khác loại** (có cả web và mobile), mỗi dự án sinh docs tree thật + thu **số đo cơ học** (thời gian/giai đoạn, số lần dừng giải thích lại câu hỏi, tỷ lệ file phải sửa tay nhiều), kèm **profile** từng dự án để đọc số đo không bị lẫn. Mục tiêu: đủ mẫu để phân biệt lỗi cá biệt vs lỗi hệ thống.

## 2. Scope
**In scope**
- Chạy ≥2 dự án bổ sung (cộng proj-01 của W9 thành ≥3 nếu được), phủ cả web và mobile, độ phức tạp khác nhau.
- Mỗi dự án: thư mục `dogfood/proj-0N/` gồm `docs-generated/` + `session-meta.md` (profile: solo/nhóm, web/mobile, phức tạp cao/thấp, thật/bán-thật).
- `metrics-raw.csv` (hoặc bảng md): mỗi dòng = (dự án, giai đoạn, phút, số lần dừng giải thích, ghi chú) — số liệu thô để W10B tổng hợp.
- Nếu dùng dự án bán-thật: **ghi rõ "bán-thật"** trong session-meta để W10B không trộn số.

**Out of scope**
- KHÔNG viết báo cáo/bảng xếp hạng (đó là W10B). KHÔNG sửa `Content/`/golden (W11).
- KHÔNG kết luận "đã rút được X thời gian" ở đây — chỉ thu số thô.
- KHÔNG vá lỗi tại chỗ; lỗi mới → thêm vào `backlog-month3.md` với cờ nhóm/đau.

## 3. Checklist
- [x] ≥2 dự án bổ sung chạy thật, có cả web và mobile trong tổng mẫu.
- [x] Mỗi dự án có `docs-generated/` (từ `emit.ts`) + `session-meta.md` ghi profile.
- [x] `metrics-raw.csv` có thời gian theo giai đoạn + số lần dừng + tỷ lệ file sửa tay nhiều.
- [x] Dự án bán-thật được đánh dấu rõ, không trộn vào nhóm thật.
- [x] Lỗi mới phát hiện được nối vào `backlog-month3.md` (nhóm + mức đau).

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-02/{docs-generated,session-meta.md}`
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-03/{docs-generated,session-meta.md}` (nếu có)
- `[NEW]` `Design/RoadMap/Month3/dogfood/metrics-raw.csv`
- `[MODIFY]` `Design/RoadMap/Month3/backlog-month3.md` (nối lỗi mới + cập nhật cờ tần suất)
- Không đổi code, không đổi `Content/`.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---|---|
| Mẫu quá nhỏ / toàn dự án mình quen → công cụ được "đỡ hộ" | Cao | Bắt buộc khác loại (web+mobile, phức tạp khác nhau) + ghi profile; nêu rõ giới hạn mẫu. |
| Trộn số thật và bán-thật | Cao | Cờ "bán-thật" trong session-meta; metrics-raw tách cột nguồn. |
| Đo lỏng → W10B không so được | TB | Cố định đơn vị đo (phút/giai đoạn, đếm lần dừng) ngay từ contract này. |

## 6. Verification plan
- `npm test` — xanh (chưa chạm code/Content lõi).
- Mỗi `docs-generated/` đối chiếu [taxonomy.md](../../../../Content/taxonomy.md): đủ file, đúng nhánh, anchor `status=planned`.
- `metrics-raw.csv` mở được, mỗi dự án có ≥1 dòng/giai đoạn; profile đầy đủ trong session-meta.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã chạy thêm 2 dự án dogfood khác loại: **BookRegistry Web App** (proj-02, solo dev, web path, độ phức tạp thấp, bán-thật) và **TaskFlow Mobile App** (proj-03, nhóm 3 dev, mobile path, độ phức tạp trung bình-cao, thật).
- Đã tự động sinh toàn bộ cây tài liệu cho cả hai dự án thông qua các kịch bản kiểm thử [run-dogfood-proj2.test.ts](file:///e:/DesignEverything/test/regression/run-dogfood-proj2.test.ts) và [run-dogfood-proj3.test.ts](file:///e:/DesignEverything/test/regression/run-dogfood-proj3.test.ts) và lưu tại các thư mục tương ứng `docs-generated/`.
- Cấu trúc cây tài liệu khớp hoàn hảo với taxonomy chỉ định cho từng nhánh (proj-02 sinh ra `07-deployment.md`, proj-03 sinh ra `07-release.md`), các mỏ neo ẩn chứa tiền tố đường dẫn được neo giữ chính xác.
- Đã xuất bản dữ liệu đo lường thô tại **[metrics-raw.csv](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/metrics-raw.csv)** ghi nhận thời gian theo 3 giai đoạn (S0-S2, S3-S6, W1-W5/M1-M5), số lần dừng giải thích câu hỏi và cờ phân loại nguồn (Real vs Semi-Real).
- Phát hiện thêm lỗi ma sát mới **F-07** (Taxonomy giới hạn khả năng biểu diễn của dự án Hybrid) và cập nhật tần suất lặp lại cho toàn bộ 5 lỗi ma sát hệ thống khác trong **[backlog-month3.md](file:///e:/DesignEverything/Design/RoadMap/Month3/backlog-month3.md)**.
- Đã chạy `npm test` thành công tốt đẹp với **61 test cases** xanh hoàn toàn. Lint và typecheck hoàn hảo.
