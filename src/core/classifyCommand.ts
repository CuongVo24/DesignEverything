import { isGitReadOnly } from './commandPolicies/gitReadOnly.js';
import { isFindReadOnly } from './commandPolicies/findReadOnly.js';

export type CommandClassificationOutcome = 'proven_read_only' | 'mutation' | 'unknown';

export interface CommandClassification {
  outcome: CommandClassificationOutcome;
  reason_code: string;
  message: string;
  executable?: string;
  subcommand?: string;
}

export interface ClassifyCommandInput {
  shell?: string;
  raw?: string;
  argv?: string[];
  cwd?: string;
}

const SAFE_READ_ONLY_EXECUTABLES = [
  'cat',
  'less',
  'more',
  'tail',
  'head',
  'ls',
  'dir',
  'pwd',
  'grep',
  'rg',
  'echo',
  'whoami',
  'date',
];

export function classifyCommand(input: ClassifyCommandInput): CommandClassification {
  let argv = input.argv;

  // Fallback to simple split if only raw is provided
  if ((!argv || argv.length === 0) && input.raw) {
    argv = input.raw.trim().split(/\s+/);
  }

  if (!argv || argv.length === 0) {
    return {
      outcome: 'unknown',
      reason_code: 'EMPTY_COMMAND',
      message: 'Command is empty or cannot be parsed.',
    };
  }

  const rawStr = input.raw || argv.join(' ');

  // 1. Check for shell redirection operators (>, >>, Out-File, Set-Content)
  if (
    rawStr.includes('>') ||
    rawStr.includes('>>') ||
    rawStr.toLowerCase().includes('out-file') ||
    rawStr.toLowerCase().includes('set-content')
  ) {
    return {
      outcome: 'mutation',
      reason_code: 'SHELL_REDIRECTION_DENIED',
      message: 'Shell write redirection operator detected.',
    };
  }

  // 2. Check for shell chaining/piping or nested shell invocations
  // Note: single semicolon at the very end of argv (like find -exec ... ;) is not compound chaining
  const hasChainingOperator =
    rawStr.includes('&&') ||
    rawStr.includes('||') ||
    (rawStr.includes(';') && !rawStr.endsWith(';')) ||
    rawStr.includes('|') ||
    rawStr.toLowerCase().includes('powershell -c') ||
    rawStr.toLowerCase().includes('powershell -command') ||
    rawStr.toLowerCase().includes('cmd /c') ||
    rawStr.toLowerCase().includes('bash -c');

  if (hasChainingOperator) {
    return {
      outcome: 'unknown',
      reason_code: 'COMPOUND_OR_NESTED_SHELL_DENIED',
      message: 'Compound, chained, piped, or nested shell commands are unproven and fail-closed.',
    };
  }

  const exe = argv[0].toLowerCase().replace(/\.exe$/, '');

  // 3. Safe read-only executables
  if (SAFE_READ_ONLY_EXECUTABLES.includes(exe)) {
    return {
      outcome: 'proven_read_only',
      reason_code: 'SAFE_EXECUTABLE',
      message: `Executable "${exe}" is classified as safe read-only.`,
      executable: exe,
    };
  }

  // 4. Git command policy
  if (exe === 'git') {
    const gitRes = isGitReadOnly(argv, input.cwd);
    if (gitRes.safe) {
      return {
        outcome: 'proven_read_only',
        reason_code: gitRes.reason_code,
        message: gitRes.message,
        executable: 'git',
        subcommand: argv[1],
      };
    } else {
      return {
        outcome: 'mutation',
        reason_code: gitRes.reason_code,
        message: gitRes.message,
        executable: 'git',
        subcommand: argv[1],
      };
    }
  }

  // 5. Find command policy
  if (exe === 'find') {
    const findRes = isFindReadOnly(argv);
    if (findRes.safe) {
      return {
        outcome: 'proven_read_only',
        reason_code: findRes.reason_code,
        message: findRes.message,
        executable: 'find',
      };
    } else {
      return {
        outcome: 'mutation',
        reason_code: findRes.reason_code,
        message: findRes.message,
        executable: 'find',
      };
    }
  }

  // Fail-closed for all unknown executables
  return {
    outcome: 'unknown',
    reason_code: 'UNPROVEN_EXECUTABLE',
    message: `Executable "${exe}" is unknown and cannot be proven read-only.`,
    executable: exe,
  };
}
