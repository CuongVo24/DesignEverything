# Tuần 3/16 — 3 hook Claude Code + skill INJECT

> Tháng 1 · Mốc: Bản chạy được · Phụ thuộc: Tuần 2 (engine lõi xanh)

## Tại sao cần file này
Tuần này là lúc DesignEverything thôi nói về enforcement và bắt đầu thực sự enforce. Nếu map đúng lõi sang hook Claude Code, đây sẽ là bằng chứng mạnh nhất rằng sản phẩm không chỉ "gợi ý viết doc trước" mà thực sự biết chặn đi code sai nhịp.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có 3 hook `SessionStart`, `UserPromptSubmit`, `PreToolUse` map đúng sang hàm lõi, và một skill/slash command inject được câu hiện tại kèm 4 quy tắc vàng. Từ đây trở đi, Claude Code phải có thể giữ state, hỏi đúng một câu, và chặn tool đi code khi gate chưa mở.

## Việc chi tiết
- [ ] `SessionStart`: khởi tạo `progress.json` ở S0.
- [ ] `UserPromptSubmit`: tiến tối đa 1 bước/lượt người thật (chống double-advance).
- [ ] `PreToolUse`: đọc gate-policy, chặn Write/Edit/Bash đúng `blocks`, tránh `Stop` chặn nhầm.
- [ ] Skill / slash command INJECT câu hiện tại + 4 quy tắc vàng + translate_back.
- [ ] Phủ test case bắt buộc trong [../../Adapters/claude-code.md](../../Adapters/claude-code.md) §"Test case".
- [ ] Phân loại tối thiểu hành động `Bash` an toàn so với `Bash` mang nghĩa build/scaffold/cài package.
- [ ] Ghi log/debug message đủ rõ để tự truy ra vì sao hook chặn hoặc không chặn.

## Đầu vào / Phụ thuộc
Engine lõi từ tuần 2, đặc tả hook trong `claude-code.md`, `gate-policy`, fixture web và danh sách test case bắt buộc. Tuần này cũng phụ thuộc vào phạm vi MVP đã khóa ở tuần 1, nhất là quy ước "chỉ web" và "1 gate".

## Đầu ra / Artifact
- Bộ hook Claude Code tối thiểu tương ứng 3 event chính.
- Một skill/slash command INJECT dùng lại được, đọc câu hiện tại từ state và script.
- Test hoặc smoke script chứng minh hook chặn đúng ca bắt buộc và không chặn nhầm lượt hỏi tiếp.

## Rủi ro & cạm bẫy
Hai điểm nguy hiểm nhất là `Stop` chặn nhầm khi AI chỉ đang nhường lượt cho người dùng, và heuristic `Bash` quá thô dẫn tới chặn cả lệnh đọc file vô hại hoặc bỏ lọt lệnh build thật. Tuần này ưu tiên deterministic trên scope hẹp hơn là cố "thông minh" quá mức.

## Nghiệm thu
- [ ] `SessionStart` tạo được `progress.json` hợp lệ ở `S0`.
- [ ] `UserPromptSubmit` không advance quá 1 bước cho cùng `last_user_turn_id`.
- [ ] `PreToolUse` chặn đúng khi thiếu docs của `scope-locked`, và cho phép tiếp tục viết trong `Design/` hoặc `docs/`.
- [ ] Skill/slash command inject ra đúng câu hiện tại, `translate_back`, `target_doc`, và nhắc 4 quy tắc vàng.
