import { describe, test, expect } from 'vitest';
import { resolveCliInvocation } from './resolve-cli-invocation.mjs';

function bashEvent(command) {
  return { tool_input: { command } };
}

describe('resolveCliInvocation — quote-aware tokenization (P8 item 9)', () => {
  test('a quoted argument containing spaces stays a single token, subcommand still resolves', () => {
    const res = resolveCliInvocation(
      bashEvent('node adapter/claude-code/cli.mjs commit --answer-text "hello world"'),
      null,
      null
    );
    expect(res.outcome).toBe('exact-operation');
    expect(res.subcommand).toBe('commit');
    expect(res.args).toEqual(['--answer-text', 'hello world']);
  });

  test('a single-quoted argument containing spaces stays a single token', () => {
    const res = resolveCliInvocation(
      bashEvent("node adapter/claude-code/cli.mjs commit --answer-text 'hello world'"),
      null,
      null
    );
    expect(res.outcome).toBe('exact-operation');
    expect(res.args).toEqual(['--answer-text', 'hello world']);
  });

  test('a quoted launcher path with a space is still recognized as the exact launcher token', () => {
    const res = resolveCliInvocation(bashEvent('node "adapter/claude-code/cli.mjs" status'), null, null);
    expect(res.outcome).toBe('exact-operation');
    expect(res.subcommand).toBe('status');
  });

  test('Unicode content inside a quoted argument is preserved intact', () => {
    const res = resolveCliInvocation(
      bashEvent('node adapter/claude-code/cli.mjs commit --answer-text "đáp án tiếng Việt"'),
      null,
      null
    );
    expect(res.args).toEqual(['--answer-text', 'đáp án tiếng Việt']);
  });
});

// P8.4 — authorizeCliOperation (a second, parallel subcommand/phase
// authority) has been deleted from this file entirely. Its decision table
// now lives once, in src/core/classifyCliSubcommand.ts (pure-function
// coverage: classifyCliSubcommand.test.ts), reached through
// evaluatePreAction the same way any other Bash command is — see
// evaluatePreAction.test.ts's "P8.2" suite for the Core-level wiring
// assertions, and hook-adversarial.test.ts for end-to-end proof through this
// real wrapper script.
