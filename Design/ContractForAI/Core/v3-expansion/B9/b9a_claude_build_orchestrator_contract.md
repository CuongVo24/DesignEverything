# Contract — B9a Claude Code build orchestrator

> Tầng: Adapter. Nguồn: V3-ExecutionExpansionPlan B9a, D30-D33. Phụ thuộc: B8b.

## 1. Micro-task target
Thêm workflow build cho Claude Code điều phối duy nhất active task qua core state: preflight, xác nhận kế hoạch, implement trong phạm vi, verify, record evidence, repair hoặc resume.

## 2. Scope

**In scope**

- Skill hoặc slash command build đọc execution-plan.json và execution-state.json qua CLI core, không sửa JSON tay.
- CLI verbs rõ: validate, next, start, record-evidence, repair, status; mỗi verb validate transition.
- Trước mỗi task: nói mục tiêu, tác động, allowed paths, preconditions và acceptance. Deep giải thích thêm lý do; fast vẫn nêu cùng bằng chứng tối thiểu.
- PreToolUse chặn write ngoài active task và chặn task kế tiếp khi evidence chưa pass.
- Khi test fail: giữ task hiện tại, trình bày output, đề xuất repair nhỏ; không bỏ qua bằng chứng hay chuyển milestone.

**Out of scope**

- Không tự chọn tech stack/risk acceptance trái plan.
- Không chạy destructive/external actions, commit, push hay deploy không có yêu cầu người dùng.
- Không dùng nhiều agent hoặc để agent tự tạo tasks ngoài plan.

## 3. Checklist

- [x] Start/resume hiển thị đúng một active task với status/evidence.
- [x] Preflight check lưu output thiếu dependency vào evidence hoặc block_reason.
- [x] Write/Edit ngoài allows_paths bị deny sau plan-validating.
- [x] Test pass chỉ mở next task sau record-evidence hợp lệ.
- [x] Repair không làm mất evidence thất bại và có giới hạn scope task cũ.

## 4. Interfaces / Files expected to change

- [x] adapter/claude-code/cli.mjs, khoảng 200 dòng chia nhỏ nếu cần.
- [x] adapter/claude-code/skill/build/SKILL.md hoặc cập nhật skill hiện có, khoảng 180 dòng.
- [x] src/adapters/claude/preToolUse.ts và hook entry, khoảng 150 dòng.
- [x] src/adapters/claude/buildWorkflow.test.ts và e2e fixture workspace.
- [x] adapter/claude-code/install.mjs để cài skill/core artifacts.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Skill bypass state bằng Write trực tiếp | Cao | CLI là source write state; hook deny task/path sai; e2e bypass tests. |
| Người mới bị kẹt khi preflight fail | Cao | Error phải nêu dependency thiếu, một lệnh kiểm tra/an toàn và cách quay lại status. |
| Workflow thành autonomous deployer | Cao | Explicit out of scope, external side effect cần user request. |

## 6. Verification plan

- npx vitest run buildWorkflow preToolUse
- npm test && npm run typecheck && npm run lint
- Claude protocol smoke: folder rỗng -> validate -> preflight M0 -> one allowed write set -> test/evidence -> M1; failure stays repairing.

## 7. Status

DONE
