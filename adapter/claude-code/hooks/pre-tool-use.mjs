#!/usr/bin/env node
// PreToolUse — ép cứng "chưa đủ doc thì chưa code" theo gate-policy.
// Chuẩn hoá input của Claude Code về hợp đồng của onPreToolUse.
import { pathToFileURL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';
import { readStdinJson, workspaceRootFrom, emitJson, resolveModule, resolveCliLauncherPath } from './_shared.mjs';
import { resolveCliInvocation } from './resolve-cli-invocation.mjs';

const input = await readStdinJson();
const workspaceRoot = workspaceRootFrom(input);

// Dự án chưa có state DesignEverything -> không can thiệp. P2.2a: canonical
// interview-state.json là nguồn thật; progress.json chỉ còn kiểm tra cho
// tương thích ngược với workspace chưa migrate.
if (
  !existsSync(join(workspaceRoot, '.design-everything/interview-state.json')) &&
  !existsSync(join(workspaceRoot, 'progress.json')) &&
  !existsSync(join(workspaceRoot, '.design-everything/install-manifest.json'))
) {
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

// P8.4 — resolveCliInvocation stays: it's a parsing-layer concern (quote-aware
// tokenizer + shell-operator/launcher-path injection guard) Core has no
// equivalent for. What it no longer does is decide allow/deny for a
// recognized CLI operation itself (authorizeCliOperation, deleted) — that
// subcommand/phase authority now lives solely in Core
// (evaluatePreAction's classifyCliShellCommand / classifyCliSubcommand),
// reached via the same onPreToolUse call every other Bash command goes
// through below. Two authorities that could silently diverge collapse into
// one.
let preTokenizedArgv;
if (coreTool === 'Bash') {
  // P8.4/bugfix — resolveCliLauncherPath() computes THIS install's real
  // launcher path (target-local absolute cli.mjs when installed, dev-mode
  // source-relative path otherwise). Without passing it through, an
  // installed target's own hook denied the exact absolute-path command its
  // own installed SKILL.md teaches the agent to run — resolveCliInvocation
  // only ever recognized the dev-mode literal.
  const cliResolution = resolveCliInvocation(input, resolveCliLauncherPath(), null);
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
    // Reconstruct full argv (node <launcher> <subcommand> ...args) from
    // resolveCliInvocation's own quote-aware tokens, so Core's
    // isCliInvocation/classifyCliSubcommand see exactly what was actually
    // typed — not a re-split, mangled version of it.
    preTokenizedArgv = ['node', cliResolution.launcherPath, cliResolution.subcommand, ...cliResolution.args];
  }
}

// Chuẩn hoá tool_input về shape mà onPreToolUse hiểu (path / command).
// P4.2/R07 — content/new_string/edits được giữ nguyên (không chỉ path) để
// onPreToolUse tính được content_size_bytes cho write-gate size cap; trước
// đây các field này bị bỏ hẳn nên size chỉ được kiểm ở read-time
// (loadQuestionSlots), không phải tại điểm ghi.
let normalizedInput;
if (coreTool === 'Bash') {
  normalizedInput = { command: String(toolInput.command || '') };
} else {
  normalizedInput = {
    path: String(toolInput.file_path || toolInput.path || toolInput.notebook_path || ''),
    content: typeof toolInput.content === 'string' ? toolInput.content : undefined,
    new_string: typeof toolInput.new_string === 'string' ? toolInput.new_string : undefined,
    edits: Array.isArray(toolInput.edits) ? toolInput.edits : undefined,
  };
}

try {
  const { onPreToolUse } = await import(
    pathToFileURL(resolveModule('adapters/claude/preToolUse.js')).href
  );
  const result = onPreToolUse({
    workspaceRoot,
    tool: coreTool,
    toolInput: normalizedInput,
    sessionId: typeof input.session_id === 'string' ? input.session_id : undefined,
    commandArgv: preTokenizedArgv,
  });

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
