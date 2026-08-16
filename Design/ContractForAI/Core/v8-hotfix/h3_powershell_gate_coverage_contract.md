# Contract — H3 vá bypass PowerShell, công bố giới hạn phủ MCP

> Tầng: Adapter.
> Nguồn: phiên test thật đầu tiên của lane 8.1 — transcript cho thấy agent bị Bash chặn chuyển
> sang PowerShell và đi qua không bị gate. Phụ thuộc: không.

## 1. Micro-task target

Cho matcher `PreToolUse` phủ luôn tool `PowerShell` (mặc định trên Windows) — cùng thẩm quyền với
`Bash` — và công bố tường minh trong `ConformanceMatrix.md` rằng gate phủ đúng tập tool tích hợp
sẵn của Claude Code, không phủ mọi đường ghi có thể có trong một phiên (ví dụ MCP filesystem
server).

## 2. Scope

**In scope**

- `settingsMerge.mjs` — matcher `PreToolUse` thêm `PowerShell` vào danh sách hiện có
  (`Write|Edit|MultiEdit|NotebookEdit|Bash`).
- `pre-tool-use.mjs` — map tool `PowerShell` → `coreTool = 'Bash'` (cùng shape `tool_input.command`,
  cùng authority `resolveCliInvocation` + `classifyCommand`/CLI-subcommand table — không cần sửa
  `classifyCommand`, nó đã fail-closed với raw shell text).
- `ConformanceMatrix.md` — một đoạn nói thẳng gate phủ tool nào, không phủ MCP write tool (D37:
  hook chỉ intercept tập tool hữu hạn do harness khai báo, không phải sandbox toàn diện).
- `SKILL.md` dòng khẳng định tuyệt đối "hook PreToolUse sẽ chặn" — sửa thành liệt kê đúng tập tool
  bị chặn + câu tôn trọng gate ngay cả khi một đường ghi cụ thể tình cờ ngoài phạm vi.

**Out of scope**

- Không chặn MCP write tool theo allow-list — chọn công bố giới hạn thay vì chặn (theo đúng D37,
  và theo quyết định chủ repo ở plan Đợt 2 gốc).
- Không đổi `classifyCommand.ts` — nó đã bắt `Out-File`/`Set-Content`/redirect sẵn.

## 3. Checklist

- [x] `HOOK_ROLES` trong `settingsMerge.mjs` có matcher chứa `PowerShell`.
- [x] `pre-tool-use.mjs`: `tool_name === 'PowerShell'` → `coreTool = 'Bash'`, đi qua đúng authority
      path như một lệnh Bash.
- [x] `ConformanceMatrix.md` có đoạn "Phạm vi thật của `PreToolUse`" nêu rõ matcher + giới hạn MCP.
- [x] `SKILL.md` không còn khẳng định tuyệt đối "chặn mọi tool ghi" mà không kèm giới hạn.

## 4. Interfaces / Files expected to change

- [MODIFY] `adapter/claude-code/installer/settingsMerge.mjs` — matcher string, ~8 dòng.
- [MODIFY] `adapter/claude-code/hooks/pre-tool-use.mjs` — nhánh `coreTool`, ~11 dòng.
- [MODIFY] `Design/Adapters/ConformanceMatrix.md` — đoạn công bố giới hạn, ~10 dòng.
- [MODIFY] `adapter/claude-code/skill/SKILL.md` — 2 câu đầu file, ~5 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Agent đọc "PowerShell coi như Bash" rồi nghĩ mọi shell đều bị chặn, kể cả MCP exec | TB | Đoạn ConformanceMatrix nói thẳng: đây là tập tool harness khai báo, không phải sandbox toàn diện — tránh hứa kín. |
| `classifyCommand` không phân biệt cú pháp PowerShell-only (vd `Set-Content`) | Thấp | Đã kiểm tồn tại từ trước (bắt theo pattern chuỗi lệnh, không phân biệt shell), xác nhận lại bằng test H5 case (b). |

## 6. Verification plan

```bash
npx vitest run test/integration/installed-runtime/hook-seam.test.ts
```
(case (b) — PowerShell write command bị deny khi đang phỏng vấn.)

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 0, nhánh `codex/lane-8-1-interactive-cards`).

Xác nhận qua H5 hook-seam test case (b): `tool_name: 'PowerShell'`, lệnh `Set-Content` ghi file →
hook trả `permissionDecision: 'deny'` khi đang giữa phỏng vấn, đúng như một lệnh Bash tương đương.
`npx vitest run test/integration/installed-runtime/hook-seam.test.ts` = 4/4 pass.
