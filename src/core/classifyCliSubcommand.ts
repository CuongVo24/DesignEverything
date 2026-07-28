export type ClassifyCliSubcommandResult =
  | { decision: 'allow' }
  | { decision: 'deny'; reason_code: string; message: string };

// P8.1 — ports adapter/claude-code/hooks/resolve-cli-invocation.mjs's
// authorizeCliOperation subcommand/phase table into Core verbatim (same
// reason codes), as a pure, unwired function. This is the table Core needs
// so evaluatePreAction's shell branches can gain the exact subcommand-level
// authority the .mjs wrapper currently applies on its own, parallel to Core.
export function classifyCliSubcommand(
  subcommand: string | undefined,
  phase: string | null | undefined
): ClassifyCliSubcommandResult {
  if (!subcommand) {
    return {
      decision: 'deny',
      reason_code: 'INVALID_CLI_OPERATION',
      message: 'Không xác định được subcommand CLI.',
    };
  }

  const sub = subcommand.toLowerCase();
  const effectivePhase = phase || 'interview';

  // 1. Status diagnostic is always allowed
  if (sub === 'status' || sub === 'help' || sub === '--help' || sub === '-h') {
    return { decision: 'allow' };
  }

  // 2. Init & repair are allowed for setup/recovery
  if (sub === 'init' || sub === 'repair') {
    return { decision: 'allow' };
  }

  // 3. Validate is allowed in docs-emitted, ready-for-validation, plan-validating, or blocked
  if (sub === 'validate' || sub === 'build') {
    return { decision: 'allow' };
  }

  // 4. Commit is allowed during interview phase
  if (sub === 'commit') {
    if (effectivePhase === 'interview') {
      return { decision: 'allow' };
    }
    return {
      decision: 'deny',
      reason_code: 'COMMIT_NOT_ALLOWED',
      message: 'Lệnh "commit" chỉ được thực hiện trong pha phỏng vấn.',
    };
  }

  // 5. Emit is allowed when ready to build or docs emitted
  if (sub === 'emit') {
    return { decision: 'allow' };
  }

  // 6. Amend is allowed for plan amendments
  if (sub === 'amend') {
    return { decision: 'allow' };
  }

  // 7. Deepen is allowed when interview is complete
  if (sub === 'deepen') {
    if (effectivePhase !== 'interview') {
      return { decision: 'allow' };
    }
    return {
      decision: 'deny',
      reason_code: 'DEEPEN_NOT_ALLOWED',
      message: 'Lệnh "deepen" chỉ được thực hiện khi đã hoàn tất phỏng vấn lõi.',
    };
  }

  // 8. Remaining real dispatcher subcommands (read/inspect/state-advance) are safe
  // regardless of phase — cliOperations.ts itself re-validates state on each of these.
  if (sub === 'next' || sub === 'start' || sub === 'verify' || sub === 'review') {
    return { decision: 'allow' };
  }

  // Unrecognized subcommand: fail closed instead of assuming it is read-only-safe.
  // The real CLI dispatcher (cliOperations.ts) denies unknown subcommands too, but
  // this pre-check must not tell the model an unknown command was fine to run.
  return {
    decision: 'deny',
    reason_code: 'UNRECOGNIZED_CLI_SUBCOMMAND',
    message: `Subcommand CLI không được nhận diện: "${subcommand}".`,
  };
}
