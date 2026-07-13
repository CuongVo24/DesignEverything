#!/usr/bin/env node
// PreToolUse — ép cứng "chưa đủ doc thì chưa code" theo gate-policy.
// Chuẩn hoá input của Claude Code (file_path, MultiEdit...) về hợp đồng của onPreToolUse.
import { pathToFileURL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';
import { ENGINE_ROOT, readStdinJson, workspaceRootFrom, emitJson } from './_shared.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

// Dự án chưa có state DesignEverything → không can thiệp.
if (!existsSync(join(workspaceRoot, 'progress.json'))) {
  process.exit(0);
}

const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};

// Chỉ gác Write/Edit/Bash (MultiEdit/NotebookEdit coi như Edit). Tool khác: cho qua.
let coreTool = null;
if (toolName === 'Write') coreTool = 'Write';
else if (toolName === 'Edit' || toolName === 'MultiEdit' || toolName === 'NotebookEdit') coreTool = 'Edit';
else if (toolName === 'Bash') coreTool = 'Bash';
if (!coreTool) process.exit(0);

// Bash gọi chính CLI của DesignEverything (commit/emit/status) là thao tác của phương pháp,
// luôn được phép — nếu không, skill không thể commit bước phỏng vấn nào.
if (coreTool === 'Bash') {
  const cmd = String(toolInput.command || '');
  if (/adapter[\\/]claude-code[\\/]cli\.mjs/.test(cmd)) process.exit(0);
}

// Chuẩn hoá tool_input về shape mà onPreToolUse hiểu (path / command).
let normalizedInput;
if (coreTool === 'Bash') {
  normalizedInput = { command: String(toolInput.command || '') };
} else {
  normalizedInput = {
    path: String(toolInput.file_path || toolInput.path || toolInput.notebook_path || ''),
  };
}

try {
  const { onPreToolUse } = await import(
    pathToFileURL(join(ENGINE_ROOT, 'dist/src/adapters/claude/preToolUse.js')).href
  );
  const result = onPreToolUse({ workspaceRoot, tool: coreTool, toolInput: normalizedInput });

  if (result.decision === 'deny') {
    emitJson({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[DesignEverything gate] ${result.message}`,
      },
    });
  }
  // allow → im lặng, để permission flow bình thường của Claude Code quyết.
  process.exit(0);
} catch (err) {
  console.error(`[DesignEverything PreToolUse] ${err.message}`);
  process.exit(1);
}
