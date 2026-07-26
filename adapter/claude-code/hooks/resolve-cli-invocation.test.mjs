import { describe, test, expect } from 'vitest';
import { resolveCliInvocation, authorizeCliOperation } from './resolve-cli-invocation.mjs';

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

describe('authorizeCliOperation — fail-closed on unrecognized subcommand (P8 item 11)', () => {
  test('a made-up/unsupported subcommand is denied, not silently allowed', () => {
    const res = authorizeCliOperation({ subcommand: 'totally-not-a-real-subcommand' }, null);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('UNRECOGNIZED_CLI_SUBCOMMAND');
  });

  test.each(['next', 'start', 'verify', 'review'])(
    'the real dispatcher subcommand "%s" is still allowed after the default flips to deny',
    (sub) => {
      const res = authorizeCliOperation({ subcommand: sub }, null);
      expect(res.decision).toBe('allow');
    }
  );
});

describe('authorizeCliOperation — uses the real runtime snapshot, not a hardcoded phase (P8 item 10)', () => {
  test('commit is denied once the real snapshot shows the interview phase is over', () => {
    const snapshot = { progress: { phase: 'ready-to-execute' } };
    const res = authorizeCliOperation({ subcommand: 'commit' }, snapshot);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('COMMIT_NOT_ALLOWED');
  });

  test('deepen is allowed once the real snapshot shows the interview phase is over', () => {
    const snapshot = { progress: { phase: 'ready-to-execute' } };
    const res = authorizeCliOperation({ subcommand: 'deepen' }, snapshot);
    expect(res.decision).toBe('allow');
  });

  test('deepen is denied while the real snapshot still shows the interview phase', () => {
    const snapshot = { progress: { phase: 'interview' } };
    const res = authorizeCliOperation({ subcommand: 'deepen' }, snapshot);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('DEEPEN_NOT_ALLOWED');
  });

  test('a null snapshot (workspace not yet loadable) still defaults to the interview phase, unchanged from before', () => {
    const res = authorizeCliOperation({ subcommand: 'commit' }, null);
    expect(res.decision).toBe('allow');
  });
});
