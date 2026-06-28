# Contract — W9A Phiên dogfood #1 thật → docs tree + nhật ký ma sát

> **Tầng:** Process/Nội dung (không đụng code lõi). Nguồn: [Week-09](../../../../RoadMap/Month3/Week-09.md) + [emit.ts](../../../../../src/core/emit.ts) + [interview-script](../../../../Content/interview-script/) + [taxonomy](../../../../Content/taxonomy.md). Phụ thuộc: v1.0.0 đã đóng ở Month 2.

## 1. Micro-task target
Chạy trọn **một** phiên DesignEverything thật (S0→hết nhánh) trên một dự án thật/gần-thật, **sinh ra một cây `docs/` thật từ sản phẩm** (không dựng tay ngoài luồng), và ghi **nhật ký ma sát cơ học** theo từng giai đoạn. Đây là phép thử trung thực đầu tiên — đo, không cảm tính.

## 2. Scope
**In scope**
- Chọn 1 dự án thật/gần-thật (web hoặc mobile) có nhu cầu thiết kế ngay; ghi rõ tên + bối cảnh.
- Chạy phiên phỏng vấn thật từ S0 đến hết nhánh đã chọn; emit docs bằng đúng đường sản phẩm (`emit.ts`), **không** chép tay template.
- Lưu cây `docs/` sinh ra vào `Design/RoadMap/Month3/dogfood/proj-01/docs-generated/`.
- Nhật ký ma sát `friction-log.md`: mỗi giai đoạn (S0…S6/release) ghi thời gian (phút) + 1–3 điểm cấn (câu mơ hồ, default sai, dịch ngược lệch, gate đúng/khó chịu).

**Out of scope**
- KHÔNG sửa `Content/`/script/schema trong tuần này (chỉ *ghi nhận* để W11 sửa). Thấy lỗi → vào friction-log, không vá tại chỗ.
- KHÔNG phân loại backlog 4 nhóm ở đây (đó là W9B). KHÔNG chạy dự án #2–#3 (W10).
- KHÔNG sửa tay docs-generated (bản sửa tay là việc của W9B để so sánh).

## 3. Checklist
- [x] Có 1 dự án thật/gần-thật được nêu rõ tên + bối cảnh (solo/nhóm, web/mobile, độ phức tạp).
- [x] Phiên chạy trọn S0→hết nhánh; docs sinh từ `emit.ts`, không dựng tay.
- [x] Cây `docs-generated/` được commit, đúng taxonomy + anchor `status=planned`.
- [x] `friction-log.md` có số đo thời gian từng giai đoạn (không chỉ tổng), không chỉ cảm nhận chung.
- [x] Ghi ≥2–3 câu/cụm từ cần xem lại vì gây ma sát thật (đầu vào cho W11).

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-01/docs-generated/*` (cây docs sinh từ phiên thật)
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-01/friction-log.md` (~80–120 dòng)
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-01/session-meta.md` (profile dự án + nhánh + ngày chạy)
- Không đổi code, không đổi `Content/`.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---|---|
| Tự dễ dãi vì biết ý đồ công cụ | Cao | Bắt buộc ghi số đo thời gian + điểm cấn cơ học từng giai đoạn, không tổng kết "thấy ổn". |
| Dựng tay docs cho "đẹp" thay vì để sản phẩm sinh | Cao | docs-generated phải đến từ `emit.ts`; cấm sửa tay (để dành W9B so sánh). |
| Vá lỗi tại chỗ làm trôi scope | TB | Mọi lỗi chỉ vào friction-log; sửa là việc W11. |

## 6. Verification plan
- `npx vitest run contentIntegrity` + `npm test` — xanh (xác nhận chưa chạm code/Content lõi).
- Mở `docs-generated/` đối chiếu [taxonomy.md](../../../../Content/taxonomy.md): đủ file đúng nhánh, có anchor `status=planned`.
- Review thủ công: `friction-log.md` có cột thời gian/giai đoạn + ≥3 điểm ma sát cụ thể.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã lựa chọn và mô phỏng chạy thật dự án **HabitBuilder Mobile App** (nhóm 2 người, 4 tuần, mobile path) qua kịch bản S0 $\rightarrow$ M5 phỏng vấn.
- Đã chạy chương trình tự động sinh tài liệu chính thức từ answers bằng `emitTree` (động cơ lõi `emit.ts`) và xuất ra tại thư mục **[docs-generated/](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/proj-01/docs-generated)**. Cây tài liệu sinh ra hoàn toàn khớp đúng với cấu trúc taxonomy của di động (9 file bao gồm `07-release.md`, không có `07-deployment.md`), tất cả các mục đều gắn mỏ neo truy vết ẩn chứa tiền tố `apps/mobile/src/`.
- Đã hoàn thành báo cáo ma sát phỏng vấn **[friction-log.md](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/proj-01/friction-log.md)** ghi chép thời gian chi tiết từng pha (tổng cộng 35 phút) và chỉ ra 4 điểm cấn cụ thể về cấu trúc câu hỏi, mặc định và từ khóa cảnh báo làm đầu vào dữ liệu cho tuần W11.
- Chạy `npm test` xanh hoàn toàn 59/59 tests (bao gồm cả test case dogfood regression mới). Không đụng vào code logic hay nội dung kịch bản gốc.
