export function isGitReadOnly(argv: string[]): { safe: boolean; reason_code: string; message: string } {
  if (argv.length === 0 || argv[0] !== 'git') {
    return { safe: false, reason_code: 'NOT_GIT_COMMAND', message: 'Not a git command' };
  }

  // Extract subcommand (skipping global flags like -C, --git-dir, etc.)
  let subIndex = 1;
  while (subIndex < argv.length) {
    const arg = argv[subIndex];
    if (arg === '-C' || arg === '--git-dir' || arg === '--work-tree') {
      subIndex += 2;
    } else if (arg.startsWith('-')) {
      subIndex += 1;
    } else {
      break;
    }
  }

  if (subIndex >= argv.length) {
    // Plain 'git' command with version/help
    return { safe: true, reason_code: 'GIT_READ_ONLY', message: 'Plain git command is safe' };
  }

  const sub = argv[subIndex];
  const safeSubcommands = ['status', 'diff', 'log', 'show', 'ls-files', 'rev-parse', 'version', 'help', 'branch'];

  if (!safeSubcommands.includes(sub)) {
    return {
      safe: false,
      reason_code: 'DISALLOWED_GIT_SUBCOMMAND',
      message: `Git subcommand "${sub}" is mutating or disallowed.`,
    };
  }

  // Special checks for 'branch'
  if (sub === 'branch') {
    const hasMutationFlag = argv.some((a) => a === '-d' || a === '-D' || a === '-m' || a === '-M' || a === '--delete');
    if (hasMutationFlag) {
      return {
        safe: false,
        reason_code: 'GIT_BRANCH_MUTATION_DENIED',
        message: 'Git branch deletion or modification flag is disallowed.',
      };
    }
  }

  return { safe: true, reason_code: 'GIT_READ_ONLY', message: `Git ${sub} is safe read-only.` };
}
