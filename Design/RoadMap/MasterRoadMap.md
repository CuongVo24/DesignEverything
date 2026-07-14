# Master RoadMap

> Nguồn: FirstIdea mục 11. Bán thời gian, 1 mình.

## Tại sao cần file này
Dự án này dễ "demo 1 tuần nhưng mài phương pháp phình vô hạn". RoadMap + kỷ luật phạm vi là thứ cứu khỏi sa lầy.

## Mốc

| Mốc | Phạm vi | Thời gian | Trạng thái |
|---|---|---|---|
| **Bản chạy được** | Claude Code: skill + hook gate + kịch bản lõi **1 hướng (web)**, sinh cây doc end-to-end | ~1 tuần | **ĐÃ HOÀN THÀNH** |
| **v1 dùng được** | Thêm nhánh mobile, template chau chuốt, phần "tại sao", + adapter `AGENTS.md` | ~1 tháng | **ĐÃ HOÀN THÀNH (v1.0.0)** |
| **Đáng chia sẻ** | Test trên 3–4 dự án thật, lặp nội dung, README/phân phối | ~2–3 tháng | Chưa bắt đầu |

> Ba mốc thời gian ở bảng trên là ước lượng **lý tưởng/optimistic** rút từ FirstIdea: giả định nội dung lõi đã khoá, người làm có thể tập trung sâu, và chỉ tính phần "làm cho chạy được". Kế hoạch 16 tuần bên dưới là **lịch calendar bán thời gian** đã cộng thêm thời gian đệm cho dogfood, đo lường, hardening, onboarding và phân phối.

## Kế hoạch chi tiết 16 tuần (4 tháng)
Mỗi tháng một thư mục, mỗi tháng chia 4 tuần. Các file `Week-*.md` bên dưới đã được điền thành kế hoạch hành động chi tiết, đủ để bám theo khi bắt đầu triển khai code, dogfood và phân phối.

| Tháng | Chủ đề | Mốc | Trạng thái |
|---|---|---|---|
| [Month 1](Month1/README.md) | Reference: Claude Code + Web chạy được | Bản chạy được | **HOÀN THÀNH** |
| [Month 2](Month2/README.md) | Mobile + AGENTS.md + chau chuốt | v1 dùng được | **HOÀN THÀNH (v1.0.0)** |
| [Month 3](Month3/README.md) | Dogfood + kiểm chứng dự án thật | Đáng chia sẻ | Kế hoạch |
| [Month 4](Month4/README.md) | Phân phối + đặt nền maintain (một số mốc hoãn tới sau v2 theo D26) | Đáng chia sẻ + tầm xa | Kế hoạch (hoãn post-v2) |

## Phân pha
- **Phase 0 — Khoá nội dung trong `Design/`**: đã hoàn tất qua [ContentFillPlan.md](ContentFillPlan.md), từ B1 đến B9.
- **Phase 1 — v1.0.0 (Month 1 & Month 2)**: đã hoàn thành triển khai code lõi, kịch bản web/mobile và bộ sinh rules.
- **Phase 2 — v2.0.0 (Đa hình-hài & Phản biện)**: đã hoàn tất triển khai (B5-B6) — chốt mốc v2.0.0.
- **Phase 3–4 — 16 tuần triển khai tiếp theo**: tiếp tục với dogfooding và phân phối.
- **Phase 5 — V3 Execution Expansion (mốc 4.0.0):** sau 3.0.0, chuyển từ milestone prose sang plan validation, task/evidence và evaluation journey; xem [V3-ExecutionExpansionPlan.md](V3-ExecutionExpansionPlan.md). Implementation B7–B10 đã xong nhưng integrity remediation B11 đang chờ duyệt; xem [V3-PostImplementationReview.md](V3-PostImplementationReview.md).
- **Phase 6 — V4 Newbie Expansion (mốc 5.0.0):** cross-runtime `PreActionGate`, Codex adapter, project doctor/stack-aware plan, newbie recovery và replay audit; chỉ bắt đầu sau B11f. Xem [V4-NewbieExpansionPlan.md](V4-NewbieExpansionPlan.md).
- **Phase 7 — V5 Contract Synthesis (mốc 6.0.0):** sau skeleton, sinh hợp đồng bám feature theo quy mô (D41-D42), contract schema máy đọc + bind Conventions (D43-D44), phase `reviewing`/break-task fail-closed (D45), và pilot đi hết ≥1 feature Must thật (D47). Chỉ bắt đầu sau khi V4/5.0.0 phát hành. Xem [V5-ContractSynthesisPlan.md](V5-ContractSynthesisPlan.md).

## Điền nội dung
[ContentFillPlan.md](ContentFillPlan.md) là kế hoạch điền toàn bộ nội dung `Design/` theo batch: B1 khoá schema → B2–B4 kịch bản → B5 template → B6 script.yaml → B7 golden example mobile → B8 adapter → B9 QA. Ở trạng thái hiện tại, phase này được coi là completed và là tiền đề cho toàn bộ kế hoạch 16 tuần bên dưới.

## Việc cần quyết / nghiên cứu (open questions)
- [ ] Chốt cấu trúc repo code reference tối thiểu: một package hay nhiều package, và đường biên giữa `core/` với `adapters/`. Xử lý ở [Month1/Week-01.md](Month1/Week-01.md).
- [ ] Quyết định dạng `gate-policy` máy-đọc-được đi kèm repo code để runtime không phải parse markdown. Xử lý ở [Month1/Week-02.md](Month1/Week-02.md).
- [ ] Chọn 1 golden web project đủ nhỏ nhưng vẫn chạm đủ W1–W5 để làm fixture chính. Xử lý ở [Month1/Week-01.md](Month1/Week-01.md).
- [ ] Xác định baseline "soạn doc mất gần 1 tuần" bằng số đo nào để Month 3 so sánh được công bằng. Xử lý ở [Month3/Week-10.md](Month3/Week-10.md).
- [ ] Định nghĩa điều kiện rõ để mở rộng taxonomy sang bản "giống công ty" thay vì thêm file theo cảm hứng. Xử lý ở [Month3/Week-12.md](Month3/Week-12.md).
- [ ] Chọn trigger phù hợp cho Drift Flagging v0: chạy thủ công, trong CLI, hay gắn vào CI sau này. Xử lý ở [Month4/Week-15.md](Month4/Week-15.md).

## Kỷ luật phạm vi
Chốt MVP (Claude Code + web), thả lên dự án thật, **đo** rút "1 tuần soạn doc" còn bao lâu — *rồi mới* mở rộng.

## Tầm nhìn xa (KHÔNG trong MVP)
Tool **maintain** tài liệu: Drift Flagging trước (rẻ, an toàn), Drift Fixing sau. Khó hơn một bậc vì có trạng thái + hai chiều. Tractable nếu gieo mỏ neo truy vết từ đầu.
