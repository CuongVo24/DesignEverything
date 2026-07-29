import { test, expect, describe } from 'vitest';
import { tokenizeShellCommand, stripQuotedContent } from './tokenizeShellCommand.js';

describe('tokenizeShellCommand — quote-aware shell tokenizer (P4.3)', () => {
  test('splits a plain unquoted command on whitespace', () => {
    expect(tokenizeShellCommand('git commit -m fix')).toEqual(['git', 'commit', '-m', 'fix']);
  });

  test('keeps a double-quoted value containing operator-lookalike text as one token', () => {
    // This is the concrete regression this module closes: a naive
    // split(/\s+/) tears the quoted value apart, and every downstream
    // consumer that regex-scans the re-joined string for shell operators
    // (evaluatePreAction's chaining-operator check) then sees a bare `&&`
    // and misclassifies an otherwise-safe quoted commit message as a
    // compound/chained shell command.
    const tokens = tokenizeShellCommand('git commit -m "fix: a && b"');
    expect(tokens).toEqual(['git', 'commit', '-m', 'fix: a && b']);
  });

  test('keeps a single-quoted value containing whitespace as one token', () => {
    expect(tokenizeShellCommand("git commit -m 'two words'")).toEqual(['git', 'commit', '-m', 'two words']);
  });

  test('single-quote nested inside a double-quoted run stays literal', () => {
    const tokens = tokenizeShellCommand(`echo "it's fine"`);
    expect(tokens).toEqual(['echo', "it's fine"]);
  });

  test('escaped double-quote inside a quoted run does not close quoting early', () => {
    const tokens = tokenizeShellCommand('git commit -m "say \\"hi\\" now"');
    expect(tokens).toEqual(['git', 'commit', '-m', 'say "hi" now']);
  });

  test('escaped backslash is preserved without consuming the next character', () => {
    const tokens = tokenizeShellCommand('echo "a\\\\b"');
    expect(tokens).toEqual(['echo', 'a\\b']);
  });

  test('a path containing a space stays one token when quoted', () => {
    expect(tokenizeShellCommand('node "adapter/claude-code/cli.mjs" status')).toEqual([
      'node',
      'adapter/claude-code/cli.mjs',
      'status',
    ]);
  });

  test('empty input yields no tokens', () => {
    expect(tokenizeShellCommand('')).toEqual([]);
  });

  test('collapses repeated whitespace between tokens', () => {
    expect(tokenizeShellCommand('git   status')).toEqual(['git', 'status']);
  });
});

describe('stripQuotedContent — redact quoted spans so operator scans ignore literal content', () => {
  test('an operator character inside a quoted argument is redacted, not a real operator', () => {
    const stripped = stripQuotedContent('git commit -m "fix: a && b"');
    expect(stripped).not.toContain('&');
    expect(stripped.trim().startsWith('git commit -m')).toBe(true);
  });

  test('an unquoted chaining operator survives stripping and is still detectable', () => {
    const stripped = stripQuotedContent('ls && rm -rf /');
    expect(stripped).toContain('&&');
  });

  test('a redirect character inside quotes is not a real redirect', () => {
    const stripped = stripQuotedContent('echo "a > b"');
    expect(stripped).not.toContain('>');
  });

  test('an unquoted redirect character still survives stripping', () => {
    const stripped = stripQuotedContent('echo hello > file.txt');
    expect(stripped).toContain('>');
  });

  test('text outside quotes on either side of a quoted span is preserved', () => {
    const stripped = stripQuotedContent('powershell -c "git clean -fd"');
    expect(stripped.toLowerCase()).toContain('powershell -c');
  });

  test('output length matches input length (position-preserving redaction)', () => {
    const raw = 'git commit -m "fix: a && b"';
    expect(stripQuotedContent(raw).length).toBe(raw.length);
  });
});
