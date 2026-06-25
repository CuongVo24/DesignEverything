# Adapter — Claude Code (bậc A, reference implementation)

> Cái duy nhất ép **cứng**. Đây là bản tham chiếu để chốt hợp đồng Lõi↔Adapter. Ra mắt **trước tiên**.

## Tại sao cần file này
Claude Code có hook → chứng minh được tầm nhìn đầy đủ ("không xong doc, không cho code" là thật). Mọi adapter sau dựa trên hợp đồng được chốt ở đây.

## INJECT — đưa kịch bản vào host
- Đóng gói kịch bản phỏng vấn thành **skill** (hoặc slash command, vd `/design`).
- Skill nạp `interview-script` + 4 quy tắc vàng vào chỉ thị.

## GATE — chặn sinh code (cứng)
- `PreToolUse` chặn `Write`/`Edit`/`Bash` theo [../Core/Schemas/gate-policy.md](../Core/Schemas/gate-policy.md) khi doc bắt buộc chưa tồn tại.
- `UserPromptSubmit` đẩy state machine tiến **1 bước mỗi lượt người thật** ([../Core/Schemas/state-schema.md](../Core/Schemas/state-schema.md)).
- **Tránh** để `Stop` hook chặn mọi lần AI dừng — chỉ chặn khi định build/kết thúc mà state chưa đủ.

## EMIT — output đúng cây
- Sinh doc theo [../Content/taxonomy.md](../Content/taxonomy.md), kèm mỏ neo [../Core/AnchorFormat.md](../Core/AnchorFormat.md).

## Hook cần viết (reference — open question FirstIdea mục 13)
- [ ] `PreToolUse` + đọc `progress.json` + gate-policy.
- [ ] `UserPromptSubmit` tiến state 1 bước.
- [ ] `SessionStart` khởi tạo `progress.json` nếu chưa có.

## MVP (1 tuần — xem [../RoadMap/MasterRoadMap.md](../RoadMap/MasterRoadMap.md))
Skill + hook gate + kịch bản lõi cho **1 hướng (web)** sinh cây doc end-to-end.
