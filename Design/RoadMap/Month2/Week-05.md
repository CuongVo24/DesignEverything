# Tuần 5/16 — Nhánh mobile end-to-end + thực thi 2 bẫy M2/M5

> Tháng 2 · Mốc: v1 dùng được · Phụ thuộc: Month 1 (web chạy được)

## Tại sao cần file này
Web reference chứng minh cơ chế, nhưng mobile mới là chỗ người mới dễ vỡ mộng nhất về offline/sync và store. Tuần này tồn tại để đưa những điểm đau đó vào hành vi thật của sản phẩm, chứ không chỉ nằm trong tài liệu thiết kế.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải chạy được một phiên mobile trọn S0→S6→M1–M5, emit đúng `07-release.md`, và bộc lộ đúng lúc hai cảnh báo cốt lõi: M2 làm rõ chi phí offline/sync tăng mạnh, M5 làm rõ quy trình review/ký/phân phối app. Thành công của tuần này không phải chỉ là "có nhánh mobile", mà là mobile path giữ được đúng tinh thần QualityRubric D.

## Việc chi tiết
- [ ] Rẽ nhánh mobile sau S6 trong advanceState (W vs M).
- [ ] Chạy trọn luồng mobile đối chiếu fixture `Design/Content/golden-example-mobile/`.
- [ ] Bảo đảm cảnh báo M2 (offline/sync) + M5 (store) bật ra sớm.
- [ ] EMIT `07-release.md` thay `07-deployment.md` đúng nhánh.
- [ ] Bổ sung regression test cho `05-architecture.md` ở nhánh mobile và `07-release.md` là file 07 duy nhất được emit.
- [ ] Kiểm tra wording ở `translate_back` để chắc cảnh báo hiện ra như quyết định sản phẩm, không như ghi chú kỹ thuật lạc điệu.

## Đầu vào / Phụ thuộc
Engine lõi và hook Claude Code từ Month 1, `script.yaml` nhánh mobile, fixture mobile tại `Design/Content/golden-example-mobile/`, cùng `05-architecture.md`/`07-release.md` templates. Tuần này cũng phụ thuộc vào việc taxonomy đã nói rõ quy tắc "mỗi phiên chỉ emit một file 07-*".

## Đầu ra / Artifact
- Luồng mobile end-to-end chạy được bằng cùng engine đã dùng cho web.
- Regression test cho branch mobile và lựa chọn đúng file `07-release.md`.
- Một bản ghi ngắn các điểm wording/cảnh báo phải giữ nguyên khi refactor sau này.

## Rủi ro & cạm bẫy
Ba lỗi dễ gặp nhất là emit nhầm `07-deployment.md`, để cảnh báo M2/M5 ra quá muộn sau khi user đã "chốt", hoặc làm mobile path chỉ là bản web đổi tên câu hỏi. Tuần này phải coi mobile là một nhánh có cá tính rủi ro riêng, không phải nhánh trang trí.

## Nghiệm thu
- [ ] Chạy được một phiên mobile trọn tuyến và sinh `07-release.md` đúng taxonomy.
- [ ] Cảnh báo M2 và M5 xuất hiện đúng chỗ, dễ hiểu với người mới.
- [ ] Regression test phân biệt được web path và mobile path.
- [ ] Không phá demo web của Month 1.
