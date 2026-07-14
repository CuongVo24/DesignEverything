# Contract — B9b Rules-only execution protocol

> Tầng: Adapter. Nguồn: V3-ExecutionExpansionPlan B9b, D31-D33. Phụ thuộc: B8b.

## 1. Micro-task target
Mở rộng AGENTS.md generator để harness rules-only tuân cùng execution plan, task/evidence protocol và nói thật rằng enforcement là soft.

## 2. Scope

**In scope**

- Generator thêm phần Build protocol: đọc plan/state, chỉ làm active task, ghi evidence, repair trước next task.
- Rules mô tả same task card fields, preflight, risk spike, deep/fast behavior và handoff khi không chạy được command.
- Rules luôn gắn nhãn self-reported cho evidence mà harness không thể lấy từ tool output.
- Artifact drift test assert nội dung V3 bắt buộc.

**Out of scope**

- Không hứa deny deterministic hay sandbox ở Codex/Cursor/Cline.
- Không copy skill Claude Code hay gọi hook Claude trong rules text.

## 3. Checklist

- [ ] Generated AGENTS.md nêu rõ soft enforcement và cách người dùng xác minh evidence.
- [ ] Có lệnh/rules chặn hành vi tự làm nhiều task trong cùng response.
- [ ] Có protocol risk spike và blocked handoff.
- [ ] Không còn mô tả adapter chỉ có đúng ba hành vi khi V3 Orchestrate được bật.

## 4. Interfaces / Files expected to change

- [MODIFY] src/adapters/agents/generateAgentsMd.ts, khoảng 160 dòng.
- [MODIFY] generated AGENTS sample và artifact tests.
- [MODIFY] Design/Adapters/agents-md.md, ConformanceMatrix.md, Glossary.md.
- [NEW] fixture smoke rules-only với evidence self-reported.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Người dùng tin soft gate là cứng | Cao | Warning đứng trước protocol, matrix ghi rõ giới hạn. |
| Rules quá dài bị model bỏ qua | TB | Giữ protocol dạng state-first ngắn, link plan JSON là source of truth. |
| Drift với Claude workflow | TB | Chung schema/task terms từ Core, test artifact + conformance sweep B10b. |

## 6. Verification plan

- npx vitest run generateAgentsMd artifact
- npm test && npm run typecheck
- Manual review generated rules: có soft-limit, active task, evidence, repair và blocked handoff.

## 7. Status

DONE
