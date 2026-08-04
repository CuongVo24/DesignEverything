/**
 * P10 (bonus-plan Phase 6, item 3) — the machine-checkable inventory of every
 * subcommand + flag the dispatcher actually recognizes (getArg/hasFlag call
 * sites across the cliOps modules and deepenCliOperations.ts). `--json` is
 * global (handled by cli.mjs's launcher, not this dispatcher) and legal on
 * every subcommand, so it's tracked separately rather than repeated below.
 * test/docs/skill-truth.test.ts cross-checks this table against both the three
 * adapter SKILL.md files (nothing taught that doesn't exist) and the real
 * getArg/hasFlag source (nothing here that isn't actually parsed) — that second
 * direction is what keeps this table itself from drifting.
 */
export const CLI_COMMAND_SURFACE: Record<string, readonly string[]> = {
  status: [],
  init: [],
  commit: ['--branch', '--calibrate', '--capability-token', '--answer', '--slots-file', '--ack-warnings'],
  validate: [],
  build: [],
  repair: [],
  emit: ['--slots-file'],
  next: [],
  start: ['--task'],
  verify: ['--task', '--command', '--confirm'],
  review: ['--milestone'],
  deepen: [
    '--module',
    '--opt-in',
    '--next',
    '--commit',
    '--capability-token',
    '--question',
    '--answer',
    '--subject',
    '--emit',
  ],
};

export const CLI_GLOBAL_FLAGS: readonly string[] = ['--json'];
