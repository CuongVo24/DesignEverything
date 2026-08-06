// A1-P9 (B4d) — completion text, including the hook merge report (#5/#7:
// changed/preserved/conflict is now observable instead of only happening
// silently inside settings.json).
function describeHookReport(report) {
  const lines = [];
  for (const { id, action } of report.changed) {
    lines.push(`  - ${id}: ${action === 'added' ? 'thêm mới' : 'sửa lại (hook cũ/legacy đã migrate)'}`);
  }
  for (const { id, removedDuplicates } of report.conflicts) {
    lines.push(`  - ${id}: gỡ ${removedDuplicates} entry trùng (conflict giữa hook cũ và hook versioned)`);
  }
  if (lines.length === 0) return '  (không có hook nào cần sửa — mọi hook đã đúng)';
  return lines.join('\n');
}

export function renderCompletionText({ targetRoot, runtimeRelDir, healthResult, hookReport }) {
  return `✅ Đã cài DesignEverything (adapter Claude Code, tự chứa) vào: ${targetRoot}

Cài đặt gồm:
  ${runtimeRelDir}/runtime.mjs      (esbuild bundle, tự chứa — không phụ thuộc node_modules)
  ${runtimeRelDir}/cli.mjs          (launcher target-local)
  ${runtimeRelDir}/hooks/           (3 hook: SessionStart, UserPromptSubmit, PreToolUse)
  .claude/settings.json                    (hooks trỏ target-local, không còn ENGINE_ROOT)
  .claude/skills/design-everything/SKILL.md
  .claude/skills/build/SKILL.md
  Design/Content/interview-script/         (script, gate-policy, shapes, deepen-script)
  Design/Content/artifact-catalog.yaml
  Design/Content/doc-templates/

Hook wiring:
${describeHookReport(hookReport)}

Health check target-local sau cài: ${healthResult.ok ? 'OK' : `LỖI (${healthResult.reason_code})`} — ${healthResult.message}
${healthResult.next_command ? `Tiếp theo: ${healthResult.next_command}` : ''}

Cách test:
  1. cd "${targetRoot}"
  2. Mở phiên Claude Code MỚI (hooks chỉ nạp lúc khởi động phiên).
  3. Gõ: /design-everything  → trả lời phỏng vấn từng câu.`;
}
