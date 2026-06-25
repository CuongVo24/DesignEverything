# Tuần 3/16 — 3 hook Claude Code + skill INJECT

> Tháng 1 · Mốc: Bản chạy được · Phụ thuộc: Tuần 2 (engine lõi xanh)

## Tại sao cần file này
{{Đây là phần ép-cứng thật — biến engine lõi thành hành vi deterministic trong Claude Code.}}

## Mục tiêu tuần (Definition of Done)
{{SessionStart/UserPromptSubmit/PreToolUse map đúng sang hàm lõi; skill inject đúng câu hiện tại.}}

## Việc chi tiết
- [ ] `SessionStart`: khởi tạo `progress.json` ở S0.
- [ ] `UserPromptSubmit`: tiến tối đa 1 bước/lượt người thật (chống double-advance).
- [ ] `PreToolUse`: đọc gate-policy, chặn Write/Edit/Bash đúng `blocks`, tránh `Stop` chặn nhầm.
- [ ] Skill / slash command INJECT câu hiện tại + 4 quy tắc vàng + translate_back.
- [ ] Phủ test case bắt buộc trong [../../Adapters/claude-code.md](../../Adapters/claude-code.md) §"Test case".
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{engine lõi, claude-code.md spec hook.}}

## Đầu ra / Artifact
{{adapters/claude/*.ts, skill definition.}}

## Rủi ro & cạm bẫy
{{Stop hook chặn nhầm lượt hỏi tiếp; phân loại Bash an toàn/đi-code sai.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được}}
