# Contract — W9B Phân loại phát hiện 4 nhóm + diff docs sinh-ra vs sửa-tay

> **Tầng:** Process. Nguồn: [Week-09](../../../../RoadMap/Month3/Week-09.md) + output W9A ([friction-log + docs-generated](../../../../RoadMap/Month3/dogfood/proj-01/)). Phụ thuộc: [W9A](w9a_dogfood_run_friction_log_contract.md) `DONE`.

## 1. Micro-task target
Biến nhật ký ma sát thô của W9A thành **một backlog phân loại 4 nhóm** (nội dung / taxonomy / adapter / onboarding) đủ sắc để dùng cho W10–W11, và tạo bản **docs sửa tay** đặt cạnh `docs-generated` để thấy rõ phần sản phẩm đã làm giúp vs phần còn phải sửa tay.

## 2. Scope
**In scope**
- Tạo `docs-handfixed/` = bản copy của `docs-generated/` rồi sửa tay tới mức "thật sự dùng để build được".
- Sinh `docs-diff.md`: tóm tắt khác biệt sinh-ra↔sửa-tay (file nào sửa nhiều nhất, loại sửa gì) → đo "sản phẩm lo được bao nhiêu %".
- `backlog-month3.md`: mỗi phát hiện gắn đúng 1 trong 4 nhóm + mức đau (cao/TB/thấp) + 1 dòng "đề xuất sửa ở tầng nào" (content/taxonomy/adapter/onboarding).

**Out of scope**
- KHÔNG sửa `Content/`/script/golden (W11). KHÔNG mở rộng taxonomy (W12).
- KHÔNG kết luận "vấn đề hệ thống" từ 1 dự án (cần W10 mới đủ mẫu) — ở đây chỉ phân loại, đánh dấu "chờ xác nhận tần suất ở W10".

## 3. Checklist
- [x] `docs-handfixed/` tồn tại, là bản sửa từ `docs-generated/` (không viết lại từ đầu).
- [x] `docs-diff.md` nêu rõ file nào phải sửa tay nhiều nhất + loại sửa.
- [x] Mọi mục backlog gắn đúng 1/4 nhóm + mức đau + tầng đề xuất sửa.
- [x] Backlog đánh dấu mục nào "chờ xác nhận tần suất ở W10" (chống nhầm cá biệt → hệ thống).

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-01/docs-handfixed/*`
- `[NEW]` `Design/RoadMap/Month3/dogfood/proj-01/docs-diff.md` (~40–80 dòng)
- `[NEW]` `Design/RoadMap/Month3/backlog-month3.md` (~60–120 dòng, bảng phân loại)
- Không đổi code, không đổi `Content/`.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---|---|
| Backlog phình thành "wishlist" | TB | Mỗi mục bắt buộc có mức đau + tầng sửa; mục không gắn được tầng → để "ý tưởng để sau". |
| Nhầm lỗi cá biệt 1 dự án thành lỗi hệ thống | Cao | Đánh dấu "chờ xác nhận tần suất ở W10"; không kết luận lớn ở đây. |
| Sửa tay docs quá tay → mất tín hiệu diff | TB | Chỉ sửa tới "đủ build được", ghi từng loại sửa vào docs-diff. |

## 6. Verification plan
- `npm test` — xanh (không chạm code/Content lõi).
- Review thủ công: 4 nhóm đều có chỗ chứa (kể cả nhóm rỗng ghi "0 phát hiện"); mỗi mục có nhóm+đau+tầng.
- `docs-diff.md` đọc được "% sản phẩm lo được" định tính, có ví dụ file cụ thể.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã tạo bản tài liệu sửa đổi thủ công tại **[docs-handfixed/](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/proj-01/docs-handfixed)** được kế thừa và tối ưu hóa từ bản sinh tự động `docs-generated/` để đảm bảo đủ độ kỹ thuật sâu cho việc viết code thật.
- Đã xuất bản báo cáo đối chiếu **[docs-diff.md](file:///e:/DesignEverything/Design/RoadMap/Month3/dogfood/proj-01/docs-diff.md)** đánh giá công cụ hỗ trợ ~55% khung sườn, chỉ ra các file sửa đổi nhiều nhất là `03-data-model.md`, `07-release.md` và các loại sửa đổi chính (tách lặp và làm sâu chi tiết kỹ thuật).
- Đã thiết lập bảng tổng hợp lỗi và phân loại tồn đọng **[backlog-month3.md](file:///e:/DesignEverything/Design/RoadMap/Month3/backlog-month3.md)** phân phối 6 lỗi vào 4 tầng (Content, Taxonomy, Adapter, Onboarding) kèm mức độ đau, đề xuất tầng vá và đánh dấu "Chờ xác nhận tần suất ở W10" để ngăn ngừa lỗi cá biệt trôi thành lỗi hệ thống.
- Chạy `npm test` xanh hoàn toàn 59/59 tests. Lint và compile hoàn toàn sạch sẽ.
