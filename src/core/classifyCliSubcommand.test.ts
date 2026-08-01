import { test, expect, describe } from 'vitest';
import { classifyCliSubcommand } from './classifyCliSubcommand.js';

// P8.1 — pure port of adapter/claude-code/hooks/resolve-cli-invocation.mjs's
// authorizeCliOperation subcommand/phase table (see that file's own test,
// resolve-cli-invocation.test.mjs, for the .mjs-side assertions this mirrors).
// This function is not wired into evaluatePreAction yet (P8.2).
describe('P8.1 — classifyCliSubcommand', () => {
  test('a made-up/unsupported subcommand is denied, not silently allowed', () => {
    const res = classifyCliSubcommand('totally-not-a-real-subcommand', null);
    expect(res.decision).toBe('deny');
    if (res.decision === 'deny') expect(res.reason_code).toBe('UNRECOGNIZED_CLI_SUBCOMMAND');
  });

  test.each(['next', 'start', 'verify', 'review'])(
    'the real dispatcher subcommand "%s" is still allowed after the default flips to deny',
    (sub) => {
      const res = classifyCliSubcommand(sub, null);
      expect(res.decision).toBe('allow');
    }
  );

  test('commit is denied once the phase shows the interview is over', () => {
    const res = classifyCliSubcommand('commit', 'ready-to-execute');
    expect(res.decision).toBe('deny');
    if (res.decision === 'deny') expect(res.reason_code).toBe('COMMIT_NOT_ALLOWED');
  });

  test('deepen is allowed once the phase shows the interview is over', () => {
    const res = classifyCliSubcommand('deepen', 'ready-to-execute');
    expect(res.decision).toBe('allow');
  });

  test('deepen is denied while the phase still shows interview', () => {
    const res = classifyCliSubcommand('deepen', 'interview');
    expect(res.decision).toBe('deny');
    if (res.decision === 'deny') expect(res.reason_code).toBe('DEEPEN_NOT_ALLOWED');
  });

  test('a null/missing phase (workspace not yet loadable) still defaults to interview, unchanged from before', () => {
    const res = classifyCliSubcommand('commit', null);
    expect(res.decision).toBe('allow');
    const deepenRes = classifyCliSubcommand('deepen', null);
    expect(deepenRes.decision).toBe('deny');
  });

  test('a missing subcommand is denied with INVALID_CLI_OPERATION', () => {
    const res = classifyCliSubcommand(undefined, 'interview');
    expect(res.decision).toBe('deny');
    if (res.decision === 'deny') expect(res.reason_code).toBe('INVALID_CLI_OPERATION');
  });

  test.each(['status', 'help', '--help', '-h', 'init', 'repair', 'validate', 'build', 'emit'])(
    'subcommand "%s" is allowed regardless of phase',
    (sub) => {
      expect(classifyCliSubcommand(sub, 'interview').decision).toBe('allow');
      expect(classifyCliSubcommand(sub, 'ready-to-execute').decision).toBe('allow');
    }
  );

  // `amend` was allowed here while cliOperations.ts had no `amend` case, so the
  // pre-check green-lit a command the dispatcher then rejected with
  // UNKNOWN_SUBCOMMAND. It must classify like any other subcommand the real CLI
  // does not implement until B14b is approved and wired.
  test('AMD-03 — amend is denied while the dispatcher has no amend case (B14b unwired)', () => {
    for (const phase of ['interview', 'ready-to-execute', 'repairing', 'blocked', null]) {
      const res = classifyCliSubcommand('amend', phase);
      expect(res.decision, `phase=${phase}`).toBe('deny');
      if (res.decision === 'deny') expect(res.reason_code).toBe('UNRECOGNIZED_CLI_SUBCOMMAND');
    }
  });

  test('subcommand matching is case-insensitive', () => {
    expect(classifyCliSubcommand('STATUS', null).decision).toBe('allow');
    expect(classifyCliSubcommand('Commit', 'interview').decision).toBe('allow');
  });
});
