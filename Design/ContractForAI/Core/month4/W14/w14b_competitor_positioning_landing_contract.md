# Contract — W14B Nghiên cứu đối thủ + định vị + landing 1 trang

> **Tầng:** Nội dung/Process. Nguồn: [Week-14](../../../../RoadMap/Month4/Week-14.md) + [ProductPRD](../../../../ProductPRD.md) + [FirstIdea](../../../../../FirstIdea.md) + phản hồi dogfood Month 3. Phụ thuộc: [W14A](w14a_external_validation_real_diff_contract.md) `DONE` (định vị phải nói đúng nỗi đau thật đã đo, không chỉ ý tác giả).

## 1. Micro-task target
Biến trực giác định vị trong FirstIdea thành ngôn ngữ người ngoài hiểu: bảng so sánh công bằng với vài công cụ gần nhất + tuyên ngôn định vị ngắn + landing/pitch 1 trang. Trả lời sắc gọn "vì sao dùng DesignEverything thay vì công cụ X", nêu rõ cả việc **cố ý không** giải quyết.

## 2. Scope
**In scope:**
- Nghiên cứu Spec Kit, Kiro, BMAD, Taskmaster — chỗ họ giả định "user đã biết mình muốn gì".
- Bảng so sánh + điểm khác biệt cốt lõi (PHỎNG VẤN không SINH template trống; 4 quy tắc vàng; gate dựa artifact; graceful degradation).
- Tuyên ngôn định vị + landing/pitch 1 trang.

**Out of scope**
- KHÔNG hứa năng lực chưa xây (vd Drift Fixing) — landing chỉ nói thứ repo chứng minh được.
- KHÔNG sửa code/Content.

## 3. Checklist
- [ ] Bảng so sánh ngắn nhưng có ích, công bằng (nêu cả chỗ đối thủ mạnh hơn).
- [ ] Tuyên ngôn định vị nêu rõ đối tượng phù hợp + trường hợp KHÔNG phù hợp.
- [ ] Mọi claim bám artifact thật trong repo (golden, gate, ConformanceMatrix, số đo W14A).
- [ ] Landing đọc được mà không cần đọc toàn `Design/`.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month4/positioning.md` (so sánh đối thủ + tuyên ngôn)
- `[NEW]` `docs/landing.md` (pitch 1 trang)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Định vị quá rộng / tự khen | Cao | Bám sự thật repo + số đo W14A; mỗi claim có chứng cứ. |
| So sánh đối thủ thiên vị/không cập nhật | TB | Nêu cả điểm mạnh đối thủ; khác biệt tập trung vào "khe hở user-chưa-biết-mình-muốn-gì". |
| Hứa trước tính năng tương lai | TB | Drift Fixing/adapter mới ghi là "tầm nhìn", tách khỏi "đang có". |

## 6. Verification plan
- Review thủ công: một người ngoài đọc landing hiểu sản phẩm khác gì đối thủ trong <5 phút.
- Đối chiếu mọi claim với artifact repo; gắn link chứng cứ.
- `npm test` xanh (không đụng code).

## 7. Status
`WAITING_FOR_APPROVAL`
