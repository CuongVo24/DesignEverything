import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { resolveCorePath } from './_shared.mjs';

function deny(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
}

function allow() {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    })
  );
}

function extractApplyPatchPaths(patchText) {
  const paths = [];
  if (!patchText) return paths;
  const lines = patchText.split(/\r?\n/);
  const markers = [
    /^\*\*\*\s+Add File:\s+(.+)$/,
    /^\*\*\*\s+Update File:\s+(.+)$/,
    /^\*\*\*\s+Delete File:\s+(.+)$/,
    /^\*\*\*\s+Move to:\s+(.+)$/,
  ];
  for (const line of lines) {
    for (const marker of markers) {
      const m = line.match(marker);
      if (m) {
        paths.push(m[1].trim());
      }
    }
  }
  return paths;
}

async function main() {
  let payload;
  try {
    const inputStr = readFileSync(0, 'utf8');
    if (!inputStr || !inputStr.trim()) {
      deny('DesignEverything hook received an empty payload; blocking to fail closed.');
      return;
    }
    payload = JSON.parse(inputStr);
  } catch (error) {
    deny(`DesignEverything hook could not parse the tool payload (${error.message}); blocking to fail closed.`);
    return;
  }

  try {
    const workspace = payload.cwd || process.cwd();
    // P2.2a: canonical interview-state.json là nguồn thật; progress.json chỉ
    // còn kiểm tra cho tương thích ngược với workspace chưa migrate. P8: một
    // install-manifest tồn tại (bundle đã cài, chưa có state file nào) cũng
    // phải bị coi là "đã involved" — nếu không, một project vừa install
    // xong nhưng chưa init state sẽ bypass hoàn toàn hook này, khác hành vi
    // với Claude side (xem pre-tool-use.mjs của claude-code).
    if (
      !existsSync(join(workspace, '.design-everything', 'interview-state.json')) &&
      !existsSync(join(workspace, 'progress.json')) &&
      !existsSync(join(workspace, '.design-everything', 'execution-state.json')) &&
      !existsSync(join(workspace, '.design-everything', 'install-manifest.json'))
    ) {
      allow();
      return;
    }

    const tool_name = payload.tool_name || '';
    if (!['Bash', 'apply_patch', 'Write', 'Edit'].includes(tool_name)) {
      allow();
      return;
    }
    const toolInput = payload.tool_input || {};
    let action_kind = 'external';
    let target_paths = [];
    let command_argv = [];
    let command_raw;

    if (tool_name === 'Bash') {
      action_kind = 'shell';
      command_raw = (toolInput.command || '').trim();
      // Tokenized below, once Core is loaded (P4.3 — this hook previously
      // had no quote-aware tokenization path at all, unlike the Claude
      // adapter's resolveCliInvocation/tokenizeShellCommand fallback).
    } else if (tool_name === 'apply_patch') {
      action_kind = 'write';
      const patchText = toolInput.command || toolInput.input || toolInput.patch || '';
      target_paths = extractApplyPatchPaths(patchText);
      if (target_paths.length === 0 && (toolInput.path || toolInput.file_path)) {
        target_paths = [toolInput.path || toolInput.file_path];
      }
    } else if (tool_name === 'Write' || tool_name === 'Edit') {
      action_kind = 'write';
      const path = toolInput.path || toolInput.file_path || '';
      if (path) target_paths = [path];
    }

    const corePath = resolveCorePath();
    if (!corePath) {
      deny('DesignEverything core runtime was not found next to the plugin; reinstall the plugin (installer bundles core/). Blocking to fail closed.');
      return;
    }

    const { evaluatePreAction, tokenizeShellCommand } = await import(pathToFileURL(corePath).href);

    if (tool_name === 'Bash') {
      command_argv = command_raw ? tokenizeShellCommand(command_raw) : [];
    }

    const request = {
      runtime: 'codex',
      tool_name,
      action_kind,
      target_paths,
      command_argv,
      command_raw,
      workspace,
      session_id: payload.session_id || 'unknown',
    };

    const decision = evaluatePreAction(request);

    if (decision.decision === 'allow') {
      allow();
    } else {
      deny(decision.user_message);
    }
  } catch (error) {
    deny(`DesignEverything hook failed while evaluating the action (${error.message}); blocking to fail closed.`);
  }
}

main();
