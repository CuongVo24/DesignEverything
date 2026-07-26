import { canonicalizeWorkspacePath } from '../pathPolicy.js';

const SAFE_BRANCH_FLAGS = new Set([
  '-a', '--all',
  '-r', '--remotes',
  '-v', '-vv', '--verbose',
  '-l', '--list',
  '--show-current',
  '--no-color', '--color',
]);

export function isGitReadOnly(argv: string[], cwd?: string): { safe: boolean; reason_code: string; message: string } {
  if (argv.length === 0 || argv[0] !== 'git') {
    return { safe: false, reason_code: 'NOT_GIT_COMMAND', message: 'Not a git command' };
  }

  // Extract subcommand (skipping global flags like -C, --git-dir, etc.)
  let subIndex = 1;
  while (subIndex < argv.length) {
    const arg = argv[subIndex];
    if (arg === '-C' || arg === '--git-dir' || arg === '--work-tree') {
      const value = argv[subIndex + 1];
      const scopeCheck = assertGitScopeWithinWorkspace(arg, value, cwd);
      if (scopeCheck) return scopeCheck;
      subIndex += 2;
    } else if (arg.startsWith('--git-dir=') || arg.startsWith('--work-tree=')) {
      const value = arg.slice(arg.indexOf('=') + 1);
      const scopeCheck = assertGitScopeWithinWorkspace(arg.slice(0, arg.indexOf('=')), value, cwd);
      if (scopeCheck) return scopeCheck;
      subIndex += 1;
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
    const rest = argv.slice(subIndex + 1);
    const hasMutationFlag = rest.some((a) => a === '-d' || a === '-D' || a === '-m' || a === '-M' || a === '--delete');
    if (hasMutationFlag) {
      return {
        safe: false,
        reason_code: 'GIT_BRANCH_MUTATION_DENIED',
        message: 'Git branch deletion or modification flag is disallowed.',
      };
    }

    const hasListFlag = rest.includes('--list') || rest.includes('-l');
    for (const a of rest) {
      if (a.startsWith('-')) {
        if (!SAFE_BRANCH_FLAGS.has(a)) {
          return {
            safe: false,
            reason_code: 'GIT_BRANCH_MUTATION_DENIED',
            message: `Git branch flag "${a}" is not proven read-only.`,
          };
        }
      } else if (!hasListFlag) {
        // A bare positional argument without --list is a new branch name
        // and/or start-point — creates or renames a branch.
        return {
          safe: false,
          reason_code: 'GIT_BRANCH_MUTATION_DENIED',
          message: 'Git branch with a new branch name/start-point argument may create a branch.',
        };
      }
    }
  }

  return { safe: true, reason_code: 'GIT_READ_ONLY', message: `Git ${sub} is safe read-only.` };
}

function assertGitScopeWithinWorkspace(
  flag: string,
  value: string | undefined,
  cwd: string | undefined
): { safe: false; reason_code: string; message: string } | null {
  if (!cwd || value === undefined) {
    return {
      safe: false,
      reason_code: 'GIT_SCOPE_UNRESOLVED_DENIED',
      message: `Git option "${flag}" changes scope and cannot be resolved against the workspace root; failing closed.`,
    };
  }
  const canon = canonicalizeWorkspacePath(cwd, value);
  if (!canon.ok) {
    return {
      safe: false,
      reason_code: 'GIT_SCOPE_ESCAPE_DENIED',
      message: `Git option "${flag} ${value}" points outside the workspace.`,
    };
  }
  return null;
}
