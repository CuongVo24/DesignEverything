import { test, expect, describe } from 'vitest';
import { resolveCliInvocation } from './resolve-cli-invocation.mjs';

describe('B4b — Exact Claude wrapper invocation contract', () => {
  describe('resolveCliInvocation', () => {
    test('resolves exact CLI invocation with node prefix', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'node adapter/claude-code/cli.mjs status' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('exact-operation');
      if (res.outcome === 'exact-operation') {
        expect(res.subcommand).toBe('status');
      }
    });

    test('resolves exact CLI invocation with direct launcher path', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'adapter/claude-code/cli.mjs commit' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('exact-operation');
      if (res.outcome === 'exact-operation') {
        expect(res.subcommand).toBe('commit');
      }
    });

    test('rejects CLI invocation chained with shell operators (&&)', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'node adapter/claude-code/cli.mjs status && rm -rf src' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('rejection');
      if (res.outcome === 'rejection') {
        expect(res.reason_code).toBe('CHAINED_CLI_COMMAND_DENIED');
      }
    });

    test('rejects CLI invocation containing output redirection (>)', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'node adapter/claude-code/cli.mjs status > out.txt' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('rejection');
    });

    test('rejects fuzzy bypass attempt via echo or fake suffix', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'echo adapter/claude-code/cli.mjs; node malicious.js' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('rejection');
    });

    test('returns not-cli for regular non-CLI commands', () => {
      const event = {
        tool_name: 'Bash',
        tool_input: { command: 'ls docs/' },
      };
      const res = resolveCliInvocation(event, null, null);
      expect(res.outcome).toBe('not-cli');
    });
  });

  // P8.4 — authorizeCliOperation deleted; its subcommand/phase table now
  // lives once in src/core/classifyCliSubcommand.ts (pure-function coverage:
  // classifyCliSubcommand.test.ts), reached through evaluatePreAction like
  // any other Bash command (evaluatePreAction.test.ts's "P8.2" suite), and
  // proven end-to-end through this real wrapper script in
  // test/integration/installed-runtime/hook-adversarial.test.ts's "P8.4"
  // tests.
});
