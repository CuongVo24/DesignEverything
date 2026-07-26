import { normalize } from 'path';

// Quote-aware split: a double- or single-quoted run (e.g. an --answer-text value
// containing spaces, or a launcher path containing a space) stays one token instead
// of being torn apart by a naive whitespace split. Not a full shell grammar parser —
// still no support for escaped quotes or $VAR expansion; that remains open (see
// plan-v1-bonus-tasks.md P4.3 raw-command-parser gap).
function tokenizeCommand(rawCommand) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (const ch of rawCommand) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Parses and verifies whether a Bash tool invocation is an exact CLI invocation
 * targeting adapter/claude-code/cli.mjs without shell operator tricks.
 */
export function resolveCliInvocation(event, _installManifest, _commandClassification) {
  void _installManifest;
  void _commandClassification;
  const rawCommand = (typeof event?.tool_input?.command === 'string' ? event.tool_input.command : '').trim();
  if (!rawCommand) {
    return { outcome: 'not-cli' };
  }

  // Reject shell operators, redirects, chains, and inline evaluations
  const hasSeparator = /[&;|]/.test(rawCommand);
  const hasRedirect = /[<>]/.test(rawCommand);
  const hasSubstitution = /\$\(|`/.test(rawCommand);
  const hasInlineInterpreter = /node\s+-e|python\s+-c/i.test(rawCommand);

  if (hasSeparator || hasRedirect || hasSubstitution || hasInlineInterpreter) {
    if (/adapter[\\/]claude-code[\\/]cli\.mjs/.test(rawCommand)) {
      return {
        outcome: 'rejection',
        reason_code: 'CHAINED_CLI_COMMAND_DENIED',
        message: 'Lệnh CLI không được phép kết hợp với toán tử shell hoặc nối lệnh.',
      };
    }
    return { outcome: 'not-cli' };
  }

  const tokens = tokenizeCommand(rawCommand);
  if (tokens.length === 0) return { outcome: 'not-cli' };

  let cliTokenIndex = -1;
  let isNodeLaunch = false;

  const firstToken = tokens[0].toLowerCase();
  if (firstToken === 'node' || firstToken === 'node.exe') {
    isNodeLaunch = true;
    if (tokens.length >= 2) {
      cliTokenIndex = 1;
    }
  } else if (tokens[0].includes('cli.mjs') || tokens[0].includes('cli.js')) {
    cliTokenIndex = 0;
  }

  if (cliTokenIndex === -1) {
    if (/adapter[\\/]claude-code[\\/]cli\.mjs/.test(rawCommand)) {
      return {
        outcome: 'rejection',
        reason_code: 'MALFORMED_CLI_INVOCATION',
        message: 'Cấu trúc lệnh CLI không hợp lệ.',
      };
    }
    return { outcome: 'not-cli' };
  }

  const targetToken = tokens[cliTokenIndex];
  const normalizedPath = normalize(targetToken).replace(/\\/g, '/');

  const isExactCliPath =
    normalizedPath === 'adapter/claude-code/cli.mjs' ||
    normalizedPath === './adapter/claude-code/cli.mjs' ||
    normalizedPath === 'adapter/claude-code/cli.js' ||
    normalizedPath === './adapter/claude-code/cli.js';

  if (!isExactCliPath) {
    return {
      outcome: 'rejection',
      reason_code: 'INVALID_CLI_LAUNCHER',
      message: `Đường dẫn launcher CLI không hợp lệ: "${targetToken}". Phải là exact canonical launcher "adapter/claude-code/cli.mjs".`,
    };
  }

  const subcommandIndex = cliTokenIndex + 1;
  const subcommand = tokens[subcommandIndex] || 'status';
  const args = tokens.slice(subcommandIndex + 1);

  return {
    outcome: 'exact-operation',
    subcommand,
    args,
    launcherPath: 'adapter/claude-code/cli.mjs',
    isNodeLaunch,
  };
}

/**
 * Authorizes whether an exact CLI subcommand operation is allowed for the current
 * Core runtime snapshot.
 */
export function authorizeCliOperation(operation, runtimeSnapshot) {
  if (!operation || !operation.subcommand) {
    return {
      decision: 'deny',
      reason_code: 'INVALID_CLI_OPERATION',
      message: 'Không xác định được subcommand CLI.',
    };
  }

  const sub = operation.subcommand.toLowerCase();
  const phase = runtimeSnapshot?.progress?.phase || 'interview';

  // 1. Status diagnostic is always allowed
  if (sub === 'status' || sub === 'help' || sub === '--help' || sub === '-h') {
    return { decision: 'allow' };
  }

  // 2. Init & repair are allowed for setup/recovery
  if (sub === 'init' || sub === 'repair') {
    return { decision: 'allow' };
  }

  // 3. Validate is allowed in docs-emitted, ready-for-validation, plan-validating, or blocked
  if (sub === 'validate' || sub === 'build') {
    return { decision: 'allow' };
  }

  // 4. Commit is allowed during interview phase
  if (sub === 'commit') {
    if (phase === 'interview') {
      return { decision: 'allow' };
    }
    return {
      decision: 'deny',
      reason_code: 'COMMIT_NOT_ALLOWED',
      message: 'Lệnh "commit" chỉ được thực hiện trong pha phỏng vấn.',
    };
  }

  // 5. Emit is allowed when ready to build or docs emitted
  if (sub === 'emit') {
    return { decision: 'allow' };
  }

  // 6. Amend is allowed for plan amendments
  if (sub === 'amend') {
    return { decision: 'allow' };
  }

  // 7. Deepen is allowed when interview is complete
  if (sub === 'deepen') {
    if (phase !== 'interview') {
      return { decision: 'allow' };
    }
    return {
      decision: 'deny',
      reason_code: 'DEEPEN_NOT_ALLOWED',
      message: 'Lệnh "deepen" chỉ được thực hiện khi đã hoàn tất phỏng vấn lõi.',
    };
  }

  // 8. Remaining real dispatcher subcommands (read/inspect/state-advance) are safe
  // regardless of phase — cliOperations.ts itself re-validates state on each of these.
  if (sub === 'next' || sub === 'start' || sub === 'verify' || sub === 'review') {
    return { decision: 'allow' };
  }

  // Unrecognized subcommand: fail closed instead of assuming it is read-only-safe.
  // The real CLI dispatcher (cliOperations.ts) denies unknown subcommands too, but
  // this pre-check must not tell the model an unknown command was fine to run.
  return {
    decision: 'deny',
    reason_code: 'UNRECOGNIZED_CLI_SUBCOMMAND',
    message: `Subcommand CLI không được nhận diện: "${operation.subcommand}".`,
  };
}
