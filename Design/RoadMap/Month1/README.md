# Month 1 — Reference implementation: Claude Code + Web chạy được

> Tháng 1/4 · Tuần 1–4/16 · Mốc RoadMap: **Bản chạy được** ([../MasterRoadMap.md](../MasterRoadMap.md))

## Tại sao cần file này
Tháng này tồn tại để chứng minh lời hứa mạnh nhất của DesignEverything bằng một bản chạy thật: chưa xong doc thì chưa được đi code. Nếu Claude Code reference không chạy được theo hướng web end-to-end, mọi bàn luận về mobile, AGENTS.md hay maintain về sau đều chỉ là ý tưởng đẹp.

## Mục tiêu tháng (Definition of Done)
Cuối tháng phải có một reference implementation tối thiểu nhưng thật: repo code TypeScript chạy được, đọc `script.yaml`, giữ state đúng một bước mỗi lượt người thật, chặn `Write/Edit/Bash` bằng `PreToolUse`, và emit đủ cây `docs/` web cho một dự án mẫu. Bản này chưa cần đẹp hay phủ nhiều harness; nó chỉ cần đúng contract, đo được, và đủ chắc để làm nền cho Month 2.

## Các tuần
| Tuần | Tiêu đề | Mốc nhỏ |
|---|---|---|
| [Tuần 1](Week-01.md) | Chốt phạm vi MVP + scaffold repo code + golden web | Chốt đúng bài toán "Claude Code + web + 1 gate" và dựng xong khung repo code |
| [Tuần 2](Week-02.md) | Engine lõi + zod + gate-policy.yaml + unit test | Có lõi dùng chung đọc script, tiến state, đánh giá gate và có test xanh |
| [Tuần 3](Week-03.md) | 3 hook Claude Code + skill INJECT | Claude Code biết khởi tạo state, tiến bước, chặn tool và inject đúng câu hiện tại |
| [Tuần 4](Week-04.md) | EMIT cây docs end-to-end + chạy thử luồng web | Chạy được một phiên web trọn vẹn, đối chiếu golden và đóng mốc "Bản chạy được" |

## Đầu ra cuối tháng
- Repo code theo Node.js + TypeScript `strict`, có cấu trúc lõi dùng chung và adapter Claude Code tách bạch.
- `script.yaml` và `gate-policy` máy-đọc-được đã được nạp/validate bằng `zod`.
- Bộ fixture web gồm transcript mẫu, cây `docs/` web, và dữ liệu test cho engine.
- 3 hook `SessionStart`, `UserPromptSubmit`, `PreToolUse` cùng skill/slash command INJECT chạy được trên Claude Code.
- Một runbook ngắn để tự chạy lại demo web và kiểm xem gate mở đúng lúc.

## Rủi ro & kỷ luật phạm vi
Rủi ro lớn nhất của tháng này là làm reference implementation bị phình thành "sản phẩm hoàn chỉnh". Kỷ luật bắt buộc là: chỉ làm hướng web, chỉ làm Claude Code, chỉ làm một gate `scope-locked`, và chỉ chọn một dự án web mẫu đủ nhỏ để dùng làm fixture. Mọi ý tưởng về mobile, AGENTS.md, phân phối hay maintain phải để sang tháng sau, trừ khi chúng chặn trực tiếp mốc "Bản chạy được".
