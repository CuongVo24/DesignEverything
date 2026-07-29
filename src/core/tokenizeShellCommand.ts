/**
 * Quote-aware shell command tokenizer shared by every production consumer
 * that must turn a raw command string into argv without a naive
 * `split(/\s+/)` (which tears a quoted flag value containing a space, e.g.
 * `--answer-text "hello world"`, into multiple tokens and can cause a
 * command to be misclassified — a `&&` that is only text *inside* a quoted
 * argument is not a real shell chaining operator, but a caller that re-joins
 * a naively-split argv and regex-scans the result cannot tell the
 * difference).
 *
 * Consumers before this module existed each had their own copy or no
 * quote-aware path at all: `classifyCommand`'s raw fallback, `evaluateGate`'s
 * legacy `checkExecutionGate` helper, the Claude PreToolUse hook's fallback
 * (used whenever `resolveCliInvocation` did not already hand back
 * pre-tokenized argv), and the Codex PreToolUse hook (which had no
 * quote-aware path at all — see plan-v1-bonus-tasks.md P4.3). This module is
 * the single implementation all four now call.
 *
 * `adapter/claude-code/hooks/resolve-cli-invocation.mjs` intentionally keeps
 * its own local copy rather than importing this one: it must stay
 * synchronous (it runs before the async Core-bundle import, and is exercised
 * directly by a synchronous unit test), while this module is compiled
 * TypeScript reached only via the async runtime-bundle import used
 * everywhere else. Its local tokenizer received the same escape-handling fix
 * applied here, so the two stay behaviorally identical without being able to
 * share one call.
 *
 * Handles:
 *  - double- and single-quoted runs, so a flag value containing whitespace
 *    stays one token;
 *  - a backslash immediately before a quote character or another backslash
 *    escapes it (both inside and outside a quoted run), so a literal quote
 *    in an argument does not prematurely open/close quoting.
 *
 * Deliberately NOT a full shell grammar: no `$VAR`/`${VAR}` expansion, no
 * command substitution, no brace expansion, no here-docs. That remains an
 * open gap tracked as the "raw command parser" item in
 * plan-v1-bonus-tasks.md P4.3.
 */
export function tokenizeShellCommand(rawCommand: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

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

/**
 * Redacts everything that fell inside a quoted run (plus the quote
 * delimiters themselves and any escape sequence) to a single space each,
 * leaving unquoted characters untouched at their original position.
 *
 * This is what closes the "lossy round-trip" gap: several call sites
 * (`classifyCommand`'s chaining/redirection detection, `evaluatePreAction`'s
 * shell-operator check) scan a command string for operator characters
 * (`&`, `;`, `|`, `<`, `>`, `$(`, backtick) with a plain regex. Running that
 * regex against the raw text directly is wrong whenever those characters
 * occur as literal quoted content rather than real operators — e.g. a
 * commit message `git commit -m "fix: a && b"` contains `&&` only inside a
 * quoted argument, not as a chaining operator. Running the same regex
 * against this function's output instead correctly ignores it, while still
 * catching a real unquoted `ls && rm -rf /`.
 */
export function stripQuotedContent(rawCommand: string): string {
  let result = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < rawCommand.length; i++) {
    const ch = rawCommand[i];
    const next = rawCommand[i + 1];

    if (ch === '\\' && (next === '"' || next === "'" || next === '\\')) {
      // An escape sequence is always literal content, not an operator —
      // redact it the same way regardless of quote state.
      result += ' ';
      i++;
      continue;
    }

    if (quote) {
      if (ch === quote) quote = null;
      result += ' ';
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      result += ' ';
      continue;
    }

    result += ch;
  }

  return result;
}
