# V4 Newbie Expansion — từ guardrail Claude tới trải nghiệm đa runtime

> Target phát hành: **5.0.0**. Lane tên V4 nối tiếp V3/4.0.0; MAJOR vì thêm public runtime contract, Codex adapter và project-profile/plan semantics mới.

## Mục tiêu sản phẩm

Một người mới bắt đầu từ folder trống phải đi được vòng lặp minh bạch:

`nêu ý tưởng → doctor môi trường → plan đúng stack → làm đúng một việc → hệ thống tự lấy bằng chứng → giải thích lỗi → sửa hoặc amend có kiểm soát → tiếp tục`.

Sản phẩm dùng một core chung nhưng không đánh đồng tên tool/hook của các harness. `PreActionGate` là contract nội bộ; Claude Code và Codex là hai adapter. Codex có `PreToolUse` công khai cho Bash, `apply_patch` và MCP tool calls, nhưng tài liệu Codex cũng nói đây là guardrail chứ không phải complete enforcement boundary; adapter phải công bố chính xác coverage đó thay vì hứa chặn mọi đường ghi. [Codex Hooks](https://learn.chatgpt.com/docs/hooks)

## Quyết định đã khoá

| Quyết định | Ý nghĩa |
|---|---|
| D36 | Runtime plan/evidence/state là canonical và fail-closed; không nhận pass tự khai. |
| D37 | Core dùng `PreActionGate`; adapter phải khai báo capability coverage và enforcement level. |
| D38 | Plan cho folder trống phải đi từ `ProjectProfile`/doctor, không hardcode Node/npm. |
| D39 | Newbie UX là một next step có lý do, proof và recovery/amend rõ; không auto-lách failure. |
| D40 | Claim cross-runtime/newbie chỉ mở sau replay artifacts và pilot audit được. |

## Batch và phụ thuộc

| Batch | Tầng | Contract | Kết quả |
|---|---|---|---|
| B12a | Lõi | pre_action_gate_core | Request/decision chuẩn, policy không gắn tên tool. |
| B12b | Adapter | codex_pre_tool_use_adapter | Plugin/skill/hook Codex có coverage rõ ràng. |
| B13a | Lõi | project_profile_doctor | Phát hiện folder/môi trường/stack và sự thiếu hụt. |
| B13b | Lõi | stack_aware_plan_synthesis | Plan scaffold, commands và paths đúng profile. |
| B14a | Adapter | newbie_next_step_experience | Bề mặt “việc tiếp theo, vì sao, proof”. |
| B14b | Lõi | controlled_amendment_recovery | Đổi giả định/scope có diff, invalidate và revalidate. |
| B15a | QA | cross_runtime_replay_benchmark | Replay thực trên Claude/Codex và các stack. |
| B15b | QA/Process | pilot_claim_release_gate | Pilot/raw findings/claim phát hành trung thực. |

Thứ tự bắt buộc:

    B12a ─ B12b ─┐
                  ├─ B14a ─ B15a ─ B15b
    B13a ─ B13b ─┤
                  └─ B14b ─────────┘

## Definition of Done 5.0.0

- Codex và Claude cùng gọi một core decision, nhưng mỗi adapter hiển thị capability coverage thực tế.
- Folder trống không nhận command/path/manifest giả; plan chỉ mở task scaffold khi profile/preflight chứng minh đủ điều kiện.
- Mọi pass dùng evidence do runner/harness thu, gắn plan digest và task đang active.
- Newbie có thể biết *làm gì tiếp, vì sao, thành công trông ra sao và khi lỗi thì chọn gì* mà không phải đọc JSON.
- Replay artifacts và pilot đã ẩn danh đủ để một reviewer tái kiểm claim completion/intervention.

## Out of scope

- Không tự deploy, commit, push, mua dịch vụ hay cấp quyền ngoài yêu cầu rõ của user.
- Không build orchestration swarm, ticket tracker hay dashboard enterprise.
- Không claim Codex hard-enforces tool paths ngoài các tool/event mà official capability matrix đã kiểm chứng.
