export function isFindReadOnly(argv: string[]): { safe: boolean; reason_code: string; message: string } {
  if (argv.length === 0 || argv[0] !== 'find') {
    return { safe: false, reason_code: 'NOT_FIND_COMMAND', message: 'Not a find command' };
  }

  const unsafeFlags = ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fls', '-fprint', '-fprint0', '-fprintf'];
  for (const arg of argv) {
    if (unsafeFlags.includes(arg)) {
      return {
        safe: false,
        reason_code: 'FIND_UNSAFE_ACTION_DENIED',
        message: `Find command contains mutating or execution flag: "${arg}".`,
      };
    }
  }

  return { safe: true, reason_code: 'FIND_READ_ONLY', message: 'Find command is safe read-only.' };
}
