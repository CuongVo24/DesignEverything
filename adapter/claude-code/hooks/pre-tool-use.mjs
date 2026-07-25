#!/usr/bin/env node
// PreToolUse — ép cứng "chưa đủ doc thì chưa code" theo gate-policy.
// Chuẩn hoá input của Claude Code về hợp đồng của onPreToolUse.
import { pathToFileURL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';
import { readStdinJson, workspaceRootFrom, emitJson, resolveModule } from './_shared.mjs';
import { resolveCliInvocation, authorizeCliOperation } from './resolve-cli-invocation.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

// Dự án chưa có state DesignEverything -> không can thiệp.
if (!existsSync(join(workspaceRoot, 'progress.json')) && !existsSync(join(workspaceRoot, '.design-everything/install-manifest.json'))) {
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

// Phân tích và xác thực chính xác câu lệnh CLI nếu tool là Bash
if (coreTool === 'Bash') {
  const cliResolution = resolveCliInvocation(input, null, null);
  if (cliResolution.outcome === 'rejection') {
    emitJson({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[DesignEverything CLI protection] ${cliResolution.message}`,
      },
    });
    process.exit(0);
  }
  if (cliResolution.outcome === 'exact-operation') {
    const auth = authorizeCliOperation(cliResolution, null);
    if (auth.decision === 'deny') {
      emitJson({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `[DesignEverything CLI authorization] ${auth.message}`,
        },
      });
      process.exit(0);
    }
    // Lệnh CLI chính xác và hợp lệ -> cho phép thực thi
    process.exit(0);
  }
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
    pathToFileURL(resolveModule('adapters/claude/preToolUse.js')).href
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
  process.exit(0);
} catch (err) {
  console.error(`[DesignEverything PreToolUse] ${err.message}`);
  process.exit(1);
}
