# Master RoadMap

> Nguồn: FirstIdea mục 11. Bán thời gian, 1 mình.

## Tại sao cần file này
Dự án này dễ "demo 1 tuần nhưng mài phương pháp phình vô hạn". RoadMap + kỷ luật phạm vi là thứ cứu khỏi sa lầy.

## Mốc

| Mốc | Phạm vi | Thời gian |
|---|---|---|
| **Bản chạy được** | Claude Code: skill + hook gate + kịch bản lõi **1 hướng (web)**, sinh cây doc end-to-end | ~1 tuần |
| **v1 dùng được** | Thêm nhánh mobile, template chau chuốt, phần "tại sao", + adapter `AGENTS.md` | ~1 tháng |
| **Đáng chia sẻ** | Test trên 3–4 dự án thật, lặp nội dung, README/phân phối | ~2–3 tháng |

## Điền nội dung
Kế hoạch điền toàn bộ nội dung `Design/` chia theo batch (giao cho agent khác): [ContentFillPlan.md](ContentFillPlan.md) — B1 khoá schema → B2–B4 kịch bản → B5 template → B6 script.yaml → B7 golden example → B8 adapter → B9 QA.

## Việc cần quyết / nghiên cứu (open questions)
- [ ] **Quyết NGAY:** format anchor truy vết → [../Core/AnchorFormat.md](../Core/AnchorFormat.md).
- [ ] Chốt schema `interview-script` trung tính → [../Core/Schemas/interview-script.md](../Core/Schemas/interview-script.md).
- [ ] Soi sâu logic S3 (Must/Should/Could).
- [ ] Viết bộ hook Claude Code reference → [../Adapters/claude-code.md](../Adapters/claude-code.md).
- [ ] Chốt phạm vi MVP 1 tuần thật cụ thể (file nào, hook làm gì, web rút mấy câu).
- [ ] Nghiên cứu kỹ Spec Kit & Kiro (chỗ "giả định người dùng đã biết mình muốn gì").
- [ ] Mở rộng taxonomy bản tối giản → bản "giống công ty".

## Kỷ luật phạm vi
Chốt MVP (Claude Code + web), thả lên dự án thật, **đo** rút "1 tuần soạn doc" còn bao lâu — *rồi mới* mở rộng.

## Tầm nhìn xa (KHÔNG trong MVP)
Tool **maintain** tài liệu: Drift Flagging trước (rẻ, an toàn), Drift Fixing sau. Khó hơn một bậc vì có trạng thái + hai chiều. Tractable nếu gieo mỏ neo truy vết từ đầu.
