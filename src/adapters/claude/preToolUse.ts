import {
  evaluatePreAction,
  PreActionRequest,
  AdapterCapability,
  tokenizeShellCommand,
} from '../../core/index.js';

export function onPreToolUse(ctx: {
  workspaceRoot: string;
  tool: 'Write' | 'Edit' | 'Bash';
  toolInput: unknown;
  sessionId?: string;
  /** Pre-tokenized argv (e.g. resolveCliInvocation.mjs's quote-aware
   * tokenizer), used verbatim when present instead of tokenizeShellCommand
   * below — P8.3, so a quoted argument containing a space (e.g.
   * --answer-text "hello world") reaches Core correctly split instead of
   * torn apart. Falls back to Core's own quote-aware tokenizeShellCommand
   * (P4.3) when absent — every non-CLI-shaped Bash command takes this path,
   * since resolveCliInvocation only hands back pre-tokenized argv for a
   * recognized exact CLI invocation. */
  commandArgv?: string[];
}): { decision: 'allow' | 'deny'; message?: string } {
  let actionKind: 'write' | 'read' | 'shell' = 'write';
  const toolName = ctx.tool.toLowerCase();
  let targetPaths: string[] = [];
  let commandStr = '';
  let commandArgv: string[] = [];

  if (ctx.tool === 'Write' || ctx.tool === 'Edit') {
    actionKind = 'write';
    let rawPath = '';
    if (typeof ctx.toolInput === 'string') {
      rawPath = ctx.toolInput;
    } else if (ctx.toolInput && typeof ctx.toolInput === 'object') {
      const obj = ctx.toolInput as Record<string, unknown>;
      rawPath =
        (typeof obj.path === 'string' ? obj.path : '') ||
        (typeof obj.filepath === 'string' ? obj.filepath : '') ||
        (typeof obj.file === 'string' ? obj.file : '') ||
        '';
    }

    if (!rawPath) {
      return { decision: 'deny', message: 'Không chỉ định đường dẫn tệp để sửa đổi.' };
    }
    targetPaths = [rawPath];
  } else if (ctx.tool === 'Bash') {
    actionKind = 'shell';
    if (typeof ctx.toolInput === 'string') {
      commandStr = ctx.toolInput;
    } else if (ctx.toolInput && typeof ctx.toolInput === 'object') {
      const obj = ctx.toolInput as Record<string, unknown>;
      commandStr = typeof obj.command === 'string' ? obj.command : '';
    }

    if (!commandStr || !commandStr.trim()) {
      return { decision: 'deny', message: 'Không chỉ định lệnh thực thi.' };
    }
    commandStr = commandStr.trim();
    commandArgv = ctx.commandArgv && ctx.commandArgv.length > 0 ? ctx.commandArgv : tokenizeShellCommand(commandStr);
  }

  const capability: AdapterCapability = {
    runtime: 'claude',
    intercepts: ['write', 'edit', 'bash'],
    enforcement_boundary: 'adapter-wrapper',
    config_surface: 'hooks',
    known_gaps: [],
  };

  const request: PreActionRequest = {
    runtime: 'claude',
    session_id: ctx.sessionId || 'unknown',
    workspace: ctx.workspaceRoot,
    action_kind: actionKind,
    tool_name: toolName,
    target_paths: targetPaths,
    command_argv: commandArgv,
    command_raw: ctx.tool === 'Bash' ? commandStr : undefined,
  };

  const result = evaluatePreAction(request, capability);

  if (result.decision === 'deny') {
    return {
      decision: 'deny',
      message: result.user_message,
    };
  }

  return {
    decision: 'allow',
  };
}
