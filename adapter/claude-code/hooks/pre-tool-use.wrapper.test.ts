import { test, expect, describe } from 'vitest';
import { resolveCliInvocation, authorizeCliOperation } from './resolve-cli-invocation.mjs';

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

  describe('authorizeCliOperation', () => {
    test('authorizes status and help subcommands', () => {
      const auth = authorizeCliOperation({ subcommand: 'status' }, null);
      expect(auth.decision).toBe('allow');
    });

    test('authorizes valid commit during interview phase', () => {
      const auth = authorizeCliOperation(
        { subcommand: 'commit' },
        { progress: { phase: 'interview' } }
      );
      expect(auth.decision).toBe('allow');
    });

    test('denies commit outside interview phase', () => {
      const auth = authorizeCliOperation(
        { subcommand: 'commit' },
        { progress: { phase: 'ready-to-build' } }
      );
      expect(auth.decision).toBe('deny');
      if (auth.decision === 'deny') {
        expect(auth.reason_code).toBe('COMMIT_NOT_ALLOWED');
      }
    });
  });
});
