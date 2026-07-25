import {
  evaluatePreAction,
  PreActionRequest,
  AdapterCapability,
} from '../../core/index.js';

export function onPreToolUse(ctx: {
  workspaceRoot: string;
  tool: 'Write' | 'Edit' | 'Bash';
  toolInput: unknown;
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
    commandArgv = commandStr.split(/\s+/);
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
    session_id: 'default-session',
    workspace: ctx.workspaceRoot,
    action_kind: actionKind,
    tool_name: toolName,
    target_paths: targetPaths,
    command_argv: commandArgv,
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
