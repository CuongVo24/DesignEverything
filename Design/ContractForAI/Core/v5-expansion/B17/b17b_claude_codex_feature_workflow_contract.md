# Contract — B17b Claude/Codex feature workflow

> Tầng: Adapter. Nguồn: V5-ContractSynthesisPlan B17b, D45–D46 (deep/fast), D37 (coverage trung thực). Phụ thuộc: B17a.

## 1. Micro-task target

Lái vòng feature-contract trên hai harness qua slash/skill: duyệt hợp đồng (deep) → thực thi (fast) → verify → review/break-task → feature kế; adapter chỉ INJECT/GATE/EMIT, công bố coverage đúng năng lực.

## 2. Scope

**In scope**

- Skill/slash mở rộng vòng build: hiển thị hợp đồng active (micro_task, scope, interfaces, verification), một next-step có lý do/proof/recovery (nối D39).
- Claude Code: PreToolUse hard-gate allowed_paths của hợp đồng đang mở; chặn ghi ngoài scope hợp đồng active.
- Codex: PreToolUse **soft** trên Bash/`apply_patch`/MCP tool paths intercept được; ngoài đó gắn nhãn soft/unsupported (không hứa hard-enforce vòng feature dài).
- deep/fast (D46): deep = duyệt/viết hợp đồng + review; fast = thực thi; cả hai giữ nguyên validation/evidence.
- Adapter đọc contract/state từ core; không nhúng logic synthesis/sizing/review (giữ lõi béo adapter gầy).

**Out of scope**

- Không tự sinh hợp đồng trong adapter (thuộc B16b); không tự chạy install/deploy.
- Không claim Codex hard-enforce ngoài tool paths official.

## 3. Checklist

- [ ] Claude PreToolUse chặn ghi ngoài `allowed_paths` của hợp đồng active; mở đúng khi trong scope.
- [ ] Codex hook cảnh báo (soft) và ConformanceMatrix ghi rõ coverage/enforcement level.
- [ ] Skill hiển thị hợp đồng active + next-step + recovery; không lộ JSON thô cho newbie.
- [ ] deep/fast đổi độ giải thích, không đổi kỷ luật; fast không bypass review.
- [ ] Adapter không chứa logic synthesis/review — chỉ đọc core.

## 4. Interfaces / Files expected to change

- [MODIFY] `adapter/claude-code/hooks/pre-tool-use.mjs`, `adapter/claude-code/skill/build/SKILL.md`, ≤160 dòng/file.
- [MODIFY] `adapter/codex-plugin/hooks/pre-tool-use.mjs`, `adapter/codex-plugin/skills/design-everything-build/SKILL.md`, ≤160 dòng/file.
- [MODIFY] `src/adapters/shared/renderNextStep.ts`, ≤120 dòng: render hợp đồng active + review state.
- [MODIFY] `Design/Adapters/ConformanceMatrix.md`, `Design/Adapters/claude-code.md`, `Design/Adapters/agents-md.md`, ≤120 dòng/file.
- [NEW] adapter workflow tests, ≤200 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Codex soft-gate trôi trên vòng dài | Cao | Công bố coverage; giữ claim mạnh ở Claude; không marketing hard-enforce. |
| Adapter phình logic review/synthesis | Cao | Adapter đọc core; test chặn logic taxonomy/sizing trong adapter. |
| Newbie ngợp JSON | TB | renderNextStep dịch sang một việc + lý do + proof. |

## 6. Verification plan

- `npx vitest run renderNextStep preToolUse` (Claude + Codex)
- `npm run typecheck && npm run lint && npm run build`
- E2E hai harness: hợp đồng active → thử ghi ngoài scope (Claude chặn cứng / Codex cảnh báo) → verify → review → feature kế; ConformanceMatrix khớp hành vi quan sát.

## 7. Status

DONE

> Đã code: card `reviewing` trong `renderNextStep.ts` (open break-task → hard scope; sạch → manager-check) + tests; SKILL build Claude (Bước 6 review) và Codex (mục 3, công bố soft-gate) cập nhật. Hook PreToolUse sâu vẫn giữ nguyên cơ chế allowed_paths của V4 (contract compile xuống TaskCard nên không cần đổi hook).
