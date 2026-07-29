import { normalize } from 'path';

// Quote-aware split: a double- or single-quoted run (e.g. an --answer-text value
// containing spaces, or a launcher path containing a space) stays one token instead
// of being torn apart by a naive whitespace split, and a backslash-escaped quote
// character doesn't prematurely close/open quoting. Not a full shell grammar parser
// — still no $VAR expansion, command substitution, or brace expansion; that remains
// open (see plan-v1-bonus-tasks.md P4.3 raw-command-parser gap).
//
// This stays a local, synchronous copy rather than importing the shared
// src/core/tokenizeShellCommand.ts (which every other production call site now
// uses): this function runs before the async Core-bundle import below and is
// exercised directly by resolve-cli-invocation.test.mjs's synchronous API, so it
// cannot become an awaited dynamic import without changing that call contract. The
// escape-handling fix below keeps it behaviorally identical to the shared version.
function tokenizeCommand(rawCommand) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < rawCommand.length; i++) {
    const ch = rawCommand[i];
    const next = rawCommand[i + 1];
    if (ch === '\\' && (next === '"' || next === "'" || next === '\\')) {
      current += next;
      i++;
      continue;
    }
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

// Drive-letter-insensitive, separator-normalized comparison — mirrors
// src/core/pathPolicy.ts's normalizeDrive, duplicated here (not imported)
// for the same synchronous-before-Core-loads reason tokenizeCommand above
// stays local.
function normalizeForComparison(p) {
  const norm = normalize(p).replace(/\\/g, '/');
  if (norm.length >= 2 && norm[1] === ':') {
    return norm[0].toLowerCase() + norm.slice(1);
  }
  return norm;
}

/**
 * Parses and verifies whether a Bash tool invocation is an exact CLI invocation
 * targeting this install's own cli.mjs launcher, without shell operator tricks.
 */
export function resolveCliInvocation(event, expectedLauncherPath, _commandClassification) {
  void _commandClassification;
  const rawCommand = (typeof event?.tool_input?.command === 'string' ? event.tool_input.command : '').trim();
  if (!rawCommand) {
    return { outcome: 'not-cli' };
  }

  // The dev-mode source-relative path always stays recognized (running
  // straight from this checkout, and this file's own synchronous unit
  // test, never supply an installed launcher path). A real target-local
  // install's SKILL.md teaches an absolute path instead
  // (.design-everything/runtime/<version>/cli.mjs) — expectedLauncherPath,
  // computed by the caller from this hook's own on-disk location
  // (_shared.mjs's resolveCliLauncherPath), is what makes that path
  // recognized too. Before this fix, only the dev-mode literal was ever
  // checked, so an installed target's own hook denied the exact command
  // its own installed SKILL.md teaches the agent to run.
  const normalizedExpected = expectedLauncherPath ? normalizeForComparison(expectedLauncherPath) : null;
  const devModeExactPaths = new Set([
    'adapter/claude-code/cli.mjs',
    './adapter/claude-code/cli.mjs',
    'adapter/claude-code/cli.js',
    './adapter/claude-code/cli.js',
  ]);

  function mentionsCliLauncher(text) {
    if (/adapter[\\/]claude-code[\\/]cli\.mjs/.test(text)) return true;
    if (normalizedExpected && normalizeForComparison(text).includes(normalizedExpected)) return true;
    return false;
  }

  // Reject shell operators, redirects, chains, and inline evaluations
  const hasSeparator = /[&;|]/.test(rawCommand);
  const hasRedirect = /[<>]/.test(rawCommand);
  const hasSubstitution = /\$\(|`/.test(rawCommand);
  const hasInlineInterpreter = /node\s+-e|python\s+-c/i.test(rawCommand);

  if (hasSeparator || hasRedirect || hasSubstitution || hasInlineInterpreter) {
    if (mentionsCliLauncher(rawCommand)) {
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
    if (mentionsCliLauncher(rawCommand)) {
      return {
        outcome: 'rejection',
        reason_code: 'MALFORMED_CLI_INVOCATION',
        message: 'Cấu trúc lệnh CLI không hợp lệ.',
      };
    }
    return { outcome: 'not-cli' };
  }

  const targetToken = tokens[cliTokenIndex];
  const normalizedPath = normalizeForComparison(targetToken);

  const isExactCliPath =
    devModeExactPaths.has(normalizedPath) || (normalizedExpected !== null && normalizedPath === normalizedExpected);

  if (!isExactCliPath) {
    return {
      outcome: 'rejection',
      reason_code: 'INVALID_CLI_LAUNCHER',
      message: `Đường dẫn launcher CLI không hợp lệ: "${targetToken}". Phải là exact canonical launcher "${expectedLauncherPath ?? 'adapter/claude-code/cli.mjs'}".`,
    };
  }

  const subcommandIndex = cliTokenIndex + 1;
  const subcommand = tokens[subcommandIndex] || 'status';
  const args = tokens.slice(subcommandIndex + 1);

  return {
    outcome: 'exact-operation',
    subcommand,
    args,
    launcherPath: targetToken,
    isNodeLaunch,
  };
}
